"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clearOsiListServerCache } from "@/actions/osi";
import { notifySessionStatusChange } from "@/actions/osi-session-notifications";
import { accion_sesion_schema, type AccionSesionInput } from "../schemas";
import { canGestionarSesionesOSI } from "./calendario-actions";

type Result = { ok: true; data: { id_osi: number; id_estatus_osi: number | null } } | { ok: false; error: string };

type RpcRow = { id_osi: number; id_estatus_sesion: number; id_estatus_anterior: number | null; id_estatus_osi: number | null };

/** Ejecuta, reagenda o marca no ejecutada una sesión (RPC transaccional `osi_sesion_registrar_accion`). */
export async function registrarAccionSesion(input: AccionSesionInput): Promise<Result> {
  const parsed = accion_sesion_schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  if (!(await canGestionarSesionesOSI())) {
    return { ok: false, error: "No tienes permiso para gestionar la ejecución de sesiones" };
  }

  const a = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("osi_sesion_registrar_accion", {
    p_id_sesion: a.id_sesion,
    p_accion: a.accion,
    p_fecha: a.accion === "no_ejecutar" ? null : a.fecha,
    p_hora: a.accion === "no_ejecutar" ? null : a.hora,
    p_motivo_tipo: a.accion === "ejecutar" ? null : a.motivo_tipo,
    p_motivo: a.accion === "ejecutar" ? null : a.motivo,
  });

  if (error) {
    console.error("Error en osi_sesion_registrar_accion:", error);
    const legible = ["42501", "22023", "P0002"].includes(error.code ?? "");
    return { ok: false, error: legible ? error.message : "No se pudo registrar la acción" };
  }

  const row = (Array.isArray(data) ? data[0] : data) as RpcRow | undefined;
  if (!row) return { ok: false, error: "No se pudo registrar la acción" };

  // La notificación no bloquea la acción.
  void notificar(row, a.id_sesion).catch((err) => console.error("Error notificando cambio de sesión:", err));

  await clearOsiListServerCache();
  revalidatePath("/consulta-osi");
  revalidatePath("/consulta-osi/calendario");
  return { ok: true, data: { id_osi: row.id_osi, id_estatus_osi: row.id_estatus_osi } };
}

async function notificar(row: RpcRow, id_sesion: number) {
  const supabase = await createClient();
  const ids = [row.id_estatus_sesion, row.id_estatus_anterior].filter((id): id is number => id != null);
  const [sesion, estatus] = await Promise.all([
    supabase.from("v_osi_sesion_calendario").select("nro_osi, nro_sesion").eq("id_sesion", id_sesion).maybeSingle(),
    supabase.from("conf_estatus").select("id, nombre_estado").in("id", ids),
  ]);
  const nombre = new Map((estatus.data ?? []).map((e) => [e.id as number, e.nombre_estado as string]));
  await notifySessionStatusChange({
    osiId: row.id_osi,
    nroOsi: sesion.data?.nro_osi ?? `ID ${row.id_osi}`,
    sessionNumber: sesion.data?.nro_sesion ?? 0,
    newStatusName: nombre.get(row.id_estatus_sesion) ?? "Desconocido",
    prevStatusName: row.id_estatus_anterior != null ? nombre.get(row.id_estatus_anterior) ?? null : null,
  });
}
