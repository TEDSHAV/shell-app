"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanMonthPicker } from "./plan-month-picker";
import { ObjetivoCard } from "./objetivo-card";
import { EmitirPlanButton } from "./emitir-plan-button";
import { PlanMesBadge } from "./plan-mes-badge";
import { format_month_label } from "../lib/plan-month";
import { is_plan_mes_emitido, type PlanMes } from "../lib/plan-mes";
import type { PlanObjetivo } from "../lib/types";

export function ObjetivosWorkspace({
  mes,
  plan_mes,
  objetivos,
  can_write = true,
}: {
  mes: string;
  plan_mes: PlanMes;
  objetivos: PlanObjetivo[];
  can_write?: boolean;
}) {
  const nuevo = `/ted/planificacion/objetivos/nuevo?mes=${mes}`;
  const emitido = is_plan_mes_emitido(plan_mes);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
              Plan de {format_month_label(mes)}
            </h1>
            <PlanMesBadge plan={plan_mes} />
          </div>
          <p className="mt-0.5 text-sm text-slate-400">
            {emitido
              ? "Plan emitido. Alta, baja o edición avisa a TED."
              : "Borrador: plantea objetivos y emite el plan para que TED cubra."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlanMonthPicker mes={mes} />
          {can_write ? (
            <Button
              asChild
              className="rounded-full bg-slate-900 px-4 text-white hover:bg-slate-800"
            >
              <Link href={nuevo}>
                <Plus className="mr-1 h-4 w-4" />
                Plantear objetivo
              </Link>
            </Button>
          ) : null}
          {can_write && !emitido ? <EmitirPlanButton mes={mes} /> : null}
        </div>
      </div>

      {objetivos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No hay objetivos en este mes
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Plantea el compromiso del periodo y luego emite el plan.
          </p>
          {can_write ? (
            <Button
              asChild
              className="mt-4 rounded-full bg-violet-600 text-white hover:bg-violet-500"
            >
              <Link href={nuevo}>Plantear objetivo del mes</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4">
          {objetivos.map((objetivo) => (
            <ObjetivoCard
              key={objetivo.id}
              mes={mes}
              objetivo={objetivo}
              can_write={can_write}
            />
          ))}
        </div>
      )}
    </div>
  );
}
