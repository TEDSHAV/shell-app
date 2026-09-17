"use client";

import { useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { STATUS_COLORS } from "../lib/display";
import { PLAN_TRIMESTRES } from "../schemas";
import {
  QUARTER_LABELS,
  app_tareas_in_trimestre,
  app_unplaced_tareas,
} from "../lib/gantt";
import type { PlanApp, PlanHito, PlanTarea, PlanTrimestre } from "../lib/types";

function TaskCard({
  tarea,
  placed,
  on_drag_id,
}: {
  tarea: PlanTarea;
  placed?: boolean;
  on_drag_id: (id: number | null) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(tarea.id));
        event.dataTransfer.effectAllowed = "move";
        on_drag_id(tarea.id);
      }}
      className={`select-none cursor-grab rounded-lg border px-2.5 py-2 text-left shadow-sm active:cursor-grabbing ${
        placed
          ? "border-slate-200 bg-white"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className="text-sm font-medium leading-snug text-slate-800">
        {tarea.titulo}
      </p>
    </div>
  );
}

export function GanttEditRow({
  app,
  anio,
  nested,
  expandable,
  expanded,
  on_toggle,
  on_add_hito,
  on_edit_hito,
  on_place_tarea,
}: {
  app: PlanApp;
  anio: number;
  nested?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  on_toggle?: () => void;
  on_add_hito: (app: PlanApp, trimestre: PlanTrimestre) => void;
  on_edit_hito: (hito: PlanHito) => void;
  on_place_tarea: (tarea: PlanTarea, trimestre: PlanTrimestre) => void;
}) {
  const sc = STATUS_COLORS[app.salud];
  const unplaced = app_unplaced_tareas(app);
  const drag_id = useRef<number | null>(null);
  const [over, set_over] = useState<PlanTrimestre | null>(null);
  const all_tareas = app.modulos.flatMap((modulo) => modulo.tareas);

  function drop_on(event: React.DragEvent, trimestre: PlanTrimestre) {
    event.preventDefault();
    event.stopPropagation();
    const raw =
      drag_id.current ??
      Number(event.dataTransfer.getData("text/plain") || "0");
    const tarea = all_tareas.find((item) => item.id === raw);
    drag_id.current = null;
    set_over(null);
    if (tarea) on_place_tarea(tarea, trimestre);
  }

  return (
    <div
      className={`flex items-stretch border-b border-slate-100 last:border-b-0 ${
        nested ? "bg-slate-50/70" : "bg-white"
      }`}
    >
      <div
        className={`w-80 shrink-0 space-y-2 border-r border-slate-100 px-4 py-3 ${
          nested ? "pl-8" : ""
        }`}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={expandable ? on_toggle : undefined}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${sc.dot}`} />
          <span className="truncate text-sm font-semibold text-slate-900">
            {app.nombre}
          </span>
          {expandable ? (
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-slate-400 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          ) : null}
        </button>
        <p className="text-xs font-medium text-amber-800">
          Sin trimestre ({unplaced.length})
        </p>
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
          {unplaced.length === 0 ? (
            <p className="text-xs text-slate-400">Nada pendiente de colocar.</p>
          ) : (
            unplaced.map((tarea) => (
              <TaskCard
                key={`${app.id}-${tarea.id}`}
                tarea={tarea}
                on_drag_id={(id) => {
                  drag_id.current = id;
                }}
              />
            ))
          )}
        </div>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-4">
        {PLAN_TRIMESTRES.map((trimestre) => {
          const placed = app_tareas_in_trimestre(app, trimestre, anio);
          const hitos = app.hitos.filter(
            (hito) => hito.trimestre === trimestre && hito.anio === anio,
          );
          return (
            <div
              key={trimestre}
              className={`min-h-[10rem] space-y-2 border-l border-slate-100 p-2 transition-colors ${
                over === trimestre ? "bg-violet-50" : "bg-white/40"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                set_over(trimestre);
              }}
              onDragLeave={() =>
                set_over((prev) => (prev === trimestre ? null : prev))
              }
              onDrop={(event) => drop_on(event, trimestre)}
            >
              {placed.map((tarea) => (
                <TaskCard
                  key={`${app.id}-${tarea.id}`}
                  tarea={tarea}
                  placed
                  on_drag_id={(id) => {
                    drag_id.current = id;
                  }}
                />
              ))}
              {hitos.map((hito) => (
                <button
                  key={hito.id}
                  type="button"
                  title={hito.descripcion || hito.titulo}
                  onClick={() => on_edit_hito(hito)}
                  className="w-full truncate rounded-full border border-slate-200 bg-white px-2 py-1 text-left text-xs text-slate-600"
                >
                  {hito.titulo}
                </button>
              ))}
              {app.id > 0 ? (
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
                  onClick={() => on_add_hito(app, trimestre)}
                >
                  <Plus className="h-3 w-3" />
                  Hito {QUARTER_LABELS[trimestre]}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
