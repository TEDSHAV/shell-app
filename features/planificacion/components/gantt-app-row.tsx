"use client";

import { ChevronDown, Cog, Plus, Server, Users } from "lucide-react";
import { AVATAR_COLORS, STATUS_COLORS } from "../lib/display";
import { PLAN_TRIMESTRES } from "../schemas";
import {
  QUARTER_LABELS,
  build_gantt_cells,
  build_module_spans,
  span_label,
  unique_participantes,
  type GanttSpan,
} from "../lib/gantt";
import { is_tarea_no_solicitada } from "../lib/task-progress";
import type { PlanApp, PlanHito, PlanHitoIcono, PlanTrimestre } from "../lib/types";

const HITO_ICON: Record<PlanHitoIcono, typeof Server> = {
  deploy: Server,
  engine: Cog,
  team: Users,
};

export function GanttAppRow({
  app,
  anio,
  nested,
  expandable,
  expanded,
  on_toggle,
  on_hover,
  on_leave,
  on_bar_click,
  on_add_hito,
  on_edit_hito,
}: {
  app: PlanApp;
  anio: number;
  nested?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  on_toggle?: () => void;
  on_hover: (
    event: React.MouseEvent,
    app: PlanApp,
    span: GanttSpan,
    segment: "done" | "pending",
  ) => void;
  on_leave: () => void;
  on_bar_click: (app: PlanApp, span: GanttSpan, segment: "done" | "pending") => void;
  on_add_hito: (app: PlanApp, trimestre: PlanTrimestre) => void;
  on_edit_hito: (hito: PlanHito) => void;
}) {
  const sc = STATUS_COLORS[app.salud];
  const people = unique_participantes(app.modulos);
  const cells = build_gantt_cells(app, anio);
  const spans = app.modulos.flatMap((modulo) => build_module_spans(modulo, anio));
  const track_h = 32;
  const tracks_h = Math.max(spans.length, 1) * track_h + 8;

  return (
    <div
      className={`flex items-stretch border-b border-gray-50 last:border-b-0 hover:bg-gray-50/30 ${nested ? "bg-gray-50/40" : ""}`}
      style={{ minHeight: 72 }}
    >
      <div className={`w-64 shrink-0 px-5 py-2 ${nested ? "pl-8" : ""}`}>
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={expandable ? on_toggle : undefined}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${sc.dot}`} />
          <span className="truncate text-sm font-semibold text-gray-900">
            {app.nombre}
          </span>
          {expandable ? (
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          ) : null}
        </button>
        <p className="ml-4 truncate text-[11px] text-gray-400">
          {app.subtitulo || app.slug}
        </p>
        <div className="ml-4 mt-1 flex">
          {people.slice(0, 3).map((person, idx) => (
            <div
              key={person.usuario_id}
              className={`-ml-1.5 flex h-7 w-7 first:ml-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
              title={person.nombre}
            >
              {person.initials}
            </div>
          ))}
          {people.length > 3 ? (
            <div className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-semibold text-gray-500">
              +{people.length - 3}
            </div>
          ) : null}
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-0 grid grid-cols-4">
          {PLAN_TRIMESTRES.map((trimestre) => (
            <div key={trimestre} className="border-l border-gray-100" />
          ))}
        </div>
        <div className="relative" style={{ minHeight: tracks_h }}>
          {spans.map((span, index) => (
            <div
              key={`${span.modulo.id}-${span.start_month}-${span.end_month}`}
              className="absolute flex h-7 gap-1 px-0.5"
              style={{
                top: 4 + index * track_h,
                left: `${((span.start_month - 1) / 12) * 100}%`,
                width: `${((span.end_month - span.start_month + 1) / 12) * 100}%`,
              }}
              title={`${span.modulo.nombre} · ${span_label(span.start_month, span.end_month)}`}
            >
              {span.done_count > 0 ? (
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-end rounded-lg bg-blue-400 pr-2 text-[10px] font-bold text-white shadow-sm hover:bg-blue-500"
                  style={{ flexGrow: Math.max(span.progress, 12) }}
                  onMouseEnter={(event) => on_hover(event, app, span, "done")}
                  onMouseLeave={on_leave}
                  onClick={() => on_bar_click(app, span, "done")}
                >
                  {span.progress}%
                </button>
              ) : null}
              {span.left_count > 0 ? (
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-end rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/60 pr-2 text-[10px] font-semibold text-blue-400 hover:bg-blue-100"
                  style={{ flexGrow: Math.max(100 - span.progress, 12) }}
                  onMouseEnter={(event) => on_hover(event, app, span, "pending")}
                  onMouseLeave={on_leave}
                  onClick={() => on_bar_click(app, span, "pending")}
                >
                  {100 - span.progress}%
                </button>
              ) : null}
              {span.done_count === 0 &&
              span.left_count === 0 &&
              span.tareas.some(is_tarea_no_solicitada) ? (
                <div className="flex min-w-0 flex-1 items-center justify-end rounded-lg border border-gray-200 bg-gray-100 pr-2 text-[10px] font-semibold text-gray-500">
                  No sol.
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="relative grid grid-cols-4 px-2 pb-2">
          {cells.map((cell) => (
            <div key={cell.trimestre} className="mt-1 flex flex-wrap items-center gap-1">
              {cell.hitos.map((hito) => {
                const Icon = HITO_ICON[hito.icono];
                return (
                  <button
                    key={hito.id}
                    type="button"
                    title={hito.descripcion || hito.titulo}
                    onClick={() => on_edit_hito(hito)}
                    className="flex max-w-full items-center gap-1 overflow-hidden rounded-full border border-gray-200 bg-white px-2 py-0.5 shadow-sm"
                  >
                    <Icon className="h-3 w-3 shrink-0 text-gray-500" />
                    <span className="truncate text-[10px] text-gray-600">
                      {hito.titulo}
                    </span>
                  </button>
                );
              })}
              {app.id > 0 ? (
                <button
                  type="button"
                  className="rounded-full p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                  aria-label={`Agregar hito ${QUARTER_LABELS[cell.trimestre]}`}
                  onClick={() => on_add_hito(app, cell.trimestre)}
                >
                  <Plus className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
