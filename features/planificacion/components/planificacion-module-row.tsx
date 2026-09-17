"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import {
  EXPAND_MOTION,
  STATUS_COLORS,
  expanded_card_tone,
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
import {
  selection_state,
  tarea_ids_in_modulo,
} from "../lib/plan-selection";

function AvatarChip({
  initials,
  idx,
}: {
  initials: string;
  idx: number;
}) {
  return (
    <div
      className={`-ml-1.5 flex h-7 w-7 first:ml-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white ${["bg-slate-500", "bg-slate-600", "bg-sky-700", "bg-teal-700"][idx % 4]}`}
    >
      {initials}
    </div>
  );
}

export function PlanificacionModuleRow({
  modulo,
  select_mode,
  selected,
  on_toggle_task,
  on_toggle_ids,
  on_edit_modulo,
  on_add_tarea,
  on_edit_tarea,
}: {
  modulo: PlanModulo;
  select_mode?: boolean;
  selected?: Set<number>;
  on_toggle_task?: (tarea_id: number) => void;
  on_toggle_ids?: (ids: number[], on: boolean) => void;
  on_edit_modulo: () => void;
  on_add_tarea: () => void;
  on_edit_tarea: (tarea: PlanTarea) => void;
}) {
  const [open, set_open] = useState(false);
  const sc = STATUS_COLORS[modulo.salud];
  const expanded = expanded_card_tone(modulo.id);
  const done = modulo.tareas.filter((t) => is_tarea_done(t));
  const pending = modulo.tareas.filter((t) => is_tarea_pending(t));
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
          onClick={() => set_open((v) => !v)}
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
            className={`h-4 w-4 shrink-0 text-gray-400 ${EXPAND_MOTION.chevron} ${open ? "rotate-180" : ""}`}
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
          {done.length > 0 ? (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
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
                      {select_mode ? (
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={Boolean(selected?.has(t.id))}
                          onChange={() => on_toggle_task?.(t.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm text-green-500">✓</span>
                      )}
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
                      {select_mode ? (
                        <input
                          type="checkbox"
                          checked={Boolean(selected?.has(t.id))}
                          onChange={() => on_toggle_task?.(t.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm text-gray-300">○</span>
                      )}
                      <span className="text-sm text-gray-600">{t.titulo}</span>
                      <span className="text-xs font-semibold text-gray-500">
                        {tarea_avance(t)}%
                      </span>
                      {t.trimestre ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {t.trimestre}
                        </span>
                      ) : null}
                      {t.asignado ? (
                        <span
                          className="text-[10px] font-semibold text-slate-500"
                          title={t.asignado.nombre}
                        >
                          {t.asignado.initials}
                        </span>
                      ) : null}
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
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
                      {select_mode ? (
                        <input
                          type="checkbox"
                          checked={Boolean(selected?.has(t.id))}
                          onChange={() => on_toggle_task?.(t.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                      <span className="text-sm text-gray-500">{t.titulo}</span>
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                        No solicitado
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
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
            className="flex items-center gap-2 px-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <span className="text-lg leading-none">+</span>
            Agregar tarea a este módulo
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
