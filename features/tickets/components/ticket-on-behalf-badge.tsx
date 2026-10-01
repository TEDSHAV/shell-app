import { UserRound } from "lucide-react";
import {
  ticket_en_nombre_de,
  ticket_registrado_label,
  ticket_solicitado_label,
} from "../lib/ticket-display";
import type { TicketRow } from "../lib/types";

export function TicketOnBehalfBadge({
  ticket,
}: {
  ticket: TicketRow;
  viewer?: "inbox" | "mine";
}) {
  if (!ticket_en_nombre_de(ticket)) return null;
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1">
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
        <UserRound className="h-3 w-3" />
        Registrado por {ticket_registrado_label(ticket)}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200">
        Solicitado por {ticket_solicitado_label(ticket)}
      </span>
    </span>
  );
}
