"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanMonthPicker } from "./plan-month-picker";
import { ObjetivoFormDialog } from "./objetivo-form-dialog";
import { format_objetivo_date } from "../lib/display";
import type { PlanObjetivo } from "../lib/types";

const ESTADO_LABEL: Record<PlanObjetivo["estado"], string> = {
  abierto: "Abierto",
  cumplido: "Cumplido",
  cancelado: "Cancelado",
};

export function ObjetivosWorkspace({
  mes,
  objetivos,
  apps,
  can_write = true,
}: {
  mes: string;
  objetivos: PlanObjetivo[];
  apps: Array<{ id: number; nombre: string }>;
  can_write?: boolean;
}) {
  const router = useRouter();
  const [open, set_open] = useState(false);
  const [editing, set_editing] = useState<PlanObjetivo | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
            Objetivos
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Qué hay que lograr en este periodo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlanMonthPicker mes={mes} />
          {can_write ? (
            <Button
              type="button"
              className="rounded-full bg-slate-900 px-4 text-white hover:bg-slate-800"
              onClick={() => {
                set_editing(null);
                set_open(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Plantear objetivo
            </Button>
          ) : null}
        </div>
      </div>

      {objetivos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No hay objetivos en este mes
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Plantea el compromiso del periodo para que TED pueda cubrirlo.
          </p>
          {can_write ? (
            <Button
              type="button"
              className="mt-4 rounded-full bg-violet-600 text-white hover:bg-violet-500"
              onClick={() => {
                set_editing(null);
                set_open(true);
              }}
            >
              Plantear objetivo del mes
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          {objetivos.map((objetivo) => (
            <article
              key={objetivo.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">
                    {objetivo.titulo}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {format_objetivo_date(objetivo.fecha_inicio)} –{" "}
                    {format_objetivo_date(objetivo.fecha_fin)}
                    {objetivo.app_nombre ? ` · ${objetivo.app_nombre}` : ""}
                  </p>
                  {objetivo.descripcion ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {objetivo.descripcion}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {ESTADO_LABEL[objetivo.estado]}
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-slate-900">
                    {objetivo.avance}%
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
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
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    onClick={() => {
                      set_editing(objetivo);
                      set_open(true);
                    }}
                  >
                    Editar
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {open ? (
        <ObjetivoFormDialog
          key={editing?.id ?? "new"}
          open
          mes={mes}
          apps={apps}
          objetivo={editing}
          onClose={() => set_open(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
