"use server";

import { createClient } from "@/lib/supabase/server";

export type OsiComentariosResumen = Record<number, { total: number; ultimo_at: string | null }>;

/**
 * Comentarios vinculados a cada OSI (comentario_entidad_vinculos, entity_type 'osi').
 * Un solo RPC para todos los ids; respeta el RLS de comentarios_contexto.
 */
export async function getOSIComentariosResumen(osiIds: number[]): Promise<OsiComentariosResumen> {
  const ids = [...new Set(osiIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (ids.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_osi_comentarios_resumen", { p_osi_ids: ids });
  if (error) {
    console.error("Error fetching OSI comment counts:", error);
    return {};
  }

  const out: OsiComentariosResumen = {};
  for (const row of (data ?? []) as Array<{ id_osi: number; total: number; ultimo_at: string | null }>) {
    out[row.id_osi] = { total: row.total, ultimo_at: row.ultimo_at };
  }
  return out;
}
