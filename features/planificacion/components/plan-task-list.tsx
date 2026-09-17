"use client";

import { cn } from "@/lib/utils";
import { AVATAR_COLORS, ORIGIN_COLORS } from "../lib/display";
import { kanban_column_of_tarea } from "../lib/plan-kanban";
import type { FlatPlanTask } from "../lib/flatten-plan-tasks";

const STATUS_LABEL = {
  todo: "Por hacer",
  progress: "En progreso",
  done: "Completado",
} as const;

export function PlanTaskList({
  items,
  on_open,
}: {
  items: FlatPlanTask[];
  on_open: (item: FlatPlanTask) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
        No hay tareas con estos filtros.
      </p>
    );
  }

  return (
    <div className="h-[calc(100dvh-14.5rem)] min-h-[28rem] space-y-2 overflow-y-auto pr-1">
      {items.map((item) => {
        const { tarea, app_nombre, modulo_nombre } = item;
        const column = kanban_column_of_tarea(tarea);
        return (
          <button
            key={item.tarea.id}
            type="button"
            onClick={() => on_open(item)}
            className="flex w-full items-start gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-slate-900">
                {app_nombre}
              </p>
              <p className="text-xs font-semibold text-violet-700">
                {modulo_nombre}
              </p>
              <p
                className={cn(
                  "mt-1.5 text-sm font-medium text-slate-700",
                  column === "done" && "line-through decoration-slate-300",
                )}
              >
                {tarea.titulo}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ORIGIN_COLORS[tarea.origen]}`}
                >
                  {tarea.origen}
                </span>
                {tarea.trimestre ? (
                  <span className="text-[11px] font-medium text-slate-400">
                    {tarea.trimestre}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {STATUS_LABEL[column]}
              </span>
              {tarea.asignado ? (
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                    AVATAR_COLORS[
                      (tarea.asignado_id ?? 0) % AVATAR_COLORS.length
                    ],
                  )}
                >
                  {tarea.asignado.initials}
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
