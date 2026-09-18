import { PLAN_TRIMESTRES } from "../schemas";
import { derive_app_salud, sum_app_progress } from "./app-salud";
import { tarea_months_in_year, tarea_years, is_tarea_unplaced } from "./task-dates";
import { average_avance, is_tarea_done, is_tarea_pending } from "./task-progress";
import { people_on_modulos } from "./people";
import type {
  PlanApp,
  PlanHito,
  PlanModulo,
  PlanParticipante,
  PlanTarea,
  PlanTrimestre,
} from "./types";

export const QUARTER_LABELS: Record<PlanTrimestre, string> = {
  T1: "T1 (Ene–Mar)",
  T2: "T2 (Abr–Jun)",
  T3: "T3 (Jul–Sep)",
  T4: "T4 (Oct–Dic)",
};

export const QUARTER_MONTHS: Record<PlanTrimestre, string> = {
  T1: "Ene–Mar",
  T2: "Abr–Jun",
  T3: "Jul–Sep",
  T4: "Oct–Dic",
};

export const MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export const TRIMESTRE_NUM: Record<PlanTrimestre, number> = {
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
};

export type GanttQuarterCell = {
  trimestre: PlanTrimestre;
  modulos: PlanModulo[];
  done_count: number;
  left_count: number;
  progress: number;
  has_work: boolean;
  hitos: PlanHito[];
};

export type GanttSpan = {
  modulo: PlanModulo;
  start_month: number;
  end_month: number;
  done_count: number;
  left_count: number;
  progress: number;
  tareas: PlanTarea[];
};

export function current_ve_year(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === "year")?.value ?? new Date().getFullYear());
}

export function current_ve_month(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    month: "numeric",
  }).formatToParts(new Date());
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1);
  return Math.min(12, Math.max(1, month));
}

export function trimestre_from_mes(mes: number): PlanTrimestre {
  const index = Math.min(3, Math.max(0, Math.floor((mes - 1) / 3)));
  return PLAN_TRIMESTRES[index];
}

