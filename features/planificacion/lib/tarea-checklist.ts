export type TareaCheckItem = {
  id: string;
  texto: string;
  done: boolean;
  completed_at: string | null;
};

export function parse_tarea_checklist(raw: unknown): TareaCheckItem[] {
  if (!Array.isArray(raw)) return [];
  const items: TareaCheckItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const texto = String(record.texto ?? "").trim();
    if (!texto) continue;
    const id = String(record.id ?? "").trim() || `c${items.length + 1}`;
    const completed_raw = record.completed_at;
    const completed_at =
      typeof completed_raw === "string" && completed_raw.trim()
        ? completed_raw
        : null;
    items.push({
      id: id.slice(0, 40),
      texto: texto.slice(0, 240),
      done: Boolean(record.done),
      completed_at: record.done ? completed_at : null,
    });
    if (items.length >= 40) break;
  }
  return items;
}

export function avance_from_checklist(items: TareaCheckItem[]): number | null {
  if (items.length === 0) return null;
  const done = items.filter((item) => item.done).length;
  return Math.round((100 * done) / items.length);
}

function match_previous_check(
  previous: TareaCheckItem[],
  item: TareaCheckItem,
  index: number,
): TareaCheckItem | undefined {
  return (
    previous.find((row) => row.id === item.id && row.texto === item.texto) ??
    previous.find((row) => row.texto === item.texto) ??
    previous[index]
  );
}

export function stamp_check_times(
  previous: TareaCheckItem[],
  next: TareaCheckItem[],
  now: string,
): TareaCheckItem[] {
  return next.map((item, index) => {
    const old = match_previous_check(previous, item, index);
    if (!item.done) return { ...item, completed_at: null };
    if (old?.done && old.completed_at) {
      return { ...item, completed_at: old.completed_at };
    }
    return { ...item, completed_at: now };
  });
}

export function format_check_completed_at(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `Completado el ${day}/${month}/${year} a las ${hours}:${minutes}`;
}

export function new_check_id(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
