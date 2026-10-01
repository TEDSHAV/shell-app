import type { TicketPrioridad, TicketRow } from "./types";

export function join_people_names(names: string[]): string {
  const clean = names.map((name) => name.trim()).filter(Boolean);
  if (clean.length === 0) return "Usuario";
  if (clean.length === 1) return clean[0] ?? "Usuario";
  if (clean.length === 2) return `${clean[0]} y ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} y ${clean[clean.length - 1]}`;
}

export function ticket_solicitante_ids(ticket: TicketRow): number[] {
  if (ticket.solicitado_ids.length > 0) return ticket.solicitado_ids;
  return ticket.solicitado_por ? [ticket.solicitado_por] : [];
}

export function ticket_en_nombre_de(ticket: TicketRow): boolean {
  if (ticket.source === "plan") return false;
  if (ticket.created_by == null) return false;
  const ids = ticket_solicitante_ids(ticket);
  if (ids.length === 0) return false;
  return ids.some((id) => id !== ticket.created_by);
}

export function ticket_registrado_label(ticket: TicketRow): string {
  return ticket.registrado_por ?? "TED";
}

export function ticket_solicitado_label(ticket: TicketRow): string {
  return ticket.solicitante || "Usuario";
}

export function ticket_people_meta(ticket: TicketRow, viewer: "inbox" | "mine"): string {
  if (ticket_en_nombre_de(ticket)) {
    return `Registrado por ${ticket_registrado_label(ticket)} · Solicitado por ${ticket_solicitado_label(ticket)}`;
  }
  if (viewer === "mine") return "Lo enviaste tú";
  return `Solicitó ${ticket_solicitado_label(ticket)}`;
}

export const PRIORIDAD_TONE: Record<
  TicketPrioridad,
  { bar: string; chip: string; glow: string }
> = {
  alta: {
    bar: "bg-rose-500",
    chip: "bg-rose-50 text-rose-800 ring-1 ring-rose-100",
    glow: "from-rose-50/80",
  },
  media: {
    bar: "bg-amber-400",
    chip: "bg-amber-50 text-amber-900 ring-1 ring-amber-100",
    glow: "from-amber-50/70",
  },
  baja: {
    bar: "bg-sky-400",
    chip: "bg-sky-50 text-sky-900 ring-1 ring-sky-100",
    glow: "from-sky-50/70",
  },
  otro: {
    bar: "bg-slate-400",
    chip: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    glow: "from-slate-50",
  },
};

export const ESTADO_TONE: Record<string, string> = {
  abierto: "bg-violet-100 text-violet-800 ring-1 ring-violet-200/80",
  en_curso: "bg-sky-100 text-sky-800 ring-1 ring-sky-200/80",
  no_procede: "bg-slate-200 text-slate-600 ring-1 ring-slate-300/70",
  cerrado: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80",
  planificado: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/80",
};
