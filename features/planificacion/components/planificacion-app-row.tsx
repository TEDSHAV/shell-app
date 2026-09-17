"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { STATUS_COLORS } from "../lib/display";
import type { PlanApp, PlanModulo, PlanTarea } from "../lib/types";
import { PlanificacionModuleRow } from "./planificacion-module-row";

export function PlanificacionAppRow({
  app,
  on_edit_app,
  on_add_modulo,
  on_edit_modulo,
  on_add_tarea,
  on_edit_tarea,
}: {
  app: PlanApp;
  on_edit_app: () => void;
  on_add_modulo: () => void;
  on_edit_modulo: (modulo: PlanModulo) => void;
  on_add_tarea: (modulo: PlanModulo) => void;
  on_edit_tarea: (modulo: PlanModulo, tarea: PlanTarea) => void;
}) {
  const [open, set_open] = useState(false);
  const sc = STATUS_COLORS[app.salud];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <div className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/70">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-4"
          onClick={() => set_open((v) => !v)}
        >
          <div className="w-56 shrink-0">
            <p className="text-sm font-semibold leading-tight text-gray-900">
              {app.nombre}
            </p>
            <p className="mt-0.5 text-xs leading-tight text-gray-400">
              {app.subtitulo || app.slug}
            </p>
          </div>
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sc.bg} ${sc.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {app.salud}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${app.progress}%` }}
              />
            </div>
            <span className="w-10 text-right text-sm font-semibold text-gray-700">
              {app.progress}%
            </span>
          </div>
          <div className="flex shrink-0 gap-4 text-xs">
            <div className="text-center">
              <p className="font-bold text-gray-800">{app.modulo_count}</p>
              <p className="text-gray-400">Módulos</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800">{app.done_count}</p>
              <p className="text-gray-400">Done</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800">{app.left_count}</p>
              <p className="text-gray-400">Left</p>
            </div>
          </div>
          <span className="w-16 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {app.origen === "shell" ? "Shell" : "Custom"}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          onClick={on_edit_app}
          aria-label="Editar aplicación"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          {app.modulos.length === 0 ? (
            <p className="text-sm text-gray-400">
              Esta app aún no tiene módulos.
            </p>
          ) : (
            app.modulos.map((modulo) => (
              <PlanificacionModuleRow
                key={modulo.id}
                modulo={modulo}
                on_edit_modulo={() => on_edit_modulo(modulo)}
                on_add_tarea={() => on_add_tarea(modulo)}
                on_edit_tarea={(tarea) => on_edit_tarea(modulo, tarea)}
              />
            ))
          )}
          <button
            type="button"
            onClick={on_add_modulo}
            className="flex items-center gap-2 px-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <span className="text-lg leading-none">+</span>
            Agregar módulo a esta app
          </button>
        </div>
      ) : null}
    </div>
  );
}