export function months_of_quarter(trimestre: PlanTrimestre): number[] {
  const start = (TRIMESTRE_NUM[trimestre] - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

export function span_label(start_month: number, end_month: number): string {
  if (start_month === end_month) return MONTH_LABELS[start_month - 1];
  return `${MONTH_LABELS[start_month - 1]}–${MONTH_LABELS[end_month - 1]}`;
}

export function tarea_anio(tarea: PlanTarea, modulo: PlanModulo): number {
  return tarea_years(tarea, modulo)[0] ?? modulo.anio;
}

export function tarea_mes(tarea: PlanTarea, modulo: PlanModulo): number {
  return tarea_months_in_year(tarea, modulo, tarea_anio(tarea, modulo))[0] ?? 1;
}

export function unique_participantes(
  modulos: PlanModulo[],
): PlanParticipante[] {
  return people_on_modulos(modulos);
}

export function earliest_trimestre(
  modulos: PlanModulo[],
  anio: number,
): number {
  const months: number[] = [];
  for (const modulo of modulos) {
    for (const tarea of modulo.tareas) {
      months.push(...tarea_months_in_year(tarea, modulo, anio));
    }
    if (modulo.tareas.length === 0 && modulo.anio === anio) {
      months.push(months_of_quarter(modulo.trimestre_entrega)[0]);
    }
  }
  if (months.length === 0) return 99;
  return Math.min(...months.map((mes) => TRIMESTRE_NUM[trimestre_from_mes(mes)]));
}

export function list_years(apps: PlanApp[]): number[] {
  const years = new Set<number>([current_ve_year()]);
  for (const app of apps) {
    for (const modulo of app.modulos) {
      years.add(modulo.anio);
      for (const tarea of modulo.tareas) {
        for (const year of tarea_years(tarea, modulo)) years.add(year);
      }
    }
    for (const hito of app.hitos) years.add(hito.anio);
  }
  return [...years].sort((a, b) => b - a);
}

export function build_module_spans(
  modulo: PlanModulo,
  anio: number,
): GanttSpan[] {
  const occupied = Array.from({ length: 13 }, () => false);
  const by_month: PlanTarea[][] = Array.from({ length: 13 }, () => []);
  for (const tarea of modulo.tareas) {
    const months = tarea_months_in_year(tarea, modulo, anio);
    for (const mes of months) {
      occupied[mes] = true;
      by_month[mes].push(tarea);
    }
  }
  const spans: GanttSpan[] = [];
  let month = 1;
  while (month <= 12) {
    if (!occupied[month]) {
      month += 1;
      continue;
    }
    let end = month;
    while (end <= 12 && occupied[end]) end += 1;
    const seen = new Set<number>();
    const tareas: PlanTarea[] = [];
    for (let item = month; item < end; item += 1) {
      for (const tarea of by_month[item]) {
        if (seen.has(tarea.id)) continue;
        seen.add(tarea.id);
        tareas.push(tarea);
      }
    }
    const done_count = tareas.filter((tarea) => is_tarea_done(tarea)).length;
    const left_count = tareas.filter((tarea) => is_tarea_pending(tarea)).length;
    const progress = average_avance(tareas);
    spans.push({
      modulo,
      start_month: month,
      end_month: end - 1,
      done_count,
      left_count,
      progress,
      tareas,
    });
    month = end;
  }
  return spans;
}

export function build_gantt_cells(
  app: PlanApp,
  anio: number,
): GanttQuarterCell[] {
  return PLAN_TRIMESTRES.map((trimestre) => {
    const months = months_of_quarter(trimestre);
    const modulos = app.modulos.filter((modulo) =>
      modulo.tareas.some((tarea) =>
        tarea_months_in_year(tarea, modulo, anio).some((mes) =>
          months.includes(mes),
        ),
      ),
    );
    const totals = sum_app_progress(modulos);
    return {
      trimestre,
      modulos,
      ...totals,
      has_work: modulos.length > 0,
      hitos: app.hitos.filter(
        (hito) => hito.anio === anio && hito.trimestre === trimestre,
      ),
    };
  });
}

export function merge_plan_apps(
  apps: PlanApp[],
  nombre: string,
  subtitulo: string,
): PlanApp {
  const modulos = apps.flatMap((app) => app.modulos);
  const totals = sum_app_progress(modulos);
  return {
    id: -1,
    slug: "utilidades",
    nombre,
    subtitulo,
    origen: "shell",
    section: "utilidades",
    modulo_count: modulos.length,
    modulos,
    hitos: apps.flatMap((app) => app.hitos),
    ...totals,
    salud: derive_app_salud(modulos),
  };
}

export function span_tasks(
  span: GanttSpan,
  segment: "done" | "pending",
): Array<{ modulo: PlanModulo; tarea: PlanTarea }> {
  return span.tareas
    .filter((tarea) =>
      segment === "done" ? is_tarea_done(tarea) : is_tarea_pending(tarea),
    )
    .map((tarea) => ({ modulo: span.modulo, tarea }));
}

function unique_tareas(tareas: PlanTarea[]): PlanTarea[] {
  const seen = new Set<number>();
  return tareas.filter((tarea) => {
    if (seen.has(tarea.id)) return false;
    seen.add(tarea.id);
    return true;
  });
}

export function app_unplaced_tareas(app: PlanApp): PlanTarea[] {
  return unique_tareas(
    app.modulos.flatMap((modulo) => modulo.tareas.filter(is_tarea_unplaced)),
  );
}

export function app_tareas_in_trimestre(
  app: PlanApp,
  trimestre: PlanTrimestre,
  anio: number,
): PlanTarea[] {
  return unique_tareas(
    app.modulos.flatMap((modulo) =>
      modulo.tareas.filter((tarea) => {
        if (tarea.trimestre) return tarea.trimestre === trimestre;
        const months = tarea_months_in_year(tarea, modulo, anio);
        return months.some((month) => trimestre_from_mes(month) === trimestre);
      }),
    ),
  );
}

export function quarter_tasks(
  cell: GanttQuarterCell,
  segment: "done" | "pending",
): Array<{ modulo: PlanModulo; tarea: PlanTarea }> {
  const rows: Array<{ modulo: PlanModulo; tarea: PlanTarea }> = [];
  const seen = new Set<number>();
  for (const modulo of cell.modulos) {
    for (const tarea of modulo.tareas) {
      if (seen.has(tarea.id)) continue;
      if (segment === "done" && is_tarea_done(tarea)) {
        seen.add(tarea.id);
        rows.push({ modulo, tarea });
      }
      if (segment === "pending" && is_tarea_pending(tarea)) {
        seen.add(tarea.id);
        rows.push({ modulo, tarea });
      }
    }
  }
  return rows;
}
