"use client";

import { useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/features/planificacion/components/search-select";
import { PlanField } from "@/features/planificacion/components/plan-form-ui";
import { create_ticket } from "../actions/ticket-actions";
import { TICKET_PRIORIDADES } from "../schemas";
import { PRIORIDAD_LABEL } from "../lib/labels";
import { PRIORIDAD_TONE } from "../lib/ticket-display";
import type { TicketCatalog } from "../lib/types";
import { cn } from "@/lib/utils";

export function TicketForm({ catalog }: { catalog: TicketCatalog }) {
  const router = useRouter();
  const [app_id, set_app_id] = useState(String(catalog.apps[0]?.id ?? ""));
  const [modulo_id, set_modulo_id] = useState("");
  const [titulo, set_titulo] = useState("");
  const [descripcion, set_descripcion] = useState("");
  const [prioridad, set_prioridad] = useState<(typeof TICKET_PRIORIDADES)[number]>(
    "media",
  );
  const [solicitado_por, set_solicitado_por] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const modulos = useMemo(
    () => catalog.modulos.filter((m) => String(m.app_id) === app_id),
    [catalog.modulos, app_id],
  );

  function on_submit(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      set_error(null);
      const result = await create_ticket({
        titulo,
        descripcion,
        app_id: Number(app_id),
        modulo_id: modulo_id ? Number(modulo_id) : null,
        prioridad,
        solicitado_por:
          catalog.is_ted && solicitado_por ? Number(solicitado_por) : undefined,
      });
      if (!result.ok) {
        set_error(result.error);
        return;
      }
      router.push(catalog.is_ted ? "/ted/planificacion/tickets" : "/tickets/mios");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={on_submit}
      className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-[0_12px_40px_rgba(76,29,149,0.08)]"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 px-7 py-6 text-white">
        <Sparkles className="absolute -right-4 -top-4 h-28 w-28 text-white/10" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
          Prisma · TED
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Nuevo ticket
        </h1>
        <p className="mt-1.5 max-w-md text-sm text-violet-100/90">
          {catalog.is_ted
            ? "Si lo cargas a nombre de alguien más, esa persona lo verá en Mis tickets y recibirá la respuesta."
            : "Cuéntanos el requerimiento o el error. TED asigna y responde; tú solo describes el caso."}
        </p>
      </div>
      <div className="space-y-5 p-7">
        {catalog.is_ted ? (
          <PlanField
            label="Solicitado por"
            hint="La notificación de cierre llega a esta persona. Quedará marcado como registro TED."
          >
            <SearchSelect
              value={solicitado_por}
              placeholder="Quién hizo el requerimiento"
              searchPlaceholder="Buscar persona…"
              onChange={set_solicitado_por}
              options={[
                { value: "", label: "Yo (TED)" },
                ...catalog.usuarios.map((u) => ({
                  value: String(u.id),
                  label: u.label,
                })),
              ]}
            />
          </PlanField>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <PlanField label="App">
            <SearchSelect
              value={app_id}
              placeholder="Buscar app"
              searchPlaceholder="Buscar app…"
              onChange={(next) => {
                set_app_id(next);
                set_modulo_id("");
              }}
              options={catalog.apps.map((app) => ({
                value: String(app.id),
                label: app.nombre,
              }))}
            />
          </PlanField>
          <PlanField label="Módulo">
            <SearchSelect
              value={modulo_id}
              placeholder="Buscar módulo (vacío = GENERAL)"
              searchPlaceholder="Buscar módulo…"
              onChange={set_modulo_id}
              options={[
                { value: "", label: "GENERAL (si no encaja otro)" },
                ...modulos.map((m) => ({
                  value: String(m.id),
                  label: m.nombre,
                })),
              ]}
            />
          </PlanField>
        </div>
        <PlanField label="Título" htmlFor="tic-tit">
          <Input
            id="tic-tit"
            value={titulo}
            onChange={(e) => set_titulo(e.target.value)}
            required
            placeholder="Qué hay que resolver"
            className="h-11 rounded-xl border-slate-200 bg-slate-50"
          />
        </PlanField>
        <PlanField label="Detalle / comportamiento esperado" htmlFor="tic-des">
          <Textarea
            id="tic-des"
            value={descripcion}
            onChange={(e) => set_descripcion(e.target.value)}
            required
            rows={5}
            placeholder="Contexto, pasos y qué debería pasar"
            className="rounded-xl border-slate-200 bg-slate-50"
          />
        </PlanField>
        <PlanField label="Prioridad">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TICKET_PRIORIDADES.map((item) => {
              const active = prioridad === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => set_prioridad(item)}
                  className={cn(
                    "rounded-xl px-2 py-2 text-xs font-bold transition",
                    active
                      ? PRIORIDAD_TONE[item].chip
                      : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-white",
                  )}
                >
                  {PRIORIDAD_LABEL[item]}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Alta bloquea operación · Media hay alternativa · Baja es mejora
          </p>
        </PlanField>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-full bg-violet-700 text-sm font-semibold text-white hover:bg-violet-600"
        >
          {pending ? "Enviando…" : "Enviar ticket"}
        </Button>
      </div>
    </form>
  );
}
