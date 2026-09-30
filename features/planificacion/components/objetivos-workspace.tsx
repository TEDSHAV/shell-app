"use client";

import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanMonthPicker } from "./plan-month-picker";
import { ObjetivoCard } from "./objetivo-card";
import { ObjetivoEditCard } from "./objetivo-edit-card";
import { EmitirPlanButton } from "./emitir-plan-button";
import { PlanMesBadge } from "./plan-mes-badge";
import { format_month_label } from "../lib/plan-month";
import { is_plan_mes_emitido, type PlanMes } from "../lib/plan-mes";
import { use_plan_editor } from "../hooks/use-plan-editor";
import type { PlanAppPickerItem } from "./plan-app-picker";
import type { PlanObjetivo, PlanUsuarioOption } from "../lib/types";

export function ObjetivosWorkspace({
  mes,
  plan_mes,
  objetivos,
  apps,
  usuarios,
  can_write = true,
}: {
  mes: string;
  plan_mes: PlanMes;
  objetivos: PlanObjetivo[];
  apps: PlanAppPickerItem[];
  usuarios: PlanUsuarioOption[];
  can_write?: boolean;
}) {
  const emitido = is_plan_mes_emitido(plan_mes);
  const editor = use_plan_editor(objetivos, mes);

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
            {editor.editing
              ? "Edición del plan. Los avisos salen al pulsar Actualizar plan."
              : emitido
                ? "Plan emitido. Para cambiar objetivos, edita el plan completo."
                : "Borrador: plantea el periodo y emite el plan para que TED cubra."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editor.editing ? null : <PlanMonthPicker mes={mes} />}
          {can_write && editor.editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={editor.busy}
                onClick={editor.cancel}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!editor.dirty || editor.busy}
                className="rounded-full bg-violet-700 px-4 text-white hover:bg-violet-600 disabled:opacity-40"
                onClick={() => {
                  void editor.commit();
                }}
              >
                {editor.busy ? "Guardando…" : "Actualizar plan"}
              </Button>
            </>
          ) : null}
          {can_write && !editor.editing ? (
            <Button
              type="button"
              className="rounded-full bg-slate-900 px-4 text-white hover:bg-slate-800"
              onClick={editor.start}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Editar plan
            </Button>
          ) : null}
          {can_write && !emitido && !editor.editing ? (
            <EmitirPlanButton mes={mes} />
          ) : null}
        </div>
      </div>

      {editor.error ? (
        <p className="text-sm text-red-600">{editor.error}</p>
      ) : null}

      {editor.editing ? (
        <div className="space-y-4">
          {editor.drafts.map((draft) => (
            <ObjetivoEditCard
              key={draft.key}
              draft={draft}
              apps={apps}
              usuarios={usuarios}
              onChange={(patch) => editor.patch(draft.key, patch)}
              onRemove={() => editor.remove(draft.key)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={editor.add}
          >
            <Plus className="mr-1 h-4 w-4" />
            Añadir objetivo
          </Button>
        </div>
      ) : objetivos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No hay objetivos en este mes
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Edita el plan para plantear el compromiso del periodo.
          </p>
          {can_write ? (
            <Button
              type="button"
              className="mt-4 rounded-full bg-violet-600 text-white hover:bg-violet-500"
              onClick={editor.start}
            >
              Editar plan
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
              can_write={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
