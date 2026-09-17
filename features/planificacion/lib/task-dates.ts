import type { PlanModulo, PlanTarea, PlanTrimestre } from "./types";
import { PLAN_TRIMESTRES } from "../schemas";

export function iso_date(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const stamp = new Date(`${text}T12:00:00`);
  if (Number.isNaN(stamp.getTime())) return null;
  return text;
}

export function current_ve_iso_date(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  }).format(new Date());
}

function last_day(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function months_of_quarter(trimestre: PlanTrimestre): number[] {
  const start = (PLAN_TRIMESTRES.indexOf(trimestre) % 4) * 3 + 1;
  return [start, start + 1, start + 2];
}

export function trimestre_from_iso(value: string): PlanTrimestre {
  const month = Number(value.slice(5, 7));
  const index = Math.min(3, Math.max(0, Math.floor((month - 1) / 3)));
  return PLAN_TRIMESTRES[index];
}

export function fallback_module_range(modulo: PlanModulo): {
  start: string;
  end: string;
} {
  const months = months_of_quarter(modulo.trimestre_entrega);
  const year = modulo.anio;
  const start_month = months[0];
  const end_month = months[2];
  return {
    start: `${year}-${pad(start_month)}-01`,
    end: `${year}-${pad(end_month)}-${pad(last_day(year, end_month))}`,
  };
}

export function tarea_range(
  tarea: PlanTarea,
  _modulo?: PlanModulo,
): { start: string; end: string } | null {
  const start = iso_date(tarea.fecha_inicio);
  const end = iso_date(tarea.fecha_fin) ?? start;
  if (!start && !end) return null;
  const from = start ?? end!;
  const to = end ?? start!;
  return from <= to ? { start: from, end: to } : { start: to, end: from };
}

export function tarea_years(tarea: PlanTarea, modulo: PlanModulo): number[] {
  const range = tarea_range(tarea, modulo);
  if (!range) return [];
  const from = Number(range.start.slice(0, 4));
  const to = Number(range.end.slice(0, 4));
  const years: number[] = [];
  for (let year = from; year <= to; year += 1) years.push(year);
  return years;
}

export function tarea_months_in_year(
  tarea: PlanTarea,
  modulo: PlanModulo,
  year: number,
): number[] {
  const range = tarea_range(tarea, modulo);
  if (!range) return [];
  const months: number[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const month_start = `${year}-${pad(month)}-01`;
    const month_end = `${year}-${pad(month)}-${pad(last_day(year, month))}`;
    if (range.start <= month_end && range.end >= month_start) months.push(month);
  }
  return months;
}

export function optional_excel_dates(
  start: string | null,
  end: string | null,
): { fecha_inicio: string | null; fecha_fin: string | null } {
  const from = iso_date(start);
  const to = iso_date(end) ?? from;
  if (!from && !to) return { fecha_inicio: null, fecha_fin: null };
  const a = from ?? to!;
  const b = to ?? from!;
  return a <= b
    ? { fecha_inicio: a, fecha_fin: b }
    : { fecha_inicio: b, fecha_fin: a };
}
