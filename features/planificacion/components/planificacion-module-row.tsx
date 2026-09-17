"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import {
  AVATAR_COLORS,
  ORIGIN_COLORS,
  STATUS_COLORS,
  format_objetivo_date,
} from "../lib/display";
import { build_negocios_view_url } from "../lib/prisma-routes";
import type { PlanModulo, PlanTarea } from "../lib/types";
import {
  is_tarea_done,
  is_tarea_no_solicitada,
  is_tarea_pending,
  tarea_avance,
} from "../lib/task-progress";

function AvatarChip({
  initials,
  idx,
}: {
  initials: string;
  idx: number;
}) {
  return (
    <div
      className={`-ml-1.5 flex h-7 w-7 first:ml-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
    >
      {initials}
    </div>
  );
}

export function PlanificacionModuleRow({
  modulo,
  on_edit_modulo,
  on_add_tarea,
  on_edit_tarea,
}: {
  modulo: PlanModulo;
  on_edit_modulo: () => void;
  on_add_tarea: () => void;
  on_edit_tarea: (tarea: PlanTarea) => void;
}) {
  const [open, set_open] = useState(false);
  const sc = STATUS_COLORS[modulo.salud];
  const done = modulo.tareas.filter((t) => is_tarea_done(t));
  const pending = modulo.tareas.filter((t) => is_tarea_pending(t));
  const skipped = modulo.tareas.filter((t) => is_tarea_no_solicitada(t));

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
              {modulo.nombre}
            </p>
            <p className="mt-0.5 text-xs leading-tight text-gray-400">
              {modulo.subtitulo || "Sin alcance"}
              {modulo.app_ids.length > 1 ? " · varias apps" : ""}
            </p>
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
                className="h-2 rounded-full bg-blue-500"
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
          <div className="flex shrink-0 pl-2">
            {modulo.participantes.slice(0, 3).map((p, i) => (
              <AvatarChip key={p.usuario_id} initials={p.initials} idx={i} />
            ))}
            {modulo.participantes.length > 3 ? (
              <div className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-semibold text-gray-500">
                +{modulo.participantes.length - 3}
              </div>
            ) : null}
          </div>
          <span className="w-14 shrink-0 text-right text-xs text-gray-400">
            {format_objetivo_date(modulo.fecha_objetivo)}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          onClick={on_edit_modulo}
          aria-label="Editar módulo"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          {done.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                Entregables completados ({done.length})
              </p>
              <div className="space-y-1">
                {done.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => on_edit_tarea(t)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-2.5 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="text-sm text-green-500">✓</span>
                      <span className="truncate text-sm font-medium text-gray-700">
                        {t.titulo}
                      </span>
                      {t.entregable_tipo === "vista" && t.entregable_ruta ? (
                        <a
                          href={build_negocios_view_url(t.entregable_ruta)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 font-mono text-xs text-blue-500"
                        >
                          {t.entregable_ruta}
                        </a>
                      ) : null}
                      {t.entregable_tipo === "comentario" &&
                      t.entregable_comentario ? (
                        <span className="truncate text-xs text-gray-400">
                          {t.entregable_comentario}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-gray-400">
                      {format_objetivo_date(t.completada_at)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {pending.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                Backlog pendiente ({pending.length})
              </p>
              <div className="space-y-1">
                {pending.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => on_edit_tarea(t)}
                    className="flex w-full items-center justify-between rounded-lg border border-dashed border-gray-200 bg-white px-4 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm text-gray-300">○</span>
                      <span className="text-sm text-gray-600">{t.titulo}</span>
                      <span className="text-xs font-semibold text-gray-500">
                        {tarea_avance(t)}%
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ORIGIN_COLORS[t.origen]}`}
                      >
                        {t.origen}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {skipped.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
                No solicitadas ({skipped.length})
              </p>
              <div className="space-y-1">
                {skipped.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => on_edit_tarea(t)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm text-gray-300">—</span>
                      <span className="text-sm text-gray-500">{t.titulo}</span>
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                        No solicitado
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ORIGIN_COLORS[t.origen]}`}
                      >
                        {t.origen}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={on_add_tarea}
            className="flex items-center gap-2 px-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <span className="text-lg leading-none">+</span>
            Agregar tarea a este módulo
          </button>
        </div>
      ) : null}
    </div>
  );
}
