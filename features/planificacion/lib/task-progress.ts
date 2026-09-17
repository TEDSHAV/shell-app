export type ProgressTarea = {
  avance?: number | null;
  completada: boolean;
  no_solicitada?: boolean | null;
};

export function clamp_avance(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function is_tarea_no_solicitada(tarea: ProgressTarea): boolean {
  return Boolean(tarea.no_solicitada);
}

export function tarea_avance(tarea: ProgressTarea): number {
  if (is_tarea_no_solicitada(tarea)) return 0;
  if (typeof tarea.avance === "number") return clamp_avance(tarea.avance);
  return tarea.completada ? 100 : 0;
}

export function is_tarea_done(tarea: ProgressTarea): boolean {
  return !is_tarea_no_solicitada(tarea) && tarea_avance(tarea) >= 100;
}

export function is_tarea_pending(tarea: ProgressTarea): boolean {
  return !is_tarea_no_solicitada(tarea) && !is_tarea_done(tarea);
}

export function countable_tareas<T extends ProgressTarea>(tareas: T[]): T[] {
  return tareas.filter((tarea) => !is_tarea_no_solicitada(tarea));
}

export function average_avance(tareas: ProgressTarea[]): number {
  const countable = countable_tareas(tareas);
  if (countable.length === 0) return 0;
  const total = countable.reduce((sum, tarea) => sum + tarea_avance(tarea), 0);
  return Math.round(total / countable.length);
}
