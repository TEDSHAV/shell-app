"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ESTATUS_SUSPENDIDA = 39;

export type SuspensionRequisicion = {
  suspendida_at: string | null;
  osis: Array<{ id_osi: number; nro_osi: string | null; suspendida: boolean }>;
  /** A mano solo si le queda alguna OSI que no está suspendida. */
  puede_reactivar: boolean;
};

/** Por qué está suspendida una requisición y si se puede reactivar desde aquí. Una sola onda de lecturas. */
export async function getSuspensionRequisicion(id: number): Promise<SuspensionRequisicion | null> {
  const supabase = await createClient();
  const [{ data: req }, { data: ligadas }] = await Promise.all([
    supabase.from("requisiciones").select("id_osi, suspendida_at").eq("id", id).maybeSingle(),
    supabase.from("requisiciones_osis").select("id_osi").eq("id_requisicion", id),
  ]);
  if (!req) return null;
  const ids = [
    ...new Set([req.id_osi as number | null, ...((ligadas ?? []) as Array<{ id_osi: number }>).map((r) => r.id_osi)]),
  ].filter((x): x is number => x != null);
  const { data: osis } = ids.length
    ? await supabase.from("ejecucion_osi").select("id, id_estatus, nro_osi_secuencial").in("id", ids)
    : { data: [] };
  const lista = ((osis ?? []) as Array<{ id: number; id_estatus: number | null; nro_osi_secuencial: string | null }>).map((o) => ({
    id_osi: o.id,
    nro_osi: o.nro_osi_secuencial,
    suspendida: o.id_estatus === ESTATUS_SUSPENDIDA,
  }));
  return {
    suspendida_at: (req.suspendida_at as string | null) ?? null,
    osis: lista,
    puede_reactivar: lista.some((o) => !o.suspendida),
  };
}

/** Reactiva a mano (RPC `req_reactivar_suspendida`: permiso y regla de OSI en la BD). */
export async function reactivarRequisicion(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Requisición inválida" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("req_reactivar_suspendida" as never, { p_id_requisicion: id } as never);
  if (error) {
    const legible = ["42501", "22023", "P0002"].includes(error.code ?? "");
    return { ok: false, error: legible ? error.message : "No se pudo reactivar la requisición" };
  }
  revalidatePath(`/requisiciones/view/${id}`);
  revalidatePath("/requisiciones");
  return { ok: true };
}
