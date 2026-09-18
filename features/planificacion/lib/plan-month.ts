const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function current_ve_month(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  })
    .format(new Date())
    .slice(0, 7);
}

export function parse_plan_month(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && MONTH_RE.test(value)) return value;
  return current_ve_month();
}

export function month_bounds(mes: string): { start: string; end: string } {
  const safe = parse_plan_month(mes);
  const [year, month] = safe.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${safe}-01`,
    end: `${safe}-${String(last).padStart(2, "0")}`,
  };
}

export function shift_month(mes: string, delta: number): string {
  const safe = parse_plan_month(mes);
  const [year, month] = safe.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function format_month_label(mes: string): string {
  const safe = parse_plan_month(mes);
  const [year, month] = safe.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const labeled = date.toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return labeled.charAt(0).toUpperCase() + labeled.slice(1);
}

export function ranges_overlap(
  start: string | null | undefined,
  end: string | null | undefined,
  month_start: string,
  month_end: string,
): boolean {
  if (!start && !end) return false;
  const from = (start ?? end) as string;
  const to = (end ?? start) as string;
  return from.slice(0, 10) <= month_end && to.slice(0, 10) >= month_start;
}
