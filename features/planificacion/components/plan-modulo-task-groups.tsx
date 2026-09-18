"use client";

import { build_negocios_view_url } from "../lib/prisma-routes";
import { sort_tareas_adicional_last } from "../lib/sort-tareas";
import { tarea_avance } from "../lib/task-progress";
import type { PlanTarea } from "../lib/types";
import { OrigenBadge } from "./origen-badge";
import { PlanAssigneeStack } from "./plan-assignee-chip";
import { people_on_tarea } from "../lib/people";

const cell_y = "align-top";

function TaskRow({
  tarea,
  select_mode,
  selected,
  read_only,
  on_toggle_task,
  on_edit_tarea,
  variant,
}: {
  tarea: PlanTarea;
  select_mode?: boolean;
  selected?: Set<number>;
  read_only?: boolean;
  on_toggle_task?: (tarea_id: number) => void;
  on_edit_tarea: (tarea: PlanTarea) => void;
  variant: "done" | "progress" | "planned" | "skipped";
}) {
  const dashed = variant === "planned" || variant === "progress";
  const edge = dashed ? "border-dashed border-gray-200" : "border-gray-100";
  return (
    <tr
      tabIndex={read_only ? undefined : 0}
      onClick={read_only ? undefined : () => on_edit_tarea(tarea)}
      onKeyDown={
        read_only
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                on_edit_tarea(tarea);
              }
            }
      }
      className={`${read_only ? "" : "cursor-pointer"} bg-white outline-none ring-violet-200 hover:bg-slate-50 focus-visible:ring-2 ${
        variant === "skipped" ? "bg-gray-50" : ""
      }`}
    >
      <td
        className={`${cell_y} w-8 border-y border-l px-2 py-2 text-center text-sm ${edge} rounded-l-lg`}
      >
        {select_mode ? (
          <input
            type="checkbox"
            className="mt-0.5"
            checked={Boolean(selected?.has(tarea.id))}
            onChange={() => on_toggle_task?.(tarea.id)}
            onClick={(event) => event.stopPropagation()}
          />
        ) : variant === "done" ? (
          <span className="text-green-500">✓</span>
        ) : variant === "skipped" ? (
          <span className="text-gray-300">—</span>
        ) : (
          <span className="text-gray-300">○</span>
        )}
      </td>
      <td className={`${cell_y} min-w-0 border-y px-2 py-2 ${edge}`}>
        <span
          className={`block whitespace-normal break-words text-sm leading-snug ${
            variant === "skipped" ? "text-gray-500" : "text-gray-800"
          }`}
        >
          {tarea.titulo}
        </span>
        {variant === "done" &&
        tarea.entregable_tipo === "vista" &&
        tarea.entregable_ruta ? (
          <a
            href={build_negocios_view_url(tarea.entregable_ruta)}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="mt-0.5 block break-all font-mono text-[10px] text-blue-500"
          >
            {tarea.entregable_ruta}
          </a>
        ) : null}
      </td>
      <td
        className={`${cell_y} w-16 border-y px-2 py-2 text-right text-xs font-semibold tabular-nums text-slate-500 ${edge}`}
      >
        {variant === "skipped" ? "—" : `${tarea_avance(tarea)}%`}
      </td>
      <td
        className={`${cell_y} w-12 border-y px-1 py-2 text-center text-[11px] font-semibold text-slate-500 ${edge}`}
      >
        {tarea.trimestre ?? "—"}
      </td>
      <td className={`${cell_y} w-36 border-y px-2 py-2 ${edge}`}>
        <PlanAssigneeStack people={people_on_tarea(tarea)} />
      </td>
      <td
        className={`${cell_y} w-36 border-y border-r px-2 py-2 ${edge} rounded-r-lg`}
      >
        {variant === "skipped" ? (
          <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500">
            No solicitado
          </span>
        ) : (
          <OrigenBadge origen={tarea.origen} />
        )}
      </td>
    </tr>
  );
}

function Group({
  title,
  dot,
  tareas,
  variant,
  select_mode,
  selected,
  read_only,
  on_toggle_task,
  on_edit_tarea,
}: {
  title: string;
  dot: string;
  tareas: PlanTarea[];
  variant: "done" | "progress" | "planned" | "skipped";
  select_mode?: boolean;
  selected?: Set<number>;
  read_only?: boolean;
  on_toggle_task?: (tarea_id: number) => void;
  on_edit_tarea: (tarea: PlanTarea) => void;
}) {
  if (tareas.length === 0) return null;
  const ordered = sort_tareas_adicional_last(tareas);
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {title} ({ordered.length})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-y-1">
          <colgroup>
            <col className="w-8" />
            <col />
            <col className="w-16" />
            <col className="w-12" />
            <col className="w-36" />
            <col className="w-36" />
          </colgroup>
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-2 py-0.5" />
              <th className="px-2 py-0.5 text-left font-semibold">Tarea</th>
              <th className="px-2 py-0.5 text-right font-semibold">Avance</th>
              <th className="px-1 py-0.5 text-center font-semibold">Trim.</th>
              <th className="px-2 py-0.5 text-left font-semibold">
                Responsable
              </th>
              <th className="px-2 py-0.5 text-left font-semibold">Origen</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((tarea) => (
              <TaskRow
                key={tarea.id}
                tarea={tarea}
                variant={variant}
                read_only={read_only}
                select_mode={select_mode}
                selected={selected}
                on_toggle_task={on_toggle_task}
                on_edit_tarea={on_edit_tarea}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlanModuloTaskGroups({
  done,
  in_progress,
  planned,
  skipped,
  select_mode,
  selected,
  read_only,
  on_toggle_task,
  on_edit_tarea,
}: {
  done: PlanTarea[];
  in_progress: PlanTarea[];
  planned: PlanTarea[];
  skipped: PlanTarea[];
  select_mode?: boolean;
  selected?: Set<number>;
  read_only?: boolean;
  on_toggle_task?: (tarea_id: number) => void;
  on_edit_tarea: (tarea: PlanTarea) => void;
}) {
  return (
    <>
      <Group
        title="Entregables completados"
        dot="bg-violet-500"
        tareas={done}
        variant="done"
        read_only={read_only}
        select_mode={select_mode}
        selected={selected}
        on_toggle_task={on_toggle_task}
        on_edit_tarea={on_edit_tarea}
      />
      <Group
        title="En proceso"
        dot="bg-orange-400"
        tareas={in_progress}
        variant="progress"
        read_only={read_only}
        select_mode={select_mode}
        selected={selected}
        on_toggle_task={on_toggle_task}
        on_edit_tarea={on_edit_tarea}
      />
      <Group
        title="Planificado"
        dot="bg-slate-400"
        tareas={planned}
        variant="planned"
        read_only={read_only}
        select_mode={select_mode}
        selected={selected}
        on_toggle_task={on_toggle_task}
        on_edit_tarea={on_edit_tarea}
      />
      <Group
        title="No solicitadas"
        dot="bg-gray-400"
        tareas={skipped}
        variant="skipped"
        read_only={read_only}
        select_mode={select_mode}
        selected={selected}
        on_toggle_task={on_toggle_task}
        on_edit_tarea={on_edit_tarea}
      />
    </>
  );
}
