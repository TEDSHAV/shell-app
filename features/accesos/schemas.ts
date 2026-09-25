import { z } from "zod";
import { slugify_kebab } from "./lib/slugs";

const kebab = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .transform((value) => slugify_kebab(value))
  .refine((value) => value.length >= 1, "Slug inválido");

const kebab_optional = z
  .string()
  .trim()
  .max(40)
  .transform((value) => slugify_kebab(value))
  .optional()
  .default("");

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
  modulo: kebab,
  recurso: kebab_optional,
  accion: kebab,
  descripcion: z.string().trim().max(400).optional().nullable(),
  app_id: z.number().int().positive().optional(),
  save_module: z.boolean().optional(),
  module_nombre: z.string().trim().max(80).optional().nullable(),
  module_descripcion: z.string().trim().max(400).optional().nullable(),
  save_action: z.boolean().optional(),
  action_nombre: z.string().trim().max(80).optional().nullable(),
  action_descripcion: z.string().trim().max(400).optional().nullable(),
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

export const sync_permission_roles_schema = z.object({
  permission_id: z.number().int().positive(),
  role_ids: z.array(z.number().int().positive()),
});

export const assign_role_to_users_schema = z.object({
  role_id: z.number().int().positive(),
  usuario_ids: z.array(z.number().int().positive()),
});

export const apply_permission_delta_schema = z.object({
  role_ids: z.array(z.number().int().positive()).min(1),
  add_permission_ids: z.array(z.number().int().positive()).default([]),
  remove_permission_ids: z.array(z.number().int().positive()).default([]),
});
