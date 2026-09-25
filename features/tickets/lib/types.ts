import { TICKET_ESTADOS, TICKET_PRIORIDADES } from "../schemas";

export type TicketPrioridad = (typeof TICKET_PRIORIDADES)[number];
export type TicketEstado = (typeof TICKET_ESTADOS)[number];

export type TicketCatalogApp = {
  id: number;
  slug: string;
  nombre: string;
};

export type TicketCatalogModulo = {
  id: number;
  app_id: number;
  nombre: string;
  default_asignado_id: number | null;
};

export type TicketUsuario = {
  id: number;
  label: string;
};

export type TicketEvento = {
  id: number;
  estado: string | null;
  nota: string | null;
  created_by: number | null;
  created_at: string;
};

export type TicketRow = {
  id: number;
  titulo: string;
  descripcion: string | null;
  prioridad: TicketPrioridad;
  estado: TicketEstado;
  app_id: number | null;
  app_nombre: string;
  modulo_id: number | null;
  modulo_nombre: string;
  solicitado_por: number | null;
  solicitante: string;
  created_by: number | null;
  registrado_por: string | null;
  asignado_id: number | null;
  asignado: string | null;
  colaborador_ids: number[];
  respuesta: string | null;
  respondido_at: string | null;
  tarea_id: number | null;
  created_at: string;
  updated_at: string | null;
  eventos: TicketEvento[];
  source?: "nativo" | "plan";
  avance?: number;
};

export type TicketCatalog = {
  apps: TicketCatalogApp[];
  modulos: TicketCatalogModulo[];
  usuarios: TicketUsuario[];
  is_ted: boolean;
};

export type TicketQueueItem = {
  id: number;
  titulo: string;
  estado: TicketEstado;
  prioridad: TicketPrioridad;
};
