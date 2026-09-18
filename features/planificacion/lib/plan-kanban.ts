import type { PlanTarea } from "./types";
import { is_tarea_done, tarea_avance } from "./task-progress";

export const PLAN_TAREA_DRAG_MIME = "application/x-ted-plan-tarea-id";

export type PlanKanbanColumnId = "todo" | "progress" | "done";

export const PLAN_KANBAN_COLUMNS: Array<{
  id: PlanKanbanColumnId;
  label: string;
  headerBg: string;
  countBg: string;
}> = [
  {
    id: "todo",
    label: "Planificado",
    headerBg: "bg-[#f4f5f7]",
    countBg: "text-slate-500",
  },
  {
    id: "progress",
    label: "En proceso",
    headerBg: "bg-[#f4f5f7]",
    countBg: "text-slate-500",
  },
  {
    id: "done",
    label: "Completado",
    headerBg: "bg-[#f4f5f7]",
    countBg: "text-slate-500",
  },
];

export function kanban_column_of_tarea(tarea: PlanTarea): PlanKanbanColumnId {
  if (is_tarea_done(tarea)) return "done";
  if (tarea_avance(tarea) > 0) return "progress";
  return "todo";
}

export function avance_for_kanban_column(
  column: PlanKanbanColumnId,
  current: number,
): number {
  if (column === "todo") return 0;
  if (column === "done") return 100;
  if (current > 0 && current < 100) return current;
  return 50;
}
