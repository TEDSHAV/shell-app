"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import {
  EXPAND_MOTION,
  STATUS_COLORS,
  expanded_card_tone,
  format_objetivo_date,
} from "../lib/display";
import type { PlanModulo, PlanTarea } from "../lib/types";
import {
  is_tarea_done,
  is_tarea_in_progress,
  is_tarea_no_solicitada,
  is_tarea_planned,
} from "../lib/task-progress";
import { PlanModuloTaskGroups } from "./plan-modulo-task-groups";
import {
  selection_state,
  tarea_ids_in_modulo,
} from "../lib/plan-selection";
import { PlanPeopleBadges } from "./plan-assignee-chip";
import { people_on_modulo } from "../lib/people";

export function PlanificacionModuleRow({
  modulo,
  select_mode,
  selected,
  read_only = false,
  on_toggle_task,
  on_toggle_ids,
  on_edit_modulo,
  on_add_tarea,
  on_edit_tarea,
}: {
  modulo: PlanModulo;
  select_mode?: boolean;
  selected?: Set<number>;
  read_only?: boolean;
  on_toggle_task?: (tarea_id: number) => void;
  on_toggle_ids?: (ids: number[], on: boolean) => void;
  on_edit_modulo: () => void;
  on_add_tarea: () => void;
  on_edit_tarea: (tarea: PlanTarea) => void;
}) {
  const [open, set_open] = useState(false);
  const [mounted, set_mounted] = useState(false);
  const sc = STATUS_COLORS[modulo.salud];
  const expanded = expanded_card_tone(modulo.id);
  const done = modulo.tareas.filter((t) => is_tarea_done(t));
  const in_progress = modulo.tareas.filter((t) => is_tarea_in_progress(t));
  const planned = modulo.tareas.filter((t) => is_tarea_planned(t));
  const skipped = modulo.tareas.filter((t) => is_tarea_no_solicitada(t));
  const ids = useMemo(() => tarea_ids_in_modulo(modulo), [modulo]);
  const state = selected ? selection_state(ids, selected) : "none";
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (box.current) box.current.indeterminate = state === "some";
  }, [state]);

  return (
    <div
      className={`overflow-hidden rounded-xl border ${EXPAND_MOTION.card} ${
        open
          ? `border-slate-200 shadow-md ring-1 ${expanded.ring} ${expanded.wash}`
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        {select_mode ? (
          <input
            ref={box}
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-slate-800"
            checked={state === "all"}
            onChange={() => on_toggle_ids?.(ids, state !== "all")}
            title="Seleccionar todo el módulo"
            aria-label={`Seleccionar ${modulo.nombre}`}
          />
        ) : null}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-4"
          onClick={() => {
            set_open((v) => {
              const next = !v;
              if (next) set_mounted(true);
              return next;
            });
          }}
        >
          <div className="w-56 shrink-0">
            <p className="text-sm font-semibold leading-tight text-gray-900">
              {modulo.nombre}
            </p>
            {modulo.app_ids.length > 1 ? (
              <p className="mt-0.5 text-xs font-semibold text-violet-700">
                varias apps
              </p>
            ) : null}
          </div>
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sc.bg} ${sc.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {modulo.salud}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-violet-600"
                style={{ width: `${modulo.progress}%` }}
              />
            </div>
            <span className="w-10 text-right text-sm font-semibold text-gray-700">
              {modulo.progress}%
            </span>
          </div>
          <div className="flex shrink-0 gap-4 text-xs">
            <div className="text-center">
              <p className="font-bold text-gray-800">{modulo.done_count}</p>
              <p className="text-gray-400">Done</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800">{modulo.left_count}</p>
              <p className="text-gray-400">Left</p>
            </div>
          </div>
          <div className="hidden max-w-[14rem] shrink-0 justify-end sm:flex">
            <PlanPeopleBadges people={people_on_modulo(modulo)} />
          </div>
          <span className="w-14 shrink-0 text-right text-xs text-gray-400">
            {format_objetivo_date(modulo.fecha_objetivo)}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 ${EXPAND_MOTION.chevron} ${open ? "rotate-180" : ""}`}
          />
        </button>
        {read_only ? null : (
        <button
          type="button"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          onClick={on_edit_modulo}
          aria-label="Editar módulo"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        )}
      </div>

      <div
        className={`${EXPAND_MOTION.panel} ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
        <div
          className={`space-y-4 border-t border-white/60 bg-white/50 px-5 py-4 ${EXPAND_MOTION.body} ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          {mounted ? (
            <>
              <PlanModuloTaskGroups
                done={done}
                in_progress={in_progress}
                planned={planned}
                skipped={skipped}
                read_only={read_only}
                select_mode={select_mode}
                selected={selected}
                on_toggle_task={on_toggle_task}
                on_edit_tarea={on_edit_tarea}
              />
              {read_only ? null : (
              <button
                type="button"
                onClick={on_add_tarea}
                className="flex items-center gap-2 px-2 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                <span className="text-lg leading-none">+</span>
                Agregar tarea a este módulo
              </button>
              )}
            </>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}
