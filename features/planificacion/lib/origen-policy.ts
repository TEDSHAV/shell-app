import type { PlanOrigen } from "./types";
import { PLAN_ORIGENES_NUEVOS } from "../schemas";

const FROZEN_ORIGINS = new Set<PlanOrigen>(["PLAN", "GERENCIA"]);

export function is_frozen_origen(origen: PlanOrigen): boolean {
  return FROZEN_ORIGINS.has(origen);
}

export function origenes_for_editor(current: PlanOrigen | null): PlanOrigen[] {
  const next: PlanOrigen[] = [...PLAN_ORIGENES_NUEVOS];
  if (current && is_frozen_origen(current)) {
    return [current, ...next];
  }
  return next;
}

export function default_new_origen(): PlanOrigen {
  return "REQUERIMIENTO";
}
