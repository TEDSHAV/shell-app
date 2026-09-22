import { to_day } from "@/lib/date-range";

function current_ve_iso_date(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  }).format(new Date());
}

export type PeriodKind = "dia" | "semana" | "mes";
export type TimeSeleccion = "todos" | "periodo";

export type TimeFilterValue = {
  seleccion: TimeSeleccion;
  periodo: PeriodKind;
  offset: number;
};

export const DEFAULT_TIME_FILTER: TimeFilterValue = {
  seleccion: "todos",
  periodo: "mes",
  offset: 0,
};

export const PERIOD_OPTIONS: Array<{ value: PeriodKind; label: string }> = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
];

function parse_day(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

function to_iso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function start_of_week(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(12, 0, 0, 0);
  return monday;
}

export function resolve_period_bounds(
  value: TimeFilterValue,
): { start: string; end: string } | null {
  if (value.seleccion !== "periodo") return null;
  const today = parse_day(current_ve_iso_date());
  if (value.periodo === "dia") {
    const day = new Date(today);
    day.setDate(today.getDate() + value.offset);
    const iso = to_iso(day);
    return { start: iso, end: iso };
  }
  if (value.periodo === "semana") {
    const anchor = new Date(today);
    anchor.setDate(today.getDate() + value.offset * 7);
    const monday = start_of_week(anchor);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: to_iso(monday), end: to_iso(sunday) };
  }
  const anchor = new Date(
    today.getFullYear(),
    today.getMonth() + value.offset,
    1,
    12,
  );
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  return { start: to_iso(anchor), end: to_iso(last) };
}

export function period_label(periodo: PeriodKind): string {
  return PERIOD_OPTIONS.find((item) => item.value === periodo)?.label ?? "Mes";
}

export function format_period_range(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const from = parse_day(start);
  const to = parse_day(end);
  if (start === end) return fmt.format(from);
  return `${fmt.format(from)} — ${fmt.format(to)}`;
}

export function time_filter_summary(value: TimeFilterValue): string {
  if (value.seleccion === "todos") return "Todo";
  const bounds = resolve_period_bounds(value);
  if (!bounds) return "Tiempo";
  return `${period_label(value.periodo)} · ${format_period_range(bounds.start, bounds.end)}`;
}

export function stamp_in_time_filter(
  stamp: string | null | undefined,
  value: TimeFilterValue,
): boolean {
  const bounds = resolve_period_bounds(value);
  if (!bounds) return true;
  const day = to_day(stamp);
  if (!day) return false;
  return day >= bounds.start && day <= bounds.end;
}

export type DateField = "updated" | "created" | "plan";
export type SortDir = "desc" | "asc";

export const DATE_FIELD_OPTIONS: Array<{ value: DateField; label: string }> = [
  { value: "updated", label: "Actualización" },
  { value: "created", label: "Creación" },
  { value: "plan", label: "Planificación" },
];

export function date_field_label(field: DateField): string {
  return DATE_FIELD_OPTIONS.find((item) => item.value === field)?.label ?? field;
}

export function stamp_for_date_field(
  field: DateField,
  row: {
    created_at?: string | null;
    updated_at?: string | null;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
  },
): string | null {
  if (field === "created") return row.created_at ?? null;
  if (field === "updated") return row.updated_at ?? row.created_at ?? null;
  return to_day(row.fecha_inicio) ?? to_day(row.fecha_fin);
}
