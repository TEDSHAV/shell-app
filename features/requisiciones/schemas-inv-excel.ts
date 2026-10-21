import { z } from "zod";

export const inv_excel_commit_row_schema = z.object({
  row: z.number().int().positive(),
  concepto: z.string().trim().min(1).max(150),
  modo_compra: z.enum(["unidad", "recurrente"]),
  periodicidad: z.enum(["mensual", "anual", "semanal"]).nullable(),
  obedece: z.enum(["si", "no", "ambos"]),
  ejecutantes: z.array(z.enum(["capacitacion", "tecnico"])),
  id_departamentos: z.array(z.number().int().positive()),
  id_unidad: z.number().int().positive().nullable(),
  id_item_match: z.number().int().positive().nullable(),
  force_create: z.boolean().optional().default(false),
  unidades_por_empaque: z.number().positive().nullable().optional(),
});

export const inv_excel_commit_schema = z.object({
  id_unidad_default: z.number().int().positive().nullable(),
  ejecutantes_default: z
    .array(z.enum(["capacitacion", "tecnico"]))
    .min(1, "Marca al menos Cap o ST del lote."),
  rows: z.array(inv_excel_commit_row_schema).min(1).max(500),
});

export type InvExcelCommitInput = z.infer<typeof inv_excel_commit_schema>;
