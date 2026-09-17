import type { PlanApp, PlanModulo } from "./types";

export function tarea_ids_in_modulo(modulo: PlanModulo): number[] {
  return modulo.tareas.map((tarea) => tarea.id);
}

export function tarea_ids_in_app(app: PlanApp): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const modulo of app.modulos) {
    for (const id of tarea_ids_in_modulo(modulo)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function selection_state(
  ids: number[],
  selected: Set<number>,
): "none" | "some" | "all" {
  if (ids.length === 0) return "none";
  const hits = ids.filter((id) => selected.has(id)).length;
  if (hits === 0) return "none";
  if (hits === ids.length) return "all";
  return "some";
}
