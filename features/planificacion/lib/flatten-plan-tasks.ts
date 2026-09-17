import type { PlanApp, PlanOrigen, PlanTarea, PlanTrimestre } from "./types";

export type FlatPlanTask = {
  tarea: PlanTarea;
  app_nombre: string;
  modulo_nombre: string;
};

export function flatten_plan_tasks(apps: PlanApp[]): FlatPlanTask[] {
  const by_id = new Map<number, FlatPlanTask>();
  for (const app of apps) {
    for (const modulo of app.modulos) {
      for (const tarea of modulo.tareas) {
        const existing = by_id.get(tarea.id);
        if (!existing) {
          by_id.set(tarea.id, {
            tarea,
            app_nombre: app.nombre,
            modulo_nombre: modulo.nombre,
          });
          continue;
        }
        const names = existing.app_nombre.split(" · ");
        if (!names.includes(app.nombre)) {
          existing.app_nombre = `${existing.app_nombre} · ${app.nombre}`;
        }
      }
    }
  }
  return [...by_id.values()];
}

export function filter_flat_plan_tasks(
  items: FlatPlanTask[],
  query: {
    search: string;
    origen: PlanOrigen | "Todos";
    trimestre: PlanTrimestre | "Todos";
  },
): FlatPlanTask[] {
  const q = query.search.trim().toLowerCase();
  return items.filter(({ tarea, app_nombre, modulo_nombre }) => {
    if (query.origen !== "Todos" && tarea.origen !== query.origen) {
      return false;
    }
    if (query.trimestre !== "Todos" && tarea.trimestre !== query.trimestre) {
      return false;
    }
    if (!q) return true;
    return (
      tarea.titulo.toLowerCase().includes(q) ||
      app_nombre.toLowerCase().includes(q) ||
      modulo_nombre.toLowerCase().includes(q)
    );
  });
}
