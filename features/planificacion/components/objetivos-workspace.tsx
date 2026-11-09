"use client";

import { useState } from "react";
import { ListOrdered, Pencil, Plus, Settings, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlanMonthPicker } from "./plan-month-picker";
import { ObjetivoCard } from "./objetivo-card";
import { ObjetivoEditCard } from "./objetivo-edit-card";
import { ObjetivoOrdenMini } from "./objetivo-orden-mini";
import { EmitirPlanButton } from "./emitir-plan-button";
import { PlanMesBadge } from "./plan-mes-badge";
import { format_month_label } from "../lib/plan-month";
import { is_plan_mes_emitido, type PlanMes } from "../lib/plan-mes";
import { use_plan_editor } from "../hooks/use-plan-editor";
import { move_drafts } from "../lib/objetivo-draft";
import { reorder_plan_objetivos } from "../actions/commit-plan-actions";
import type { PlanAppPickerItem } from "./plan-app-picker";
import type { PlanObjetivo, PlanUsuarioOption } from "../lib/types";

export function ObjetivosWorkspace({
  mes,
  plan_mes,
  objetivos,
  apps,
  usuarios,
  can_write = true,
  show_mail_config = false,
}: {
  mes: string;
  plan_mes: PlanMes;
  objetivos: PlanObjetivo[];
  apps: PlanAppPickerItem[];
  usuarios: PlanUsuarioOption[];
  can_write?: boolean;
  show_mail_config?: boolean;
}) {
  const router = useRouter();
  const emitido = is_plan_mes_emitido(plan_mes);
  const editor = use_plan_editor(objetivos, mes);
  const [sorting, set_sorting] = useState(false);
  const [sort_list, set_sort_list] = useState<PlanObjetivo[]>([]);
  const [sort_busy, set_sort_busy] = useState(false);
  const [sort_error, set_sort_error] = useState<string | null>(null);

  function start_sort() {
    set_sort_list(objetivos);
    set_sort_error(null);
    set_sorting(true);
  }

  function cancel_sort() {
    set_sorting(false);
    set_sort_list([]);
    set_sort_error(null);
  }

  async function save_sort() {
    if (sort_busy) return;
    set_sort_busy(true);
    set_sort_error(null);
    const result = await reorder_plan_objetivos({
      mes,
      ids: sort_list.map((item) => item.id),
    });
    set_sort_busy(false);
    if (!result.ok) {
      set_sort_error(result.error);
      return;
    }
    set_sorting(false);
    router.refresh();
  }

  const hint = editor.editing
    ? emitido
      ? "Edición del plan emitido. Actualizar plan avisa solo si cambias títulos, descripción, apps o bajas. El orden no envía alerta."
      : "Borrador: guarda objetivos sin emitir ni avisar. Cuando estén listos, emite el plan."
    : sorting
      ? "Solo cambias el orden. No se envía alerta de actualización."
      : emitido
        ? "Plan emitido. Puedes reordenar sin alerta, o editar el plan completo."
        : "Borrador: plantea objetivos, gárdalos y emite el plan cuando esté seguro para que TED cubra.";

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
          <p className="mt-0.5 max-w-2xl text-sm text-slate-400">{hint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {show_mail_config && !editor.editing && !sorting ? (
            <Button variant="outline" className="rounded-full" asChild>
              <Link href="/ted/planificacion/objetivos/configuracion">
                <Settings className="mr-1 h-4 w-4" />
                Correos
              </Link>
            </Button>
          ) : null}
          {editor.editing || sorting ? null : <PlanMonthPicker mes={mes} />}
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
                {editor.busy
                  ? "Guardando…"
                  : emitido
                    ? "Actualizar plan"
                    : "Guardar borrador"}
              </Button>
            </>
          ) : null}
          {can_write && sorting ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={sort_busy}
                onClick={cancel_sort}
              >
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={sort_busy}
                className="rounded-full bg-slate-900 px-4 text-white hover:bg-slate-800"
                onClick={() => {
                  void save_sort();
                }}
              >
                {sort_busy ? "Guardando…" : "Guardar orden"}
              </Button>
            </>
          ) : null}
          {can_write && !editor.editing && !sorting ? (
            <>
              {objetivos.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={start_sort}
                >
                  <ListOrdered className="mr-1 h-4 w-4" />
                  Ordenar
                </Button>
              ) : null}
              <Button
                type="button"
                className="rounded-full bg-slate-900 px-4 text-white hover:bg-slate-800"
                onClick={editor.start}
              >
                <Pencil className="mr-1 h-4 w-4" />
                {objetivos.length === 0 ? "Crear plan" : "Editar plan"}
              </Button>
            </>
          ) : null}
          {can_write && !emitido && !editor.editing && !sorting ? (
            <EmitirPlanButton mes={mes} disabled={objetivos.length === 0} />
          ) : null}
        </div>
      </div>

      {editor.error ? (
        <p className="text-sm text-red-600">{editor.error}</p>
      ) : null}
      {sort_error ? <p className="text-sm text-red-600">{sort_error}</p> : null}

      {editor.editing ? (
        <div className="lg:grid lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-4">
          <div className="mb-4 lg:sticky lg:top-24 lg:mb-0">
            <ObjetivoOrdenMini
              items={editor.drafts.map((draft) => ({
                key: draft.key,
                titulo: draft.titulo,
              }))}
              onReorder={editor.move}
            />
          </div>
          <div className="space-y-4">
            {editor.drafts.map((draft, index) => (
              <ObjetivoEditCard
                key={draft.key}
                draft={draft}
                apps={apps}
                usuarios={usuarios}
                numero={index + 1}
                index={index}
                onChange={(patch) => editor.patch(draft.key, patch)}
                onRemove={() => editor.remove(draft.key)}
                onMove={editor.move}
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
        </div>
      ) : sorting ? (
        <div className="lg:grid lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-4">
          <div className="mb-4 lg:sticky lg:top-24 lg:mb-0">
            <ObjetivoOrdenMini
              items={sort_list.map((item) => ({
                key: String(item.id),
                titulo: item.titulo,
              }))}
              onReorder={(from, to) =>
                set_sort_list((current) => move_drafts(current, from, to))
              }
            />
          </div>
          <div className="grid gap-4">
            {sort_list.map((objetivo, index) => (
              <ObjetivoCard
                key={objetivo.id}
                mes={mes}
                objetivo={{ ...objetivo, orden: index + 1 }}
                can_write={false}
              />
            ))}
          </div>
        </div>
      ) : objetivos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Borrador vacío
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Crea objetivos y gárdalos como borrador. TED no cubre hasta que
            emitas el plan.
          </p>
          {can_write ? (
            <Button
              type="button"
              className="mt-4 rounded-full bg-violet-600 text-white hover:bg-violet-500"
              onClick={editor.start}
            >
              Crear plan
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
