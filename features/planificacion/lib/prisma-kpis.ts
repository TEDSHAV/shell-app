import type { PlanOrigen, PlanTarea } from "./types";
import {
  average_avance,
  is_tarea_done,
  is_tarea_no_solicitada,
} from "./task-progress";

export type RatioKpi = {
  done: number;
  total: number;
};

export type PrismaKpis = {
  tareas: RatioKpi;
  plan: RatioKpi;
  requerimientos: RatioKpi;
  adicional: RatioKpi;
  avance: number;
};

/** Parte de Prisma ya incorporada al plan. El resto aún no está cargado. */
export const PRISMA_ALCANCE_LEVANTADO_PCT = 70;
export const PRISMA_ALCANCE_POR_LEVANTAR_PCT = 30;

export const PRISMA_ALCANCE_NOTA =
  "Hoy el plan cubre el 70% del alcance; el 30% restante está aún por inventariarse sobre los departamentos Administración y Servicios Técnicos.";

export const PRISMA_APP_ALCANCE_NOTA =
  "Este % se lee sobre el 70% de alcance previsto hasta hoy.";

export function fold_plan_label(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function is_plan_app_alcance_parcial(nombre: string): boolean {
  const folded = fold_plan_label(nombre);
  return (
    folded.includes("administracion") ||
    folded.includes("servicios tecnicos")
  );
}

export function prisma_plan_rango(
  anio: number,
  at: string | Date | null | undefined,
): string {
  const date = at ? new Date(at) : new Date();
  const month = date.toLocaleDateString("es-VE", { month: "long" });
  const labeled = month.charAt(0).toUpperCase() + month.slice(1);
  return `Enero – ${labeled} ${anio}`;
}

const REQ_ORIGINS = new Set<PlanOrigen>(["REQUERIMIENTO", "USUARIO"]);

function ratio(tareas: PlanTarea[]): RatioKpi {
  const countable = tareas.filter((tarea) => !is_tarea_no_solicitada(tarea));
  return {
    done: countable.filter((tarea) => is_tarea_done(tarea)).length,
    total: countable.length,
  };
}

export function prisma_kpis_from_tareas(tareas: PlanTarea[]): PrismaKpis {
  return {
    tareas: ratio(tareas),
    plan: ratio(tareas.filter((tarea) => tarea.origen === "PLAN")),
    requerimientos: ratio(
      tareas.filter((tarea) => REQ_ORIGINS.has(tarea.origen)),
    ),
    adicional: ratio(tareas.filter((tarea) => tarea.origen === "ADICIONAL")),
    avance: average_avance(tareas),
  };
}
