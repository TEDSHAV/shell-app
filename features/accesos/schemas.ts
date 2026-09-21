import { z } from "zod";
import { PERMISSION_ACTIONS } from "./lib/slugs";

export const app_upsert_schema = z.object({
  id: z.number().int().positive().optional(),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug en kebab-case, sin acentos"),
  descripcion: z.string().trim().max(400).optional().nullable(),
});

export const role_upsert_schema = z.object({
  id: z.number().int().positive().optional(),
  app_id: z.number().int().positive(),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug de función (ej. lider)"),
  descripcion: z.string().trim().max(400).optional().nullable(),
  permission_ids: z.array(z.number().int().positive()).default([]),
});

export const permission_create_schema = z.object({
  modulo: z.string().trim().min(1).max(40),
  recurso: z.string().trim().min(1).max(40),
  accion: z.string().trim().min(1).max(40),
  descripcion: z.string().trim().max(400).optional().nullable(),
});

export const permission_update_schema = z.object({
  id: z.number().int().positive(),
  descripcion: z.string().trim().max(400).optional().nullable(),
});

export const assign_role_schema = z.object({
  usuario_id: z.number().int().positive(),
  app_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
});

export const revoke_role_schema = z.object({
  usuario_id: z.number().int().positive(),
  app_id: z.number().int().positive(),
});

export const role_permission_set_schema = z.object({
  role_id: z.number().int().positive(),
  permission_ids: z.array(z.number().int().positive()),
});

export const PERMISSION_ACTION_OPTIONS = PERMISSION_ACTIONS;
