"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { PLAN_TAREA_DRAG_MIME } from "../lib/plan-kanban";
import type { FlatPlanTask } from "../lib/flatten-plan-tasks";
import { OrigenBadge } from "./origen-badge";
import { PlanAssigneeStack } from "./plan-assignee-chip";
import { people_on_tarea } from "../lib/people";

export function PlanKanbanCard({
  item,
  is_dragging,
  on_drag_start,
  on_drag_end,
  on_open,
}: {
  item: FlatPlanTask;
  is_dragging: boolean;
  on_drag_start: (tarea_id: number) => void;
  on_drag_end: () => void;
  on_open: (item: FlatPlanTask) => void;
}) {
  const { tarea, app_nombre, modulo_nombre } = item;
  const moved = useRef(false);

  return (
    <article
      draggable
      onDragStart={(event) => {
        moved.current = false;
        event.dataTransfer.setData(PLAN_TAREA_DRAG_MIME, String(tarea.id));
        event.dataTransfer.effectAllowed = "move";
        on_drag_start(tarea.id);
      }}
      onDrag={(event) => {
        if (event.clientX !== 0 || event.clientY !== 0) moved.current = true;
      }}
      onDragEnd={() => {
        on_drag_end();
        window.setTimeout(() => {
          moved.current = false;
        }, 0);
      }}
      onClick={() => {
        if (moved.current) return;
        on_open(item);
      }}
      className={cn(
        "cursor-grab rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md active:cursor-grabbing",
        is_dragging && "opacity-40 ring-2 ring-violet-300",
        tarea.avance >= 100 && "opacity-70",
      )}
    >
      <p className="text-[13px] font-bold leading-snug text-slate-900">
        {app_nombre}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-violet-700">
        {modulo_nombre}
      </p>
      <h3
        className={cn(
          "mt-2 text-sm font-medium leading-snug text-slate-700",
          tarea.avance >= 100 && "line-through decoration-slate-300",
        )}
      >
        {tarea.titulo}
      </h3>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {tarea.trimestre ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {tarea.trimestre}
            </span>
          ) : null}
          <OrigenBadge origen={tarea.origen} />
        </div>
        <PlanAssigneeStack people={people_on_tarea(tarea)} />
      </div>
    </article>
  );
}
