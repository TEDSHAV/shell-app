import type { ReactNode } from "react";
import {
  CalendarRange,
  CheckCircle2,
  CircleDashed,
  Layers,
  LayoutGrid,
  Package,
  Target,
  Ticket,
  Users,
} from "lucide-react";
import { PlanAssigneeChip } from "./plan-assignee-chip";
import { OrigenBadge } from "./origen-badge";
import { people_on_tarea } from "../lib/people";
import { PLAN_RELEASE_UNITS } from "../lib/release-units";
import { tarea_avance } from "../lib/task-progress";
import type { PlanApp, PlanModulo, PlanTarea } from "../lib/types";

function format_day(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </span>
      <div className="min-w-0 text-right text-sm font-semibold text-slate-900">
        {children}
      </div>
    </div>
  );
}

export function TareaViewPanel({
  tarea,
  app,
  modulo,
}: {
  tarea: PlanTarea;
  app: PlanApp | undefined;
  modulo: PlanModulo | undefined;
}) {
  const pct = tarea.no_solicitada ? 0 : tarea_avance(tarea);
  const unit = PLAN_RELEASE_UNITS.find(
    (item) => item.id === tarea.entregable_unidad,
  );
  const people = people_on_tarea(tarea);
  const status = tarea.no_solicitada
    ? { label: "No solicitada", tone: "bg-slate-100 text-slate-600" }
    : tarea.completada
      ? { label: "Completada", tone: "bg-emerald-50 text-emerald-800" }
      : pct > 0
        ? { label: "En marcha", tone: "bg-violet-50 text-violet-800" }
        : { label: "Planificada", tone: "bg-sky-50 text-sky-800" };
  const StatusIcon = tarea.completada ? CheckCircle2 : CircleDashed;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Avance
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
              {tarea.no_solicitada ? "—" : `${pct}%`}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </span>
        </div>
        {!tarea.no_solicitada ? (
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2.5 rounded-full bg-violet-600 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Esta tarea no cuenta en el porcentaje del plan.
          </p>
        )}
      </div>

      <div className="divide-y divide-slate-100 rounded-2xl border border-black/5 bg-white px-5 py-2 shadow-sm">
        <MetaRow
          icon={<LayoutGrid className="h-4 w-4 text-violet-500" />}
          label="App"
        >
          {app?.nombre ?? "—"}
        </MetaRow>
        <MetaRow
          icon={<Layers className="h-4 w-4 text-violet-500" />}
          label="Módulo"
        >
          {modulo?.nombre ?? "—"}
        </MetaRow>
        <MetaRow
          icon={<Package className="h-4 w-4 text-violet-500" />}
          label="Origen"
        >
          <OrigenBadge origen={tarea.origen} />
        </MetaRow>
        {tarea.objetivo_titulo ? (
          <MetaRow
            icon={<Target className="h-4 w-4 text-violet-500" />}
            label="Objetivo"
          >
            {tarea.objetivo_titulo}
          </MetaRow>
        ) : null}
        <MetaRow
          icon={<CalendarRange className="h-4 w-4 text-violet-500" />}
          label="Fechas"
        >
          {format_day(tarea.fecha_inicio)} → {format_day(tarea.fecha_fin)}
          {tarea.trimestre ? ` · ${tarea.trimestre}` : ""}
        </MetaRow>
        <MetaRow
          icon={<Users className="h-4 w-4 text-violet-500" />}
          label="Asignados"
        >
          {people.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {people.map((person) => (
                <PlanAssigneeChip key={person.usuario_id} person={person} />
              ))}
            </div>
          ) : (
            <span className="font-medium text-slate-400">Sin asignar</span>
          )}
        </MetaRow>
        {tarea.ticket_id ? (
          <MetaRow
            icon={<Ticket className="h-4 w-4 text-violet-500" />}
            label="Ticket"
          >
            #{tarea.ticket_id}
          </MetaRow>
        ) : null}
      </div>

      {tarea.descripcion?.trim() ? (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Descripción
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {tarea.descripcion}
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Entregable
        </p>
        {tarea.entregable_tipo === "vista" && tarea.entregable_ruta ? (
          <p className="mt-2 break-all text-sm leading-relaxed text-slate-800">
            Vista Prisma · {tarea.entregable_ruta}
          </p>
        ) : null}
        {tarea.entregable_tipo === "version" ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-800">
            {unit?.label ?? tarea.entregable_unidad} ·{" "}
            {tarea.entregable_version || "sin versión"}
          </p>
        ) : null}
        {tarea.entregable_tipo === "comentario" &&
        tarea.entregable_comentario ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {tarea.entregable_comentario}
          </p>
        ) : null}
        {tarea.entregable_tipo === "ninguno" ||
        (!tarea.entregable_ruta &&
          !tarea.entregable_version &&
          !tarea.entregable_comentario) ? (
          <p className="mt-2 text-sm text-slate-500">Aún no hay entregable.</p>
        ) : null}
        {tarea.completada_at ? (
          <p className="mt-3 text-xs text-slate-400">
            Completada el {format_day(tarea.completada_at)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
