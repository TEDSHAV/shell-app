"use client";

import { PLAN_ORIGENES, PLAN_TRIMESTRES } from "../schemas";
import type { PlanOrigen, PlanSalud, PlanTrimestre } from "../lib/types";
import type { PlanQuery, PlanSortKey } from "../lib/plan-filters";
import { STATUS_COLORS } from "../lib/display";

const SALUD: Array<PlanSalud | "Todos"> = [
  "Todos",
  "Completado",
  "En Marcha",
  "En Riesgo",
  "Planificado",
];

const SORTS: Array<{ id: PlanSortKey; label: string }> = [
  { id: "home", label: "Home" },
  { id: "nombre", label: "Nombre" },
  { id: "progreso", label: "% avance" },
  { id: "trimestre", label: "Trimestre" },
];

export function PlanToolbar({
  query,
  years,
  counts,
  on_change,
}: {
  query: PlanQuery;
  years: number[];
  counts: Record<string, number>;
  on_change: (next: Partial<PlanQuery>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query.search}
          onChange={(event) => on_change({ search: event.target.value })}
          placeholder="Buscar app, módulo o tarea"
          className="h-9 w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400"
        />
        <select
          value={query.anio}
          onChange={(event) => on_change({ anio: Number(event.target.value) })}
          className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={query.origen}
          onChange={(event) =>
            on_change({ origen: event.target.value as PlanOrigen | "Todos" })
          }
          className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700"
        >
          <option value="Todos">Origen</option>
          {PLAN_ORIGENES.map((origen) => (
            <option key={origen} value={origen}>
              {origen}
            </option>
          ))}
        </select>
        <select
          value={query.trimestre}
          onChange={(event) =>
            on_change({
              trimestre: event.target.value as PlanTrimestre | "Todos",
            })
          }
          className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700"
        >
          <option value="Todos">Trimestre</option>
          {PLAN_TRIMESTRES.map((trimestre) => (
            <option key={trimestre} value={trimestre}>
              {trimestre}
            </option>
          ))}
        </select>
        <select
          value={query.sort}
          onChange={(event) =>
            on_change({ sort: event.target.value as PlanSortKey })
          }
          className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700"
        >
          {SORTS.map((sort) => (
            <option key={sort.id} value={sort.id}>
              Orden: {sort.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {SALUD.map((item) => {
          const active = query.salud === item;
          const sc = item !== "Todos" ? STATUS_COLORS[item] : null;
          return (
            <button
              key={item}
              type="button"
              onClick={() => on_change({ salud: item })}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                active
                  ? sc
                    ? `${sc.bg} ${sc.text} border-transparent`
                    : "border-transparent bg-gray-800 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              {sc ? <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} /> : null}
              {item}
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-white/30" : "bg-gray-100 text-gray-500"
                }`}
              >
                {counts[item] || 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
