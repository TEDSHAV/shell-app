export type TimeOrder = "newest" | "oldest";

export function to_day(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

export function day_in_range(
  value: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  const day = to_day(value);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function any_day_in_range(
  values: Array<string | null | undefined>,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  return values.some((value) => day_in_range(value, from, to));
}

export function compare_time(
  a: string | null | undefined,
  b: string | null | undefined,
  order: TimeOrder,
): number {
  const av = a ? Date.parse(a) : 0;
  const bv = b ? Date.parse(b) : 0;
  const a_ok = Number.isFinite(av) ? av : 0;
  const b_ok = Number.isFinite(bv) ? bv : 0;
  return order === "newest" ? b_ok - a_ok : a_ok - b_ok;
}

export function format_ve_datetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const stamp = new Date(iso);
  if (Number.isNaN(stamp.getTime())) {
    return to_day(iso) ?? "";
  }
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(stamp);
}
