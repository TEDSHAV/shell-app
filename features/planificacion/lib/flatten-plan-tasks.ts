import type { PlanApp, PlanOrigen, PlanTarea, PlanTrimestre } from "./types";
import { sort_flat_adicional_last } from "./sort-tareas";
import { people_on_tarea } from "./people";

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
  return sort_flat_adicional_last([...by_id.values()]);
}

export function filter_flat_plan_tasks(
  items: FlatPlanTask[],
  query: {
    search: string;
    origen: PlanOrigen | "Todos";
    trimestre: PlanTrimestre | "Todos";
    asignado?: "Todos" | "none" | number;
  },
): FlatPlanTask[] {
  const q = query.search.trim().toLowerCase();
  const filtered = items.filter(({ tarea, app_nombre, modulo_nombre }) => {
    if (query.origen !== "Todos" && tarea.origen !== query.origen) {
      return false;
    }
    if (query.trimestre !== "Todos" && tarea.trimestre !== query.trimestre) {
      return false;
    }
    const people = people_on_tarea(tarea);
    if (
      query.asignado &&
      query.asignado !== "Todos" &&
      (query.asignado === "none"
        ? people.length > 0
        : !people.some((person) => person.usuario_id === query.asignado))
    ) {
      return false;
    }
    if (!q) return true;
    return (
      tarea.titulo.toLowerCase().includes(q) ||
      (tarea.objetivo_titulo ?? "").toLowerCase().includes(q) ||
      app_nombre.toLowerCase().includes(q) ||
      modulo_nombre.toLowerCase().includes(q)
    );
  });
  return sort_flat_adicional_last(filtered);
}
