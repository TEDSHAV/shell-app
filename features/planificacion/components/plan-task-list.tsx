"use client";

import { cn } from "@/lib/utils";
import { OrigenBadge } from "./origen-badge";
import { ObjetivoChip } from "./objetivo-chip";
import { PlanAssigneeStack } from "./plan-assignee-chip";
import { people_on_tarea } from "../lib/people";
import { kanban_column_of_tarea } from "../lib/plan-kanban";
import { TareaDateLine } from "./tarea-date-line";
import { group_done_last } from "../lib/flatten-plan-tasks";
import type { FlatPlanTask } from "../lib/flatten-plan-tasks";

const STATUS_LABEL = {
  todo: "Planificado",
  progress: "En proceso",
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

  const { open, done } = group_done_last(items);

  return (
    <div className="h-[calc(100dvh-16.5rem)] min-h-[28rem] space-y-4 overflow-y-auto pr-1">
      <TaskGroup
        title="En curso"
        items={open}
        on_open={on_open}
        empty="Nada pendiente con estos filtros."
      />
      {done.length > 0 ? (
        <TaskGroup
          title="Listas"
          items={done}
          on_open={on_open}
          muted
        />
      ) : null}
    </div>
  );
}

function TaskGroup({
  title,
  items,
  on_open,
  empty,
  muted = false,
}: {
  title: string;
  items: FlatPlanTask[];
  on_open: (item: FlatPlanTask) => void;
  empty?: string;
  muted?: boolean;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {items.length}
        </span>
      </div>
      {items.length === 0 && empty ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          {empty}
        </p>
      ) : null}
      {items.map((item) => {
        const { tarea, app_nombre, modulo_nombre } = item;
        const column = kanban_column_of_tarea(tarea);
        return (
          <button
            key={item.tarea.id}
            type="button"
            onClick={() => on_open(item)}
            className={cn(
              "flex w-full items-start gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md",
              muted && "opacity-80",
            )}
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
              <TareaDateLine tarea={tarea} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <OrigenBadge origen={tarea.origen} />
                <ObjetivoChip titulo={tarea.objetivo_titulo} />
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
              <PlanAssigneeStack people={people_on_tarea(tarea)} />
            </div>
          </button>
        );
      })}
    </section>
  );
}
