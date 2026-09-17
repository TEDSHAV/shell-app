"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/features/planificacion/components/search-select";
import { PLAN_TRIMESTRES } from "@/features/planificacion/schemas";
import type { PlanTrimestre, PlanUsuarioOption } from "@/features/planificacion/lib/types";
import {
  assign_ticket,
  promote_ticket,
  reply_ticket,
} from "../actions/ticket-actions";
import { ESTADO_LABEL, PRIORIDAD_LABEL } from "../lib/labels";
import type { TicketEstado, TicketPrioridad, TicketRow } from "../lib/types";

export function TedTicketsInbox({
  tickets,
  usuarios,
}: {
  tickets: TicketRow[];
  usuarios: PlanUsuarioOption[];
}) {
  const router = useRouter();
  const [origen, set_origen] = useState<"Todos" | "nativo" | "plan">("Todos");
  const [estado, set_estado] = useState<TicketEstado | "Todos">("Todos");
  const [prio, set_prio] = useState<TicketPrioridad | "Todos">("Todos");
  const [open, set_open] = useState<TicketRow | null>(null);
  const [respuesta, set_respuesta] = useState("");
  const [asig, set_asig] = useState("");
  const [colab, set_colab] = useState("");
  const [trim, set_trim] = useState<PlanTrimestre | "">("");
  const [error, set_error] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        if (origen !== "Todos" && (t.source ?? "nativo") !== origen) {
          return false;
        }
        if (estado !== "Todos" && t.estado !== estado) return false;
        if (prio !== "Todos" && t.prioridad !== prio) return false;
        return true;
      }),
    [tickets, estado, prio, origen],
  );

  function refresh() {
    router.refresh();
  }

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    start(async () => {
      set_error(null);
      const result = await fn();
      if (!result.ok) {
        set_error(result.error);
        return;
      }
      set_open(null);
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["Todos", "Todos"],
            ["nativo", "Nativos"],
            ["plan", "Del plan"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => set_origen(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              origen === id
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
        <select
          className="ml-auto h-9 rounded-full border-0 bg-white px-3 text-sm shadow-sm ring-1 ring-slate-200"
          value={estado}
          onChange={(e) => set_estado(e.target.value as TicketEstado | "Todos")}
        >
          <option value="Todos">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-full border-0 bg-white px-3 text-sm shadow-sm ring-1 ring-slate-200"
          value={prio}
          onChange={(e) => set_prio(e.target.value as TicketPrioridad | "Todos")}
        >
          <option value="Todos">Prioridad</option>
          {Object.entries(PRIORIDAD_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {filtered.map((ticket) => (
          <button
            key={`${ticket.source ?? "nativo"}-${ticket.id}`}
            type="button"
            onClick={() => {
              set_open(ticket);
              set_respuesta(ticket.respuesta ?? "");
              set_asig(ticket.asignado_id ? String(ticket.asignado_id) : "");
              set_colab(ticket.colaborador_ids[0] ? String(ticket.colaborador_ids[0]) : "");
              set_error(null);
            }}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-md"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-slate-900">
                {ticket.app_nombre}
              </p>
              <p className="truncate text-xs font-semibold text-violet-700">
                {ticket.modulo_nombre}
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">{ticket.titulo}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                {ESTADO_LABEL[ticket.estado]}
              </span>
              {ticket.source === "plan" ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-violet-600">
                  Plan · TICKET
                </span>
              ) : (
                <span className="text-slate-400">{PRIORIDAD_LABEL[ticket.prioridad]}</span>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
            No hay tickets en este filtro.
          </p>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Cerrar"
            onClick={() => set_open(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">{open.titulo}</h2>
            <p className="text-[15px] font-semibold text-slate-800">
              {open.app_nombre}
            </p>
            <p className="text-xs font-semibold text-violet-700">
              {open.modulo_nombre}
            </p>
            {open.source === "plan" ? (
              <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-800">
                Tarea ya cargada en el plan con origen TICKET
                {typeof open.avance === "number" ? ` · ${open.avance}%` : ""}.
              </p>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                {open.descripcion}
              </p>
            )}
            {open.source !== "plan" ? (
            <div>
            <div className="mt-4 space-y-2">
              <Label>Asignado</Label>
              <SearchSelect
                value={asig}
                onChange={set_asig}
                placeholder="Persona"
                options={usuarios.map((u) => ({
                  value: String(u.id),
                  label: u.label,
                }))}
              />
              <Label>Colaborador</Label>
              <SearchSelect
                value={colab}
                onChange={set_colab}
                placeholder="Opcional"
                options={[
                  { value: "", label: "Ninguno" },
                  ...usuarios.map((u) => ({
                    value: String(u.id),
                    label: u.label,
                  })),
                ]}
              />
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    assign_ticket({
                      ticket_id: open.id,
                      asignado_id: asig ? Number(asig) : null,
                      colaborador_ids: colab ? [Number(colab)] : [],
                    }),
                  )
                }
              >
                Guardar asignación
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Respuesta</Label>
              <Textarea
                value={respuesta}
                onChange={(e) => set_respuesta(e.target.value)}
                rows={4}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      reply_ticket({
                        ticket_id: open.id,
                        estado: "cerrado",
                        respuesta,
                      }),
                    )
                  }
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      reply_ticket({
                        ticket_id: open.id,
                        estado: "no_procede",
                        respuesta,
                      }),
                    )
                  }
                >
                  No procede
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      reply_ticket({
                        ticket_id: open.id,
                        estado: "en_curso",
                        respuesta,
                      }),
                    )
                  }
                >
                  En curso
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Pasar a planificación</Label>
              <select
                className="flex h-9 w-full rounded-md border px-3 text-sm"
                value={trim}
                onChange={(e) => set_trim(e.target.value as PlanTrimestre | "")}
              >
                <option value="">Sin trimestre</option>
                {PLAN_TRIMESTRES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                className="bg-violet-600 text-white hover:bg-violet-500"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    promote_ticket({
                      ticket_id: open.id,
                      trimestre: trim || null,
                    }),
                  )
                }
              >
                Promover a Prisma
              </Button>
            </div>
            </div>
            ) : null}
            {open.eventos.length > 0 ? (
              <ul className="mt-4 space-y-1 border-t pt-3 text-xs text-slate-500">
                {open.eventos.map((evento) => (
                  <li key={evento.id}>
                    {new Date(evento.created_at).toLocaleString("es-VE")} ·{" "}
                    {evento.estado ?? "nota"} · {evento.nota}
                  </li>
                ))}
              </ul>
            ) : null}
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
