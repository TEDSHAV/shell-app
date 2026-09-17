"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PLAN_TRIMESTRES } from "../schemas";
import {
  QUARTER_MONTHS,
  merge_plan_apps,
  span_label,
  type GanttSpan,
} from "../lib/gantt";
import type { PlanApp, PlanHito, PlanTarea, PlanTrimestre } from "../lib/types";
import { GanttAppRow } from "./gantt-app-row";
import { GanttEditRow } from "./gantt-edit-row";

export function RoadmapGantt({
  listed,
  utilidades,
  anio,
  on_bar_click,
  on_add_hito,
  on_edit_hito,
  on_place_tarea,
  edit_mode,
}: {
  listed: PlanApp[];
  utilidades: PlanApp[];
  anio: number;
  on_bar_click: (
    app: PlanApp,
    span: GanttSpan,
    segment: "done" | "pending",
  ) => void;
  on_add_hito: (app: PlanApp, trimestre: PlanTrimestre) => void;
  on_edit_hito: (hito: PlanHito) => void;
  on_place_tarea: (tarea: PlanTarea, trimestre: PlanTrimestre) => void;
  edit_mode: boolean;
}) {
  const container_ref = useRef<HTMLDivElement>(null);
  const [open_utils, set_open_utils] = useState(false);
  const [tooltip, set_tooltip] = useState<{
    x: number;
    y: number;
    app: PlanApp;
    span: GanttSpan;
    segment: "done" | "pending";
  } | null>(null);

  function on_hover(
    event: React.MouseEvent,
    app: PlanApp,
    span: GanttSpan,
    segment: "done" | "pending",
  ) {
    const rect = container_ref.current?.getBoundingClientRect();
    if (!rect) return;
    set_tooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top - 72,
      app,
      span,
      segment,
    });
  }

  const utils_app =
    utilidades.length > 0
      ? merge_plan_apps(utilidades, "Utilidades", "Header y utilidades del Shell")
      : null;

  return (
    <div
      ref={container_ref}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex border-b border-gray-100">
        <div className={`${edit_mode ? "w-80" : "w-64"} shrink-0 bg-gray-50/50 px-5 py-3`}>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {edit_mode ? "App y pendientes" : "App"}
          </span>
        </div>
        <div className="grid flex-1 grid-cols-4">
          {PLAN_TRIMESTRES.map((trimestre) => (
            <div
              key={trimestre}
              className="border-l border-gray-100 bg-gray-50/50 px-4 py-3"
            >
              <div className="text-sm font-black text-gray-800">{trimestre}</div>
              <div className="mt-0.5 text-[10px] text-gray-400">
                {QUARTER_MONTHS[trimestre]}
                {edit_mode ? " · suelta aquí" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {listed.map((app) =>
        edit_mode ? (
          <GanttEditRow
            key={app.id}
            app={app}
            anio={anio}
            on_add_hito={on_add_hito}
            on_edit_hito={on_edit_hito}
            on_place_tarea={on_place_tarea}
          />
        ) : (
          <GanttAppRow
            key={app.id}
            app={app}
            anio={anio}
            on_hover={on_hover}
            on_leave={() => set_tooltip(null)}
            on_bar_click={on_bar_click}
            on_edit_hito={on_edit_hito}
          />
        ),
      )}

      {utils_app ? (
        <>
          {edit_mode ? (
            <GanttEditRow
              app={utils_app}
              anio={anio}
              expandable
              expanded={open_utils}
              on_toggle={() => set_open_utils((value) => !value)}
              on_add_hito={on_add_hito}
              on_edit_hito={on_edit_hito}
              on_place_tarea={on_place_tarea}
            />
          ) : (
            <GanttAppRow
              app={utils_app}
              anio={anio}
              expandable
              expanded={open_utils}
              on_toggle={() => set_open_utils((value) => !value)}
              on_hover={on_hover}
              on_leave={() => set_tooltip(null)}
              on_bar_click={on_bar_click}
              on_edit_hito={on_edit_hito}
            />
          )}
          {open_utils ? (
            <div className="border-t border-gray-100">
              <div className="flex items-center gap-1 px-5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <ChevronDown className="h-3 w-3" />
                Apps de utilidades
              </div>
              {utilidades.map((app) =>
                edit_mode ? (
                  <GanttEditRow
                    key={app.id}
                    app={app}
                    anio={anio}
                    nested
                    on_add_hito={on_add_hito}
                    on_edit_hito={on_edit_hito}
                    on_place_tarea={on_place_tarea}
                  />
                ) : (
                  <GanttAppRow
                    key={app.id}
                    app={app}
                    anio={anio}
                    nested
                    on_hover={on_hover}
                    on_leave={() => set_tooltip(null)}
                    on_bar_click={on_bar_click}
                    on_edit_hito={on_edit_hito}
                  />
                ),
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {listed.length === 0 && !utils_app ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">
          No hay aplicaciones en este filtro.
        </div>
      ) : null}

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-20 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-lg"
          style={{ left: tooltip.x + 12, top: Math.max(tooltip.y, 8) }}
        >
          <p className="mb-1 font-semibold text-gray-900">{tooltip.app.nombre}</p>
          <p className="mb-1 text-gray-500">{tooltip.span.modulo.nombre}</p>
          {tooltip.segment === "done" ? (
            <>
              <p>
                Avance real: <strong>{tooltip.span.progress}%</strong> (
                {tooltip.span.done_count} listos)
              </p>
              <p>
                Meses:{" "}
                <strong>
                  {span_label(tooltip.span.start_month, tooltip.span.end_month)}{" "}
                  {anio}
                </strong>
              </p>
            </>
          ) : (
            <>
              <p>
                Pendiente: <strong>{100 - tooltip.span.progress}%</strong> (
                {tooltip.span.left_count} en backlog)
              </p>
              <p>
                Meses:{" "}
                <strong>
                  {span_label(tooltip.span.start_month, tooltip.span.end_month)}{" "}
                  {anio}
                </strong>
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
