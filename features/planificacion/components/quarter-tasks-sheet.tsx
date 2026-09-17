"use client";

import { ORIGIN_COLORS, format_objetivo_date } from "../lib/display";
import { build_negocios_view_url } from "../lib/prisma-routes";
import { span_label, span_tasks, type GanttSpan } from "../lib/gantt";
import { tarea_avance } from "../lib/task-progress";
import type { PlanApp, PlanModulo, PlanTarea } from "../lib/types";
import { PlanModal } from "./plan-modal";

export function QuarterTasksSheet({
  open,
  app,
  span,
  segment,
  anio,
  onClose,
  on_edit_tarea,
  on_edit_modulo,
}: {
  open: boolean;
  app: PlanApp | null;
  span: GanttSpan | null;
  segment: "done" | "pending" | null;
  anio: number;
  onClose: () => void;
  on_edit_tarea: (app: PlanApp, modulo: PlanModulo, tarea: PlanTarea) => void;
  on_edit_modulo: (app: PlanApp, modulo: PlanModulo) => void;
}) {
  if (!open || !app || !span || !segment) return null;
  const rows = span_tasks(span, segment);
  const months = span_label(span.start_month, span.end_month);
  const title =
    segment === "done"
      ? `${app.nombre} · Hechos ${months} ${anio}`
      : `${app.nombre} · Pendientes ${months} ${anio}`;

  return (
    <PlanModal open title={title} onClose={onClose}>
      <p className="mb-3 text-xs text-gray-400">
        {span.modulo.nombre} · {months} · {rows.length} tarea
        {rows.length === 1 ? "" : "s"}
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No hay tareas en este segmento.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ modulo, tarea }) => (
            <div
              key={tarea.id}
              className="rounded-lg border border-gray-100 bg-white px-3 py-2"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => on_edit_tarea(app, modulo, tarea)}
              >
                <p className="text-sm font-medium text-gray-800">
                  {tarea.titulo}
                  <span className="ml-2 text-xs font-semibold text-gray-500">
                    {tarea.no_solicitada
                      ? "No solicitado"
                      : `${tarea_avance(tarea)}%`}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {modulo.nombre}
                  {tarea.fecha_inicio
                    ? ` · ${tarea.fecha_inicio.slice(0, 10)}${
                        tarea.fecha_fin &&
                        tarea.fecha_fin.slice(0, 10) !==
                          tarea.fecha_inicio.slice(0, 10)
                          ? ` → ${tarea.fecha_fin.slice(0, 10)}`
                          : ""
                      }`
                    : ""}
                </p>
              </button>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ORIGIN_COLORS[tarea.origen]}`}
                >
                  {tarea.origen}
                </span>
                {tarea.completada ? (
                  <span className="text-[10px] text-gray-400">
                    {format_objetivo_date(tarea.completada_at)}
                  </span>
                ) : null}
                {tarea.entregable_tipo === "vista" && tarea.entregable_ruta ? (
                  <a
                    href={build_negocios_view_url(tarea.entregable_ruta)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 font-mono text-[10px] text-blue-500"
                  >
                    {tarea.entregable_ruta}
                  </a>
                ) : null}
                <button
                  type="button"
                  className="text-[10px] font-medium text-blue-600"
                  onClick={() => on_edit_modulo(app, modulo)}
                >
                  Mover módulo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PlanModal>
  );
}
