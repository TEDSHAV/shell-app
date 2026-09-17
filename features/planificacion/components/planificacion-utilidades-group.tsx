"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { derive_app_salud, sum_app_progress } from "../lib/app-salud";
import { EXPAND_MOTION, STATUS_COLORS } from "../lib/display";
import type { PlanApp, PlanModulo, PlanTarea } from "../lib/types";
import { PlanificacionAppRow } from "./planificacion-app-row";

export function PlanificacionUtilidadesGroup({
  apps,
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
  apps: PlanApp[];
  select_mode?: boolean;
  selected?: Set<number>;
  on_toggle_task?: (tarea_id: number) => void;
  on_toggle_ids?: (ids: number[], on: boolean) => void;
  on_edit_app: (app: PlanApp) => void;
  on_add_modulo: (app: PlanApp) => void;
  on_edit_modulo: (app: PlanApp, modulo: PlanModulo) => void;
  on_add_tarea: (app: PlanApp, modulo: PlanModulo) => void;
  on_edit_tarea: (app: PlanApp, modulo: PlanModulo, tarea: PlanTarea) => void;
}) {
  const [open, set_open] = useState(false);
  const totals = sum_app_progress(apps.flatMap((app) => app.modulos));
  const salud = derive_app_salud(apps.flatMap((app) => app.modulos));
  const modulo_count = apps.reduce((sum, app) => sum + app.modulo_count, 0);
  const sc = STATUS_COLORS[salud];

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.05)] ${EXPAND_MOTION.card} ${
        open
          ? "border-slate-200 bg-violet-50/80 shadow-lg ring-2 ring-violet-300"
          : "border-slate-200/90 bg-white hover:shadow-md"
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/70"
        onClick={() => set_open((value) => !value)}
      >
        <div className="w-56 shrink-0">
          <p className="text-sm font-semibold leading-tight text-gray-900">
            Utilidades
          </p>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sc.bg} ${sc.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
          {salud}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-violet-600"
              style={{ width: `${totals.progress}%` }}
            />
          </div>
          <span className="w-10 text-right text-sm font-semibold text-gray-700">
            {totals.progress}%
          </span>
        </div>
        <div className="flex shrink-0 gap-4 text-xs">
          <div className="text-center">
            <p className="font-bold text-gray-800">{apps.length}</p>
            <p className="text-gray-400">Apps</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-800">{modulo_count}</p>
            <p className="text-gray-400">Módulos</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-800">{totals.done_count}</p>
            <p className="text-gray-400">Done</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-800">{totals.left_count}</p>
            <p className="text-gray-400">Left</p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 ${EXPAND_MOTION.chevron} ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`${EXPAND_MOTION.panel} ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`space-y-2 border-t border-slate-100/80 bg-white/40 px-3 py-3 ${EXPAND_MOTION.body} ${
              open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
          >
          {apps.map((app) => (
            <PlanificacionAppRow
              key={app.id}
              app={app}
              select_mode={select_mode}
              selected={selected}
              on_toggle_task={on_toggle_task}
              on_toggle_ids={on_toggle_ids}
              on_edit_app={() => on_edit_app(app)}
              on_add_modulo={() => on_add_modulo(app)}
              on_edit_modulo={(modulo) => on_edit_modulo(app, modulo)}
              on_add_tarea={(modulo) => on_add_tarea(app, modulo)}
              on_edit_tarea={(modulo, tarea) =>
                on_edit_tarea(app, modulo, tarea)
              }
            />
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
