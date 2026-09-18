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

const REQ_ORIGINS = new Set<PlanOrigen>([
  "REQUERIMIENTO",
  "GERENCIA",
  "USUARIO",
]);

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
