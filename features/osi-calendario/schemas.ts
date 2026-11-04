import { z } from "zod";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const hora = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida");

export const MOTIVOS_REAGENDA = [
  "Solicitud de la empresa cliente",
  "Falta de quórum / inasistencia de participantes",
  "Indisposición o fuerza mayor del facilitador",
  "Falla de transporte o logística de traslado",
  "Causa climática / interrupción de servicios",
  "Postergación de común acuerdo",
] as const;

export const MOTIVOS_NO_EJECUCION = [
  "Cancelado por la empresa cliente",
  "Sin participantes",
  "Servicio sustituido por otra OSI",
  "Error de planificación",
] as const;

export const accion_sesion_schema = z.discriminatedUnion("accion", [
  z.object({
    accion: z.literal("ejecutar"),
    id_sesion: z.number().int().positive(),
    fecha,
    hora: hora.nullable(),
  }),
  z.object({
    accion: z.literal("reagendar"),
    id_sesion: z.number().int().positive(),
    fecha: fecha.nullable(),
    hora: hora.nullable(),
    motivo_tipo: z.string().trim().max(120).nullable(),
    motivo: z.string().trim().min(3, "Explica el motivo").max(1000),
  }),
  z.object({
    accion: z.literal("no_ejecutar"),
    id_sesion: z.number().int().positive(),
    motivo_tipo: z.string().trim().max(120).nullable(),
    motivo: z.string().trim().min(3, "Explica el motivo").max(1000),
  }),
]);

export type AccionSesionInput = z.infer<typeof accion_sesion_schema>;
