"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlanAppPicker } from "./plan-app-picker";
import { PlanField, PLAN_INPUT_CLASS } from "./plan-form-ui";
import { SearchSelect } from "./search-select";
import {
  delete_plan_objetivo,
  save_plan_objetivo,
} from "../actions/objetivo-actions";
import { format_month_label } from "../lib/plan-month";
import type { PlanObjetivoEstado, PlanUsuarioOption } from "../lib/types";
import { cn } from "@/lib/utils";

const ESTADOS: Array<{ value: PlanObjetivoEstado; label: string }> = [
  { value: "abierto", label: "Abierto" },
  { value: "cumplido", label: "Cumplido" },
  { value: "cancelado", label: "Cancelado" },
];

export function ObjetivoForm({
  mes,
  apps,
  usuarios,
  objetivo,
}: {
  mes: string;
  apps: Array<{ id: number; nombre: string; slug: string }>;
  usuarios: PlanUsuarioOption[];
  objetivo: {
    id: number;
    titulo: string;
    descripcion: string | null;
    fecha_inicio: string;
    fecha_fin: string;
    app_id: number | null;
    app_ids: number[];
    estado: PlanObjetivoEstado;
    solicitado_por: number | null;
  } | null;
}) {
  const router = useRouter();
  const back = `/ted/planificacion/objetivos?mes=${mes}`;
  const [titulo, set_titulo] = useState(objetivo?.titulo ?? "");
  const [descripcion, set_descripcion] = useState(objetivo?.descripcion ?? "");
  const [app_ids, set_app_ids] = useState<number[]>(objetivo?.app_ids ?? []);
  const [estado, set_estado] = useState<PlanObjetivoEstado>(
    objetivo?.estado ?? "abierto",
  );
  const [solicitado_por, set_solicitado_por] = useState(
    objetivo?.solicitado_por ? String(objetivo.solicitado_por) : "",
  );
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);

  async function on_submit(event: React.FormEvent) {
    event.preventDefault();
    set_saving(true);
    set_error(null);
    const result = await save_plan_objetivo({
      id: objetivo?.id,
      titulo,
      descripcion: descripcion || null,
      mes,
      app_ids,
      estado,
      solicitado_por: solicitado_por ? Number(solicitado_por) : null,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    router.push(back);
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void on_submit(event)}
      className="mx-auto w-full max-w-4xl space-y-6 px-6 pb-16 pt-4"
    >
      <Link
        href={back}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a objetivos
      </Link>

      <div className="rounded-[28px] border border-violet-100 bg-white shadow-[0_16px_48px_rgba(76,29,149,0.08)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 px-8 py-8 text-white">
          <Target className="absolute -right-3 -top-3 h-32 w-32 text-white/10" />
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
            Periodo · {format_month_label(mes)}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {objetivo ? "Editar objetivo" : "Plantear objetivo"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-violet-100/90">
            Describe el compromiso de {format_month_label(mes)}. Si lo cargas a
            nombre de quien lo pidió, queda como solicitante; tú figurarás como
            quien lo registró.
          </p>
        </div>

        <div className="grid gap-8 p-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <PlanField label="Título" htmlFor="obj-titulo">
              <Input
                id="obj-titulo"
                required
                className={PLAN_INPUT_CLASS}
                value={titulo}
                onChange={(event) => set_titulo(event.target.value)}
                placeholder="Qué hay que lograr"
              />
            </PlanField>
            <PlanField
              label="Descripción"
              htmlFor="obj-desc"
              hint="Contexto, criterio de éxito o restricciones"
            >
              <Textarea
                id="obj-desc"
                value={descripcion}
                onChange={(event) => set_descripcion(event.target.value)}
                rows={8}
                placeholder="Cómo se va a medir y qué queda fuera"
                className="min-h-[180px] rounded-xl border-slate-200 bg-slate-50"
              />
            </PlanField>
          </div>

          <div className="space-y-5 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-600">
              Este objetivo queda en{" "}
              <span className="font-semibold text-slate-900">
                {format_month_label(mes)}
              </span>
              .
            </p>
            <PlanField
              label="Solicitado por"
              hint="Quién de gerencia pidió este compromiso. Vacío = tú."
            >
              <SearchSelect
                value={solicitado_por}
                placeholder="Quién lo solicitó"
                searchPlaceholder="Buscar persona…"
                onChange={set_solicitado_por}
                options={[
                  { value: "", label: "Yo (quien registra)" },
                  ...usuarios.map((user) => ({
                    value: String(user.id),
                    label: user.label,
                  })),
                ]}
              />
            </PlanField>
            <PlanField
              label="App"
              hint="Elige una o varias. Vacío = transversal"
            >
              <PlanAppPicker
                apps={apps}
                value={app_ids}
                onChange={set_app_ids}
              />
            </PlanField>
            {objetivo ? (
              <PlanField label="Estado">
                <div className="grid grid-cols-3 gap-2">
                  {ESTADOS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => set_estado(item.value)}
                      className={cn(
                        "rounded-xl px-2 py-2 text-xs font-bold",
                        estado === item.value
                          ? "bg-violet-700 text-white"
                          : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </PlanField>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-8 py-5">
          {objetivo ? (
            <Button
              type="button"
              variant="outline"
              className="mr-auto border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                void (async () => {
                  const ok = window.confirm("¿Eliminar este objetivo?");
                  if (!ok) return;
                  const result = await delete_plan_objetivo(objetivo.id);
                  if (!result.ok) {
                    set_error(result.error);
                    return;
                  }
                  router.push(back);
                  router.refresh();
                })();
              }}
            >
              Eliminar
            </Button>
          ) : (
            <span className="mr-auto" />
          )}
          <Button type="button" variant="outline" asChild>
            <Link href={back}>Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="rounded-full bg-violet-700 px-6 text-white hover:bg-violet-600"
          >
            {saving ? "Guardando…" : objetivo ? "Guardar cambios" : "Plantear"}
          </Button>
        </div>
        {error ? (
          <p className="px-8 pb-5 text-sm text-red-600">{error}</p>
        ) : null}
      </div>
    </form>
  );
}
