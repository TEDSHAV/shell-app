import type {
  PlanApp,
  PlanOrigen,
  PlanSalud,
  PlanTrimestre,
} from "./types";
import { people_on_tarea } from "./people";
import { earliest_trimestre, months_of_quarter } from "./gantt";
import { tarea_months_in_year, tarea_years } from "./task-dates";

export type PlanSortKey = "home" | "nombre" | "progreso" | "trimestre";

export type PlanAsignadoFilter = "Todos" | "none" | number;

export type PlanQuery = {
  salud: PlanSalud | "Todos";
  anio: number;
  search: string;
  origen: PlanOrigen | "Todos";
  trimestre: PlanTrimestre | "Todos";
  sort: PlanSortKey;
  asignado: PlanAsignadoFilter;
};

function matches_search(app: PlanApp, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  if (
    app.nombre.toLowerCase().includes(q) ||
    (app.subtitulo ?? "").toLowerCase().includes(q) ||
    app.slug.toLowerCase().includes(q)
  ) {
    return true;
  }
  return app.modulos.some(
    (modulo) =>
      modulo.nombre.toLowerCase().includes(q) ||
      (modulo.subtitulo ?? "").toLowerCase().includes(q) ||
      modulo.tareas.some((tarea) =>
        tarea.titulo.toLowerCase().includes(q) ||
        (tarea.descripcion ?? "").toLowerCase().includes(q),
      ),
  );
}

function matches_filters(app: PlanApp, query: PlanQuery): boolean {
  if (query.salud !== "Todos" && app.salud !== query.salud) return false;
  if (!matches_search(app, query.search)) return false;
  const in_year = app.modulos.filter((modulo) =>
    modulo.tareas.length === 0
      ? modulo.anio === query.anio
      : modulo.tareas.some((tarea) =>
          tarea_years(tarea, modulo).includes(query.anio),
        ),
  );
  if (query.trimestre !== "Todos") {
    const months = months_of_quarter(query.trimestre);
    if (
      !in_year.some((modulo) =>
        modulo.tareas.some((tarea) =>
          tarea_months_in_year(tarea, modulo, query.anio).some((mes) =>
            months.includes(mes),
          ),
        ),
      )
    ) {
      return false;
    }
  }
  if (query.origen !== "Todos") {
    const months =
      query.trimestre === "Todos" ? null : months_of_quarter(query.trimestre);
    const pool = in_year.filter((modulo) => {
      if (!months) return true;
      return modulo.tareas.some((tarea) =>
        tarea_months_in_year(tarea, modulo, query.anio).some((mes) =>
          months.includes(mes),
        ),
      );
    });
    const has_origin = pool.some((modulo) =>
      modulo.tareas.some((tarea) => tarea.origen === query.origen),
    );
    if (!has_origin) return false;
  }
  if ((query.asignado ?? "Todos") !== "Todos") {
    const wanted = query.asignado;
    const has_person = in_year.some((modulo) =>
      modulo.tareas.some((tarea) => {
        const people = people_on_tarea(tarea);
        return wanted === "none"
          ? people.length === 0
          : people.some((person) => person.usuario_id === wanted);
      }),
    );
    if (!has_person) return false;
  }
  return true;
}

function sort_apps(apps: PlanApp[], query: PlanQuery): PlanApp[] {
  if (query.sort === "home") return apps;
  return [...apps].sort((a, b) => {
    if (query.sort === "progreso") {
      if (b.progress !== a.progress) return b.progress - a.progress;
    }
    if (query.sort === "trimestre") {
      const ta = earliest_trimestre(a.modulos, query.anio);
      const tb = earliest_trimestre(b.modulos, query.anio);
      if (ta !== tb) return ta - tb;
    }
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

export function filter_plan_apps(
  apps: PlanApp[],
  query: PlanQuery,
): PlanApp[] {
  return sort_apps(apps.filter((app) => matches_filters(app, query)), query);
}
