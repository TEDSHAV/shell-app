"use client";

import { useRef } from "react";
import { PLAN_ORIGENES, PLAN_TRIMESTRES } from "../schemas";
import type { PlanOrigen, PlanSalud, PlanTrimestre } from "../lib/types";
import type { PlanQuery, PlanSortKey } from "../lib/plan-filters";
import { STATUS_COLORS } from "../lib/display";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

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
  const [more, set_more] = useState(false);
  const search_ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {SALUD.map((item) => {
          const active = query.salud === item;
          const sc = item !== "Todos" ? STATUS_COLORS[item] : null;
          return (
            <button
              key={item}
              type="button"
              onClick={() => on_change({ salud: item })}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? item === "Todos"
                    ? "bg-violet-600 text-white"
                    : "bg-white text-slate-800 ring-1 ring-slate-200 shadow-sm"
                  : "bg-white/80 text-slate-500 ring-1 ring-slate-200/80 hover:text-slate-700"
              }`}
            >
              {sc ? (
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
              ) : null}
              {item === "Todos" ? "Todos" : item}
              <span className="text-[11px] font-bold opacity-70">
                {counts[item] || 0}
              </span>
            </button>
          );
        })}
        <div className="relative ml-auto min-w-[200px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={search_ref}
            value={query.search}
            onChange={(event) => on_change({ search: event.target.value })}
            placeholder="Buscar proyectos"
            className="h-9 w-full rounded-full border-0 bg-white px-9 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-slate-300"
          />
        </div>
        <button
          type="button"
          onClick={() => set_more((value) => !value)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ${
            more
              ? "bg-slate-900 text-white ring-slate-900"
              : "bg-white text-slate-500 ring-slate-200"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Más
        </button>
      </div>
      {more ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
          <select
            value={query.anio}
            onChange={(event) => on_change({ anio: Number(event.target.value) })}
            className="h-8 rounded-lg border-0 bg-slate-50 px-2 text-sm text-slate-700"
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
            className="h-8 rounded-lg border-0 bg-slate-50 px-2 text-sm text-slate-700"
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
            className="h-8 rounded-lg border-0 bg-slate-50 px-2 text-sm text-slate-700"
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
            className="h-8 rounded-lg border-0 bg-slate-50 px-2 text-sm text-slate-700"
          >
            {SORTS.map((sort) => (
              <option key={sort.id} value={sort.id}>
                Orden: {sort.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
