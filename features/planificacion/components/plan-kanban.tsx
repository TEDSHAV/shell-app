"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { FlatPlanTask } from "../lib/flatten-plan-tasks";
import {
  PLAN_KANBAN_COLUMNS,
  PLAN_TAREA_DRAG_MIME,
  avance_for_kanban_column,
  kanban_column_of_tarea,
  type PlanKanbanColumnId,
} from "../lib/plan-kanban";
import { set_plan_tarea_avance } from "../actions/tarea-actions";
import { PlanKanbanCard } from "./plan-kanban-card";

export function PlanKanban({
  items,
  on_open,
}: {
  items: FlatPlanTask[];
  on_open: (item: FlatPlanTask) => void;
}) {
  const router = useRouter();
  const [local, set_local] = useState(items);
  const [dragging_id, set_dragging_id] = useState<number | null>(null);
  const [drop_column, set_drop_column] = useState<PlanKanbanColumnId | null>(
    null,
  );
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    set_local(items);
  }, [items]);

  const grouped = useMemo(() => {
    const map: Record<PlanKanbanColumnId, FlatPlanTask[]> = {
      todo: [],
      progress: [],
      done: [],
    };
    for (const item of local) {
      map[kanban_column_of_tarea(item.tarea)].push(item);
    }
    return map;
  }, [local]);

  async function move_to_column(
    tarea_id: number,
    column: PlanKanbanColumnId,
  ) {
    const current = local.find((item) => item.tarea.id === tarea_id);
    if (!current) return;
    if (kanban_column_of_tarea(current.tarea) === column) return;

    const next_avance = avance_for_kanban_column(column, current.tarea.avance);
    const previous = local;
    set_local((rows) =>
      rows.map((row) =>
        row.tarea.id === tarea_id
          ? {
              ...row,
              tarea: {
                ...row.tarea,
                avance: next_avance,
                completada: next_avance >= 100,
                no_solicitada: false,
              },
            }
          : row,
      ),
    );
    const result = await set_plan_tarea_avance(tarea_id, next_avance);
    if (!result.ok) {
      set_local(previous);
      set_error(result.error);
      return;
    }
    set_error(null);
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100dvh-14.5rem)] min-h-[28rem] flex-col overflow-hidden">
      {error ? (
        <p className="mb-2 shrink-0 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-3">
          {PLAN_KANBAN_COLUMNS.map((column) => {
            const cards = grouped[column.id];
            return (
              <section
                key={column.id}
                className={cn(
                  "flex h-full min-h-0 min-w-[260px] flex-col rounded-2xl p-3",
                  column.headerBg,
                )}
              >
                <div className="mb-3 flex shrink-0 items-center gap-2 px-1">
                  <span className={cn("text-lg font-semibold", column.countBg)}>
                    {cards.length}
                  </span>
                  <h2 className="text-sm font-semibold text-slate-700">
                    {column.label}
                  </h2>
                </div>
                <div
                  className={cn(
                    "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 transition-colors",
                    drop_column === column.id &&
                      "rounded-xl bg-violet-50/80 ring-2 ring-violet-300/60",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    set_drop_column(column.id);
                  }}
                  onDragLeave={(event) => {
                    const next = event.relatedTarget as Node | null;
                    if (next && event.currentTarget.contains(next)) return;
                    set_drop_column((current) =>
                      current === column.id ? null : current,
                    );
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    set_drop_column(null);
                    set_dragging_id(null);
                    const raw = event.dataTransfer.getData(PLAN_TAREA_DRAG_MIME);
                    const tarea_id = Number(raw);
                    if (!tarea_id) return;
                    void move_to_column(tarea_id, column.id);
                  }}
                >
                  {cards.map((item) => (
                    <PlanKanbanCard
                      key={item.tarea.id}
                      item={item}
                      is_dragging={dragging_id === item.tarea.id}
                      on_drag_start={set_dragging_id}
                      on_drag_end={() => {
                        set_dragging_id(null);
                        set_drop_column(null);
                      }}
                      on_open={on_open}
                    />
                  ))}
                  {cards.length === 0 ? (
                    <p className="py-10 text-center text-xs text-slate-400">
                      Suelta una tarea aquí
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
