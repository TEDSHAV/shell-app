import type { TicketEstado, TicketPrioridad } from "./types";

export const PRIORIDAD_LABEL: Record<TicketPrioridad, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  otro: "Otro",
};

export const ESTADO_LABEL: Record<TicketEstado, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  no_procede: "No procede",
  cerrado: "Cerrado",
  planificado: "En planificación",
};
