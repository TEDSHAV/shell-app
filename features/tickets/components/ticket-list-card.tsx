"use client";

import type { ReactNode } from "react";
import { Ticket } from "lucide-react";
import { format_ve_datetime } from "@/lib/date-range";
import { ESTADO_LABEL, PRIORIDAD_LABEL } from "../lib/labels";
import {
  ESTADO_TONE,
  PRIORIDAD_TONE,
  ticket_en_nombre_de,
} from "../lib/ticket-display";
import type { TicketRow } from "../lib/types";
import { TicketOnBehalfBadge } from "./ticket-on-behalf-badge";
import { cn } from "@/lib/utils";

export function TicketListCard({
  ticket,
  viewer,
  as = "div",
  onClick,
  children,
}: {
  ticket: TicketRow;
  viewer: "inbox" | "mine";
  as?: "div" | "button";
  onClick?: () => void;
  children?: ReactNode;
}) {
  const tone = PRIORIDAD_TONE[ticket.prioridad];
  const on_behalf = ticket_en_nombre_de(ticket);
  const meta =
    viewer === "inbox"
      ? on_behalf
        ? `Para ${ticket.solicitante} · lo registró ${ticket.registrado_por ?? "TED"}`
        : `Solicitó ${ticket.solicitante}`
      : on_behalf
        ? `TED lo cargó a tu nombre`
        : `Lo enviaste tú`;

  const inner = (
    <>
      <span className={cn("absolute inset-y-0 left-0 w-1.5 rounded-l-2xl", tone.bar)} />
      <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <Ticket className="h-3 w-3 text-violet-600" />
              {ticket.app_nombre}
            </span>
            <span className="truncate text-[11px] font-semibold text-violet-700">
              {ticket.modulo_nombre}
            </span>
            <TicketOnBehalfBadge ticket={ticket} viewer={viewer} />
            {ticket.source === "plan" ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100">
                Plan
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-[15px] font-semibold tracking-tight text-slate-900">
            {ticket.titulo}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {meta}
            {ticket.created_at ? ` · ${format_ve_datetime(ticket.created_at)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              ESTADO_TONE[ticket.estado] ?? ESTADO_TONE.abierto,
            )}
          >
            {ESTADO_LABEL[ticket.estado]}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone.chip)}>
            {PRIORIDAD_LABEL[ticket.prioridad]}
          </span>
        </div>
      </div>
      {children}
    </>
  );

  const className = cn(
    "relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br to-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
    tone.glow,
    onClick && "transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md",
  );

  if (as === "button") {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return <article className={className}>{inner}</article>;
}
