import type { PlanApp, PlanOrigen, PlanTarea, PlanTrimestre } from "./types";
import { sort_flat_adicional_last } from "./sort-tareas";
import { people_on_tarea } from "./people";
import { is_tarea_done } from "./task-progress";
import {
  compare_time,
  type TimeOrder,
} from "@/lib/date-range";
import {
  stamp_for_date_field,
  stamp_in_time_filter,
  type DateField,
  type SortDir,
  type TimeFilterValue,
} from "@/lib/list-time-period";

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

function sort_flat_tasks(
  items: FlatPlanTask[],
  field: DateField | undefined,
  dir: SortDir | undefined,
): FlatPlanTask[] {
  const extra_sorted = sort_flat_adicional_last(items);
  if (!field) return extra_sorted;
  const order: TimeOrder = dir === "asc" ? "oldest" : "newest";
  return [...extra_sorted].sort((a, b) => {
    const extra_a = a.tarea.origen === "ADICIONAL" ? 1 : 0;
    const extra_b = b.tarea.origen === "ADICIONAL" ? 1 : 0;
    if (extra_a !== extra_b) return extra_a - extra_b;
    return compare_time(
      stamp_for_date_field(field, a.tarea),
      stamp_for_date_field(field, b.tarea),
      order,
    );
  });
}

export function group_done_last(items: FlatPlanTask[]): {
  open: FlatPlanTask[];
  done: FlatPlanTask[];
} {
  const open: FlatPlanTask[] = [];
  const done: FlatPlanTask[] = [];
  for (const item of items) {
    if (is_tarea_done(item.tarea)) done.push(item);
    else open.push(item);
  }
  return { open, done };
}

export function filter_flat_plan_tasks(
  items: FlatPlanTask[],
  query: {
    search: string;
    origen: PlanOrigen | "Todos";
    trimestre: PlanTrimestre | "Todos";
    asignado?: "Todos" | "none" | number;
    time?: TimeFilterValue;
    date_field?: DateField;
    sort_dir?: SortDir;
  },
): FlatPlanTask[] {
  const q = query.search.trim().toLowerCase();
  const field = query.date_field ?? "updated";
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
    if (query.time && !stamp_in_time_filter(stamp_for_date_field(field, tarea), query.time)) {
      return false;
    }
    if (!q) return true;
    return (
      tarea.titulo.toLowerCase().includes(q) ||
      (tarea.descripcion ?? "").toLowerCase().includes(q) ||
      (tarea.objetivo_titulo ?? "").toLowerCase().includes(q) ||
      app_nombre.toLowerCase().includes(q) ||
      modulo_nombre.toLowerCase().includes(q)
    );
  });
  return sort_flat_tasks(filtered, field, query.sort_dir);
}
