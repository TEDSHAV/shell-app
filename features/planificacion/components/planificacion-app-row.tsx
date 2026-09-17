"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import {
  EXPAND_MOTION,
  STATUS_COLORS,
  expanded_card_tone,
  format_objetivo_date,
} from "../lib/display";
import type { PlanApp, PlanModulo, PlanTarea } from "../lib/types";
import { PlanificacionModuleRow } from "./planificacion-module-row";
import {
  selection_state,
  tarea_ids_in_app,
} from "../lib/plan-selection";
import { cn } from "@/lib/utils";

function AvatarChip({
  initials,
  idx,
}: {
  initials: string;
  idx: number;
}) {
  const tones = [
    "bg-slate-500",
    "bg-slate-600",
    "bg-slate-700",
    "bg-sky-700",
    "bg-teal-700",
  ];
  return (
    <div
      className={cn(
        "-ml-1.5 flex h-7 w-7 first:ml-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white",
        tones[idx % tones.length],
      )}
    >
      {initials}
    </div>
  );
}

export function PlanificacionAppRow({
  app,
  select_mode,
  selected,
  on_toggle_task,
  on_toggle_ids,
  on_edit_app,
  on_add_modulo,
  on_edit_modulo,
  on_add_tarea,
  on_edit_tarea,
}: {
  app: PlanApp;
  select_mode?: boolean;
  selected?: Set<number>;
  on_toggle_task?: (tarea_id: number) => void;
  on_toggle_ids?: (ids: number[], on: boolean) => void;
  on_edit_app: () => void;
  on_add_modulo: () => void;
  on_edit_modulo: (modulo: PlanModulo) => void;
  on_add_tarea: (modulo: PlanModulo) => void;
  on_edit_tarea: (modulo: PlanModulo, tarea: PlanTarea) => void;
}) {
  const [open, set_open] = useState(false);
  const sc = STATUS_COLORS[app.salud];
  const expanded = expanded_card_tone(app.id);
  const ids = useMemo(() => tarea_ids_in_app(app), [app]);
  const state = selected
    ? selection_state(ids, selected)
    : "none";
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (box.current) box.current.indeterminate = state === "some";
  }, [state]);

  const people = useMemo(() => {
    const seen = new Set<number>();
    return app.modulos.flatMap((modulo) =>
      modulo.participantes.filter((person) => {
        if (seen.has(person.usuario_id)) return false;
        seen.add(person.usuario_id);
        return true;
      }),
    );
  }, [app]);

  const due = app.modulos
    .map((modulo) => modulo.fecha_objetivo)
    .filter(Boolean)
    .sort()[0] ?? null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
        EXPAND_MOTION.card,
        open
          ? cn("border-slate-200 shadow-lg ring-2", expanded.ring, expanded.wash)
          : "border-slate-200/90 bg-white hover:shadow-md",
      )}
    >
      <div className="flex w-full items-center gap-3 px-5 py-4 text-left">
        {select_mode ? (
          <input
            ref={box}
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-slate-800"
            checked={state === "all"}
            onChange={() => on_toggle_ids?.(ids, state !== "all")}
            title="Seleccionar toda la app"
            aria-label={`Seleccionar ${app.nombre}`}
          />
        ) : null}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-4"
          onClick={() => set_open((v) => !v)}
        >
          <div className="min-w-0 w-44 shrink-0">
            <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">
              {app.nombre}
            </p>
          </div>
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sc.bg} ${sc.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {app.salud}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-violet-600 transition-all duration-500"
                style={{ width: `${app.progress}%` }}
              />
            </div>
            <span className="w-10 text-right text-sm font-semibold tabular-nums text-slate-700">
              {app.progress}%
            </span>
          </div>
          <div className="hidden shrink-0 gap-5 text-xs sm:flex">
            <div className="text-center">
              <p className="font-bold tabular-nums text-slate-800">
                {app.done_count}
              </p>
              <p className="text-slate-400">Done</p>
            </div>
            <div className="text-center">
              <p className="font-bold tabular-nums text-slate-800">
                {app.left_count}
              </p>
              <p className="text-slate-400">Left</p>
            </div>
          </div>
          <div className="hidden shrink-0 pl-1 md:flex">
            {people.slice(0, 3).map((person, index) => (
              <AvatarChip
                key={person.usuario_id}
                initials={person.initials}
                idx={index}
              />
            ))}
            {people.length > 3 ? (
              <div className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-600">
                +{people.length - 3}
              </div>
            ) : null}
          </div>
          <span className="hidden w-14 shrink-0 text-right text-xs text-slate-400 lg:block">
            {format_objetivo_date(due)}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400",
              EXPAND_MOTION.chevron,
              open && "rotate-180",
            )}
          />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          onClick={on_edit_app}
          aria-label="Editar aplicación"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className={cn(
          EXPAND_MOTION.panel,
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "space-y-2 border-t border-slate-100/80 bg-white/40 px-4 py-3",
              EXPAND_MOTION.body,
              open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
            )}
          >
            {app.modulos.length === 0 ? (
              <p className="px-1 text-sm text-slate-400">
                Esta app aún no tiene módulos.
              </p>
            ) : (
              app.modulos.map((modulo) => (
                <PlanificacionModuleRow
                  key={modulo.id}
                  modulo={modulo}
                  select_mode={select_mode}
                  selected={selected}
                  on_toggle_task={on_toggle_task}
                  on_toggle_ids={on_toggle_ids}
                  on_edit_modulo={() => on_edit_modulo(modulo)}
                  on_add_tarea={() => on_add_tarea(modulo)}
                  on_edit_tarea={(tarea) => on_edit_tarea(modulo, tarea)}
                />
              ))
            )}
            <button
              type="button"
              onClick={on_add_modulo}
              className="flex items-center gap-2 px-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              <span className="text-lg leading-none">+</span>
              Agregar módulo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
