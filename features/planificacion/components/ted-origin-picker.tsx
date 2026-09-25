"use client";

import { cn } from "@/lib/utils";
import {
  ORIGIN_BLURBS,
  ORIGIN_COLORS,
  ORIGIN_LABELS,
} from "../lib/display";
import type { PlanOrigen } from "../lib/types";

export function TedOriginPicker({
  origins,
  counts,
  value,
  on_change,
}: {
  origins: PlanOrigen[];
  counts?: Map<PlanOrigen | "Todos", number>;
  value: PlanOrigen | "Todos";
  on_change: (next: PlanOrigen | "Todos") => void;
}) {
  const all_count = counts?.get("Todos");
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="button"
        onClick={() => on_change("Todos")}
        className={cn(
          "rounded-xl border px-3 py-2.5 text-left transition-all duration-300 ease-out",
          value === "Todos"
            ? "border-violet-500 bg-violet-50 ring-2 ring-violet-300"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-800">Todas</span>
          {all_count != null ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600">
              {all_count}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Sin filtrar por origen. Muestra el tablero completo.
        </p>
      </button>
      {origins.map((origin) => {
        const active = value === origin;
        const count = counts?.get(origin);
        return (
          <button
            key={origin}
            type="button"
            onClick={() => on_change(active ? "Todos" : origin)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-all duration-300 ease-out",
              active
                ? "border-violet-500 bg-violet-50 ring-2 ring-violet-300"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  ORIGIN_COLORS[origin],
                )}
              >
                {ORIGIN_LABELS[origin]}
              </span>
              {count != null ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600">
                  {count}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
              {ORIGIN_BLURBS[origin]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
