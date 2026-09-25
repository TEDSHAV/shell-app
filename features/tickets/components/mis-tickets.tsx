"use client";

import { useMemo, useState } from "react";
import { SortControl } from "@/components/sort-control";
import { TimeFilterControl } from "@/components/time-filter-control";
import { compare_time, type TimeOrder } from "@/lib/date-range";
import {
  DEFAULT_TIME_FILTER,
  stamp_for_date_field,
  stamp_in_time_filter,
  type DateField,
  type SortDir,
  type TimeFilterValue,
} from "@/lib/list-time-period";
import { ESTADO_LABEL } from "../lib/labels";
import type { TicketQueueItem, TicketRow } from "../lib/types";
import { TicketListCard } from "./ticket-list-card";

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
      <div className="space-y-2.5">
        {filtered.map((ticket) => {
          const cola = ticket.modulo_id
            ? (queues[ticket.modulo_id] ?? []).filter((item) => item.id !== ticket.id)
            : [];
          const pos =
            ticket.modulo_id &&
            (queues[ticket.modulo_id] ?? []).findIndex((item) => item.id === ticket.id);
          return (
            <TicketListCard key={ticket.id} ticket={ticket} viewer="mine">
              {typeof pos === "number" && pos >= 0 ? (
                <p className="mt-2 pl-2 text-xs text-slate-400">
                  Posición {pos + 1} en la cola de este módulo
                </p>
              ) : null}
              {ticket.descripcion ? (
                <p className="mt-3 whitespace-pre-wrap pl-2 text-sm text-slate-600">
                  {ticket.descripcion}
                </p>
              ) : null}
              <p className="mt-2 pl-2 text-xs text-slate-400">
                Asignado: {ticket.asignado ?? "TED lo asignará al responder"}
              </p>
              {ticket.respuesta ? (
                <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Respuesta TED
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{ticket.respuesta}</p>
                </div>
              ) : null}
              {cola.length > 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-3 pl-2">
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
            </TicketListCard>
          );
        })}
      </div>
    </div>
  );
}
