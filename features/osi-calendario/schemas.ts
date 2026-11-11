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

export const MOTIVOS_CANCELACION = [
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
    accion: z.literal("no_se_dio"),
    id_sesion: z.number().int().positive(),
    /** Nota opcional de qué pasó. */
    motivo: z.string().trim().max(1000).nullable(),
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

/** Misma acción sobre varias sesiones: por id de sesión (calendario) o por OSI completa (Consulta de OSIs). */
export const accion_lote_schema = z
  .object({
    accion: z.enum(["ejecutar", "no_se_dio", "reagendar", "no_ejecutar"]),
    ids_sesion: z.array(z.number().int().positive()).max(200).default([]),
    ids_osi: z.array(z.number().int().positive()).max(100).default([]),
    /** ejecutar: true = cada sesión en su propia fecha; false = todas en `fecha`. */
    fecha_propia: z.boolean().default(true),
    fecha: fecha.nullable().default(null),
    motivo_tipo: z.string().trim().max(120).nullable().default(null),
    motivo: z.string().trim().max(1000).nullable().default(null),
  })
  .refine((v) => v.ids_sesion.length + v.ids_osi.length > 0, "No hay nada seleccionado")
  .refine((v) => v.accion !== "ejecutar" || v.fecha_propia || !!v.fecha, "Indica la fecha de ejecución")
  .refine((v) => (v.accion !== "reagendar" && v.accion !== "no_ejecutar") || (v.motivo ?? "").length >= 3, "Escribe el motivo");

export type AccionLoteInput = z.input<typeof accion_lote_schema>;
