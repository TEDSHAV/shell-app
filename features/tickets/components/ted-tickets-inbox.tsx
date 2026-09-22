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
import { TimeFilterControl } from "@/components/time-filter-control";
import { SortControl } from "@/components/sort-control";
import { format_ve_datetime } from "@/lib/date-range";
import {
  compare_time,
  type TimeOrder,
} from "@/lib/date-range";
import {
  DEFAULT_TIME_FILTER,
  stamp_for_date_field,
  stamp_in_time_filter,
  type DateField,
  type SortDir,
  type TimeFilterValue,
} from "@/lib/list-time-period";

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
  const [time, set_time] = useState<TimeFilterValue>(DEFAULT_TIME_FILTER);
  const [date_field, set_date_field] = useState<DateField>("created");
  const [sort_dir, set_sort_dir] = useState<SortDir>("desc");
  const [open, set_open] = useState<TicketRow | null>(null);
  const [respuesta, set_respuesta] = useState("");
  const [asig, set_asig] = useState("");
  const [colab, set_colab] = useState("");
  const [trim, set_trim] = useState<PlanTrimestre | "">("");
  const [error, set_error] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const order: TimeOrder = sort_dir === "asc" ? "oldest" : "newest";
    const rows = tickets.filter((t) => {
      if (origen !== "Todos" && (t.source ?? "nativo") !== origen) {
        return false;
      }
      if (estado !== "Todos" && t.estado !== estado) return false;
      if (prio !== "Todos" && t.prioridad !== prio) return false;
      const stamp = stamp_for_date_field(date_field, t);
      if (!stamp_in_time_filter(stamp, time)) return false;
      return true;
    });
    return [...rows].sort((a, b) =>
      compare_time(
        stamp_for_date_field(date_field, a),
        stamp_for_date_field(date_field, b),
        order,
      ),
    );
  }, [tickets, estado, prio, origen, time, date_field, sort_dir]);

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
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600"
          value={origen}
          onChange={(e) =>
            set_origen(e.target.value as "Todos" | "nativo" | "plan")
          }
        >
          <option value="Todos">Todos</option>
          <option value="nativo">Nativos</option>
          <option value="plan">Del plan</option>
        </select>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600"
          value={estado}
          onChange={(e) => set_estado(e.target.value as TicketEstado | "Todos")}
        >
          <option value="Todos">Estado</option>
          {Object.entries(ESTADO_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600"
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
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <TimeFilterControl value={time} on_change={set_time} />
          <SortControl
            field={date_field}
            dir={sort_dir}
            on_field={set_date_field}
            on_dir={set_sort_dir}
            fields={["created", "updated"]}
          />
        </div>
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
              <p className="mt-0.5 truncate text-xs text-slate-400">
                Solicitó {ticket.solicitante}
                {ticket.created_at
                  ? ` · ${format_ve_datetime(ticket.created_at)}`
                  : ""}
              </p>
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            aria-label="Cerrar"
            onClick={() => set_open(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">{open.titulo}</h2>
            <p className="text-[15px] font-semibold text-slate-800">
              {open.app_nombre}
            </p>
            <p className="text-xs text-slate-500">
              Solicitó {open.solicitante}
              {open.created_at ? ` · ${format_ve_datetime(open.created_at)}` : ""}
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
