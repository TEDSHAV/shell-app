"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clearOsiListServerCache } from "@/actions/osi";
import { motivo_no_aplica } from "../lib/acciones";
import { estado_sesion } from "../lib/estado-sesion";
import { hoy_caracas } from "../lib/mes-grid";
import type { AccionSesion, PermisosSesion, SesionCalendario } from "../lib/types";
import { accion_lote_schema, type AccionLoteInput } from "../schemas";
import { getPermisosSesionOSI } from "./calendario-actions";

export type ResultadoLote = {
  hechas: number;
  omitidas: Array<{ id_sesion: number; etiqueta: string; motivo: string }>;
};

type Result = { ok: true; data: ResultadoLote } | { ok: false; error: string };

const PERMISO_DE: Record<AccionSesion, keyof PermisosSesion> = {
  ejecutar: "ejecutar",
  no_se_dio: "ejecutar",
  reagendar: "reagendar",
  no_ejecutar: "cancelar",
};

const COLUMNAS =
  "id_sesion, id_osi, nro_osi, nro_sesion, total_sesiones, fecha_efectiva, fecha_ejecutada, fecha_reagendada, reagenda_count, id_estatus_sesion, no_se_dio";

/**
 * Aplica una acción a varias sesiones (o a todas las sesiones de varias OSIs).
 * Onda 1: permisos y sesiones en paralelo. Onda 2: un solo RPC por lote (`osi_sesion_registrar_acciones_lote`).
 * Las sesiones donde la acción no aplica se omiten antes del RPC y se informan con su motivo.
 */
export async function registrarAccionLote(input: AccionLoteInput): Promise<Result> {
  const parsed = accion_lote_schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const a = parsed.data;

  const supabase = await createClient();
  let consulta = supabase.from("v_osi_sesion_calendario").select(COLUMNAS);
  consulta = a.ids_osi.length ? consulta.in("id_osi", a.ids_osi) : consulta.in("id_sesion", a.ids_sesion);

  const [permisos, sesiones_res] = await Promise.all([getPermisosSesionOSI(), consulta]);
  if (!permisos[PERMISO_DE[a.accion]]) return { ok: false, error: "No tienes permiso para esta acción" };
  if (sesiones_res.error) {
    console.error("Error leyendo sesiones del lote:", sesiones_res.error);
    return { ok: false, error: "No se pudieron leer las sesiones" };
  }

  const hoy = hoy_caracas();
  const sesiones = (sesiones_res.data ?? []) as unknown as Array<SesionCalendario & { no_se_dio?: boolean }>;
  const etiqueta = (s: SesionCalendario) => `OSI ${s.nro_osi ?? s.id_osi} · S${s.nro_sesion}/${s.total_sesiones}`;

  const omitidas: ResultadoLote["omitidas"] = [];
  const aplicables: SesionCalendario[] = [];
  for (const s of sesiones) {
    const motivo = motivo_no_aplica(a.accion, estado_sesion(s, hoy), s.fecha_efectiva, hoy);
    if (motivo) omitidas.push({ id_sesion: s.id_sesion, etiqueta: etiqueta(s), motivo });
    else aplicables.push(s);
  }
  if (!aplicables.length) return { ok: true, data: { hechas: 0, omitidas } };

  const { data, error } = await supabase.rpc("osi_sesion_registrar_acciones_lote", {
    p_accion: a.accion,
    p_ids_sesion: aplicables.map((s) => s.id_sesion),
    p_fecha: a.accion === "ejecutar" && a.fecha_propia ? null : a.fecha,
    p_hora: null,
    p_motivo_tipo: a.accion === "reagendar" || a.accion === "no_ejecutar" ? a.motivo_tipo : null,
    p_motivo: a.accion === "reagendar" || a.accion === "no_ejecutar" ? a.motivo : null,
    p_fecha_propia: a.accion === "ejecutar" && a.fecha_propia,
  });
  if (error) {
    console.error("Error en osi_sesion_registrar_acciones_lote:", error);
    return { ok: false, error: error.code === "22023" ? error.message : "No se pudo aplicar la acción" };
  }

  const por_id = new Map(aplicables.map((s) => [s.id_sesion, s]));
  let hechas = 0;
  for (const fila of (data ?? []) as Array<{ id_sesion: number; ok: boolean; error: string | null }>) {
    if (fila.ok) hechas += 1;
    else {
      const s = por_id.get(fila.id_sesion);
      omitidas.push({ id_sesion: fila.id_sesion, etiqueta: s ? etiqueta(s) : `Sesión ${fila.id_sesion}`, motivo: fila.error ?? "Error" });
    }
  }

  if (hechas) {
    await clearOsiListServerCache();
    revalidatePath("/consulta-osi");
    revalidatePath("/consulta-osi/calendario");
  }
  return { ok: true, data: { hechas, omitidas } };
}
