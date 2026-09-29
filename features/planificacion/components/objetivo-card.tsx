"use client";

import Link from "next/link";
import { ObjetivoDescripcion } from "./objetivo-descripcion";
import { PlanAssigneeChip, PlanAssigneeStack } from "./plan-assignee-chip";
import { format_month_label } from "../lib/plan-month";
import type { PlanObjetivo } from "../lib/types";
import { cn } from "@/lib/utils";

const ESTADO_UI: Record<
  PlanObjetivo["estado"],
  { label: string; className: string }
> = {
  abierto: {
    label: "Abierto",
    className: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
  },
  cumplido: {
    label: "Cumplido",
    className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
};

export function ObjetivoCard({
  mes,
  objetivo,
  can_write = true,
}: {
  mes: string;
  objetivo: PlanObjetivo;
  can_write?: boolean;
}) {
  const apps = objetivo.app_nombre
    ? objetivo.app_nombre.split(" · ").filter(Boolean)
    : [];

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                ESTADO_UI[objetivo.estado].className,
              )}
            >
              {ESTADO_UI[objetivo.estado].label}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {format_month_label(objetivo.fecha_inicio.slice(0, 7))}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
            {objetivo.titulo}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Avance
          </p>
          <p className="text-3xl font-bold tabular-nums leading-none text-slate-900">
            {objetivo.avance}%
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 px-5">
        {apps.length === 0 ? (
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
            Transversal
          </span>
        ) : (
          apps.map((name) => (
            <span
              key={name}
              className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800 ring-1 ring-violet-100"
            >
              {name}
            </span>
          ))
        )}
        <span className="ml-auto inline-flex items-center gap-2 text-xs text-slate-500">
          <span className="text-slate-400">Solicitado por</span>
          {objetivo.solicitado_por ? (
            <PlanAssigneeChip person={objetivo.solicitado_por} />
          ) : (
            <span className="font-medium text-slate-400">—</span>
          )}
        </span>
      </div>
      {objetivo.creado_por &&
      objetivo.solicitado_por &&
      objetivo.creado_por.usuario_id !== objetivo.solicitado_por.usuario_id ? (
        <p className="px-5 pt-2 text-[11px] text-slate-400">
          Lo registró {objetivo.creado_por.nombre} a nombre de{" "}
          {objetivo.solicitado_por.nombre}.
        </p>
      ) : null}
      {objetivo.responsables.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-5 pt-2">
          <span className="text-[11px] text-slate-400">Lo cubre TED</span>
          <PlanAssigneeStack people={objetivo.responsables} max={4} />
        </div>
      ) : null}

      {objetivo.descripcion ? (
        <div className="mx-5 mt-4 rounded-xl bg-slate-50 px-4 py-3">
          <ObjetivoDescripcion text={objetivo.descripcion} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-3">
        <p className="text-xs font-medium text-slate-500">
          {objetivo.tarea_count}{" "}
          {objetivo.tarea_count === 1 ? "tarea" : "tareas"}
        </p>
        <Link
          href={`/ted/planificacion/cubrir?mes=${mes}`}
          className="text-xs font-semibold text-violet-700 hover:underline"
        >
          Ver en Cubrir
        </Link>
        {can_write ? (
          <Link
            href={`/ted/planificacion/objetivos/${objetivo.id}/editar`}
            className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Editar
          </Link>
        ) : null}
      </div>
    </article>
  );
}
