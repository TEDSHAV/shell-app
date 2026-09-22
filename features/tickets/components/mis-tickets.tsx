"use client";

import { useMemo, useState } from "react";
import { SortControl } from "@/components/sort-control";
import { TimeFilterControl } from "@/components/time-filter-control";
import { compare_time, format_ve_datetime, type TimeOrder } from "@/lib/date-range";
import {
  DEFAULT_TIME_FILTER,
  stamp_for_date_field,
  stamp_in_time_filter,
  type DateField,
  type SortDir,
  type TimeFilterValue,
} from "@/lib/list-time-period";
import { ESTADO_LABEL, PRIORIDAD_LABEL } from "../lib/labels";
import type { TicketQueueItem, TicketRow } from "../lib/types";

export function MisTicketsList({
  tickets,
  queues,
}: {
  tickets: TicketRow[];
  queues: Record<number, TicketQueueItem[]>;
}) {
  const [time, set_time] = useState<TimeFilterValue>(DEFAULT_TIME_FILTER);
  const [date_field, set_date_field] = useState<DateField>("created");
  const [sort_dir, set_sort_dir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const order: TimeOrder = sort_dir === "asc" ? "oldest" : "newest";
    const rows = tickets.filter((ticket) =>
      stamp_in_time_filter(stamp_for_date_field(date_field, ticket), time),
    );
    return [...rows].sort((a, b) =>
      compare_time(
        stamp_for_date_field(date_field, a),
        stamp_for_date_field(date_field, b),
        order,
      ),
    );
  }, [tickets, time, date_field, sort_dir]);

  if (tickets.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
        Aún no has enviado tickets.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <TimeFilterControl value={time} on_change={set_time} />
        <SortControl
          field={date_field}
          dir={sort_dir}
          on_field={set_date_field}
          on_dir={set_sort_dir}
          fields={["created", "updated"]}
        />
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
          No hay tickets en ese período.
        </p>
      ) : null}
      {filtered.map((ticket) => {
        const cola = ticket.modulo_id
          ? (queues[ticket.modulo_id] ?? []).filter((item) => item.id !== ticket.id)
          : [];
        const pos =
          ticket.modulo_id &&
          (queues[ticket.modulo_id] ?? []).findIndex((item) => item.id === ticket.id);
        return (
          <article
            key={ticket.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{ticket.titulo}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {ticket.app_nombre} · {ticket.modulo_nombre}
                  {typeof pos === "number" && pos >= 0 ? ` · posición ${pos + 1} en cola` : ""}
                </p>
                {ticket.created_at ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Solicitado {format_ve_datetime(ticket.created_at)}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {ESTADO_LABEL[ticket.estado]}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {PRIORIDAD_LABEL[ticket.prioridad]}
                </span>
              </div>
            </div>
            {ticket.descripcion ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                {ticket.descripcion}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-slate-400">
              Asignado: {ticket.asignado ?? "sin asignar"}
            </p>
            {ticket.respuesta ? (
              <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                <p className="text-xs font-semibold uppercase tracking-wide">Respuesta TED</p>
                <p className="mt-1 whitespace-pre-wrap">{ticket.respuesta}</p>
              </div>
            ) : null}
            {cola.length > 0 ? (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  En cola en este módulo
                </p>
                <ul className="mt-2 space-y-1">
                  {cola.slice(0, 8).map((item) => (
                    <li key={item.id} className="text-sm text-slate-600">
                      {item.titulo}{" "}
                      <span className="text-xs text-slate-400">
                        · {ESTADO_LABEL[item.estado]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
