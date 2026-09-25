import { UserRoundSearch } from "lucide-react";
import { ticket_en_nombre_de } from "../lib/ticket-display";
import type { TicketRow } from "../lib/types";

export function TicketOnBehalfBadge({
  ticket,
  viewer,
}: {
  ticket: TicketRow;
  viewer: "inbox" | "mine";
}) {
  if (!ticket_en_nombre_de(ticket)) return null;
  const label =
    viewer === "mine"
      ? `Lo registró ${ticket.registrado_por ?? "TED"}`
      : "A nombre de otro";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 ring-1 ring-violet-200">
      <UserRoundSearch className="h-3 w-3" />
      {label}
    </span>
  );
}
