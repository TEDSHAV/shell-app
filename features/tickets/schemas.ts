import { z } from "zod";
import { PLAN_TRIMESTRES } from "@/features/planificacion/schemas";

export const TICKET_PRIORIDADES = ["alta", "media", "baja", "otro"] as const;
export const TICKET_ESTADOS = [
  "abierto",
  "en_curso",
  "no_procede",
  "cerrado",
  "planificado",
] as const;

export const ticket_create_schema = z.object({
  titulo: z.string().trim().min(1, "El título es obligatorio").max(240),
  descripcion: z.string().trim().min(1, "Describe el requerimiento").max(8000),
  app_id: z.number().int().positive("Elige una app"),
  modulo_id: z.number().int().positive().optional().nullable(),
  prioridad: z.enum(TICKET_PRIORIDADES),
  asignado_id: z.number().int().positive().nullable().optional(),
  colaborador_ids: z.array(z.number().int().positive()).default([]),
  solicitado_por: z.number().int().positive().optional(),
});

export const ticket_reply_schema = z.object({
  ticket_id: z.number().int().positive(),
  estado: z.enum(["cerrado", "no_procede", "en_curso"]),
  respuesta: z.string().trim().min(1, "Escribe la respuesta").max(8000),
});

export const ticket_assign_schema = z.object({
  ticket_id: z.number().int().positive(),
  asignado_id: z.number().int().positive().nullable(),
  colaborador_ids: z.array(z.number().int().positive()).default([]),
});

export const ticket_promote_schema = z.object({
  ticket_id: z.number().int().positive(),
  trimestre: z.enum(PLAN_TRIMESTRES).nullable().optional(),
});

export type TicketCreateInput = z.infer<typeof ticket_create_schema>;
export type TicketReplyInput = z.infer<typeof ticket_reply_schema>;
export type TicketAssignInput = z.infer<typeof ticket_assign_schema>;
export type TicketPromoteInput = z.infer<typeof ticket_promote_schema>;
