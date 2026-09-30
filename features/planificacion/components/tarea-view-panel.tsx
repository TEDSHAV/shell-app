"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarRange,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Layers,
  LayoutGrid,
  Package,
  Target,
  Ticket,
  Users,
} from "lucide-react";
import { PlanAssigneeChip } from "./plan-assignee-chip";
import { OrigenBadge } from "./origen-badge";
import { TareaAvanceCard } from "./tarea-avance-card";
import { people_on_tarea } from "../lib/people";
import { PLAN_RELEASE_UNITS } from "../lib/release-units";
import { tarea_avance } from "../lib/task-progress";
import { build_prisma_view_url } from "../lib/prisma-routes";
import {
  parse_descripcion,
  toggle_check_at,
  avance_from_descripcion,
  checks_in_descripcion,
} from "../lib/tarea-descripcion";
import {
  format_check_completed_at,
  stamp_check_times,
} from "../lib/tarea-checklist";
import { save_plan_tarea_progreso } from "../actions/tarea-actions";
import type { PlanApp, PlanModulo, PlanTarea } from "../lib/types";

function format_day(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function snapshot_tarea(row: PlanTarea) {
  return {
    pct: row.no_solicitada ? 0 : tarea_avance(row),
    desc: row.descripcion ?? "",
    done: row.completada,
  };
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

function ViewCheckLine({
  done,
  texto,
  stamp,
  can_write,
  on_toggle,
}: {
  done: boolean;
  texto: string;
  stamp: string | null;
  can_write: boolean;
  on_toggle: () => void;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-violet-600 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none disabled:cursor-default"
        checked={done}
        disabled={!can_write}
        onChange={on_toggle}
      />
      <div className="min-w-0">
        <p
          className={`min-w-0 break-words [overflow-wrap:anywhere] ${
            done ? "text-slate-500 line-through" : ""
          }`}
        >
          {texto}
        </p>
        {stamp ? (
          <p className="mt-0.5 text-[11px] font-normal text-slate-400">
            {stamp}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TareaViewPanel({
  tarea,
  app,
  modulo,
  can_write = false,
}: {
  tarea: PlanTarea;
  app: PlanApp | undefined;
  modulo: PlanModulo | undefined;
  can_write?: boolean;
}) {
  const router = useRouter();
  const [committed, set_committed] = useState(() => snapshot_tarea(tarea));
  const [avance, set_avance] = useState(committed.pct);
  const [descripcion, set_descripcion] = useState(committed.desc);
  const [completada, set_completada] = useState(committed.done);
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const unit = PLAN_RELEASE_UNITS.find(
    (item) => item.id === tarea.entregable_unidad,
  );
  const people = people_on_tarea(tarea);
  const pct = tarea.no_solicitada ? 0 : avance;
  const dirty =
    can_write &&
    !tarea.no_solicitada &&
    (pct !== committed.pct || descripcion !== committed.desc);
  const status = tarea.no_solicitada
    ? { label: "No solicitada", tone: "bg-slate-100 text-slate-600" }
    : completada || pct >= 100
      ? { label: "Completada", tone: "bg-emerald-50 text-emerald-800" }
      : pct > 0
        ? { label: "En marcha", tone: "bg-violet-50 text-violet-800" }
        : { label: "Planificada", tone: "bg-sky-50 text-sky-800" };
  const StatusIcon = completada || pct >= 100 ? CheckCircle2 : CircleDashed;
  const blocks = parse_descripcion(descripcion);
  const has_checks = blocks.some((block) => block.kind === "check");
  const check_meta = stamp_check_times(
    tarea.checklist,
    checks_in_descripcion(descripcion),
    new Date().toISOString(),
  );

  useEffect(() => {
    const next = snapshot_tarea(tarea);
    set_committed(next);
    if (dirty) return;
    set_avance(next.pct);
    set_descripcion(next.desc);
    set_completada(next.done);
  }, [tarea, dirty]);

  function apply_check_toggle(index: number) {
    if (!can_write) return;
    const next = toggle_check_at(descripcion, index);
    set_descripcion(next);
    if (tarea.sync_avance_checklist) {
      const derived = avance_from_descripcion(next);
      if (derived !== null) set_avance(derived);
    }
  }

  function cancel_progreso() {
    set_error(null);
    set_avance(committed.pct);
    set_descripcion(committed.desc);
    set_completada(committed.done);
  }

  async function save_progreso() {
    if (!can_write || tarea.no_solicitada) return;
    set_saving(true);
    set_error(null);
    const result = await save_plan_tarea_progreso({
      id: tarea.id,
      avance,
      descripcion,
      sync_avance: tarea.sync_avance_checklist,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    set_avance(result.avance);
    set_completada(result.avance >= 100);
    set_committed({
      pct: result.avance,
      desc: descripcion,
      done: result.avance >= 100,
    });
    router.refresh();
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {descripcion.trim() ? (
        <div className="min-w-0 overflow-x-hidden rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Descripción
          </p>
          <div className="mt-3 min-w-0 space-y-2 overflow-x-hidden break-words text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
            {has_checks
              ? blocks.map((block, index) =>
                  block.kind === "text" ? (
                    block.text.trim() ? (
                      <p
                        key={`t-${index}`}
                        className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                      >
                        {block.text}
                      </p>
                    ) : null
                  ) : (
                    <ViewCheckLine
                      key={`c-${index}`}
                      done={block.done}
                      texto={block.texto}
                      can_write={can_write}
                      stamp={
                        block.done
                          ? format_check_completed_at(
                              check_meta[
                                blocks
                                  .slice(0, index + 1)
                                  .filter(
                                    (item) =>
                                      item.kind === "check" &&
                                      item.texto.trim().length > 0,
                                  ).length - 1
                              ]?.completed_at ?? null,
                            )
                          : null
                      }
                      on_toggle={() => {
                        const check_index =
                          blocks
                            .slice(0, index + 1)
                            .filter((item) => item.kind === "check").length -
                          1;
                        apply_check_toggle(check_index);
                      }}
                    />
                  ),
                )
              : (
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {descripcion}
                </p>
              )}
          </div>
        </div>
      ) : null}

      <TareaAvanceCard
        pct={pct}
        label={status.label}
        tone={status.tone}
        icon={<StatusIcon className="h-3.5 w-3.5" />}
        no_solicitada={tarea.no_solicitada}
        can_write={can_write}
        saving={saving}
        error={error}
        dirty={dirty}
        on_change={set_avance}
        on_save={() => void save_progreso()}
        on_cancel={cancel_progreso}
      />

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
          label={tarea.fecha_inicio ? "Fechas" : "Trimestre"}
        >
          {tarea.fecha_inicio
            ? `${format_day(tarea.fecha_inicio)} → ${format_day(tarea.fecha_fin)}`
            : tarea.trimestre || "Sin colocar"}
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

      {completada ? (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Entregable
          </p>
          {tarea.entregable_tipo === "vista" && tarea.entregable_ruta ? (
            <a
              href={build_prisma_view_url(tarea.entregable_ruta)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline"
            >
              Vista Prisma · {tarea.entregable_ruta}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
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
      ) : null}
    </div>
  );
}
