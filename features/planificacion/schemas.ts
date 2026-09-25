import { z } from "zod";

export const PLAN_TRIMESTRES = ["T1", "T2", "T3", "T4"] as const;
export const PLAN_ORIGENES = [
  "PLAN",
  "TICKET",
  "GERENCIA",
  "USUARIO",
  "REQUERIMIENTO",
  "ADICIONAL",
] as const;
export const PLAN_ORIGENES_NUEVOS = [
  "TICKET",
  "USUARIO",
  "REQUERIMIENTO",
  "ADICIONAL",
] as const;
export const PLAN_OBJETIVO_ESTADOS = [
  "abierto",
  "cumplido",
  "cancelado",
] as const;
export const HITO_ICONOS = ["deploy", "engine", "team"] as const;

export const ENTREGABLE_TIPOS = [
  "ninguno",
  "vista",
  "version",
  "comentario",
] as const;

export const modulo_schema = z.object({
  id: z.number().int().positive().optional(),
  app_id: z.number().int().positive().optional(),
  app_ids: z.array(z.number().int().positive()).min(1, "Elige al menos una app"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(160),
  subtitulo: z.string().trim().max(240).optional().nullable(),
  trimestre_entrega: z.enum(PLAN_TRIMESTRES),
  anio: z.number().int().min(2020).max(2100),
  fecha_objetivo: z.string().trim().optional().nullable(),
  participante_ids: z.array(z.number().int().positive()).default([]),
});

export const app_schema = z.object({
  id: z.number().int().positive().optional(),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(160),
  subtitulo: z.string().trim().max(240).optional().nullable(),
});

const optional_iso_date = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  });

export const tarea_schema = z.object({
  id: z.number().int().positive().optional(),
  app_id: z.number().int().positive().optional(),
  modulo_id: z.number().int().positive().optional(),
  modulo_nombre_nuevo: z.string().trim().max(160).optional().nullable(),
  titulo: z.string().trim().min(1, "El título es obligatorio").max(240),
  descripcion: z.string().trim().max(8000).optional().nullable(),
  origen: z.enum(PLAN_ORIGENES),
  avance: z.number().int().min(0).max(100),
  no_solicitada: z.boolean().default(false),
  entregable_tipo: z.enum(ENTREGABLE_TIPOS),
  entregable_ruta: z.string().trim().max(320).optional().nullable(),
  entregable_comentario: z.string().trim().max(4000).optional().nullable(),
  fecha_inicio: optional_iso_date,
  fecha_fin: optional_iso_date,
  trimestre: z.enum(PLAN_TRIMESTRES).nullable().optional(),
  asignado_id: z.number().int().positive().nullable().optional(),
  asignado_ids: z.array(z.number().int().positive()).optional(),
  objetivo_id: z.number().int().positive().nullable().optional(),
  entregable_unidad: z.string().trim().max(80).optional().nullable(),
  entregable_version: z.string().trim().max(80).optional().nullable(),
}).refine(
  (value) =>
    !value.fecha_inicio ||
    !value.fecha_fin ||
    value.fecha_fin >= value.fecha_inicio,
  {
    message: "La fecha fin no puede ser anterior al inicio",
    path: ["fecha_fin"],
  },
);

export const objetivo_schema = z.object({
  id: z.number().int().positive().optional(),
  titulo: z.string().trim().min(1, "El título es obligatorio").max(240),
  descripcion: z.string().trim().max(4000).optional().nullable(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida"),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de fin inválida"),
  app_id: z.number().int().positive().nullable().optional(),
  estado: z.enum(PLAN_OBJETIVO_ESTADOS).default("abierto"),
}).refine((value) => value.fecha_fin >= value.fecha_inicio, {
  message: "La fecha fin no puede ser anterior al inicio",
  path: ["fecha_fin"],
});

export const hito_schema = z.object({
  id: z.number().int().positive().optional(),
  app_id: z.number().int().positive(),
  modulo_id: z.number().int().positive().optional().nullable(),
  titulo: z.string().trim().min(1, "El título es obligatorio").max(160),
  descripcion: z.string().trim().max(4000).optional().nullable(),
  trimestre: z.enum(PLAN_TRIMESTRES),
  anio: z.number().int().min(2020).max(2100),
  icono: z.enum(HITO_ICONOS),
});

export const excel_commit_row_schema = z.object({
  row: z.number().int().positive(),
  modulo: z.string().trim().min(1).max(160),
  titulo_guardado: z.string().trim().min(1).max(240),
  origen: z.enum(PLAN_ORIGENES),
  avance: z.number().int().min(0).max(100),
  no_solicitada: z.boolean().default(false),
  entregable_tipo: z.enum(["vista", "ninguno"]),
  entregable_ruta: z.string().trim().max(320).optional().nullable(),
  app_ids: z.array(z.number().int().positive()).min(1),
  hang_on_general: z.boolean().default(false),
  hang_on_app_module: z.boolean().default(false),
  fecha_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  fecha_fin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  orden: z.number().int().positive(),
}).refine(
  (value) =>
    !value.fecha_inicio ||
    !value.fecha_fin ||
    value.fecha_fin >= value.fecha_inicio,
  {
    message: "La fecha fin no puede ser anterior al inicio",
    path: ["fecha_fin"],
  },
);

export const excel_commit_schema = z.object({
  anio: z.number().int().min(2020).max(2100),
  rows: z.array(excel_commit_row_schema).min(1).max(500),
});

export type ModuloInput = z.infer<typeof modulo_schema>;
export type AppInput = z.infer<typeof app_schema>;
export type TareaInput = z.infer<typeof tarea_schema>;
export type HitoInput = z.infer<typeof hito_schema>;
export type ObjetivoInput = z.infer<typeof objetivo_schema>;
export type ExcelCommitInput = z.infer<typeof excel_commit_schema>;
