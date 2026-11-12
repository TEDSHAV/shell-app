"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserOSIAccessFilter } from "@/actions/osi";
import { getOSIComentariosResumen } from "@/actions/osi-comentarios";
import { getOSIExtras } from "@/actions/osi-extras";
import { getUserPermissionsByApp } from "@/actions/apps";
import { has_permission_slug } from "@/lib/ted-slugs";
import { OSI_FACTURAR, OSI_SESION_CANCELAR, OSI_SESION_EJECUTAR, OSI_SESION_REAGENDAR } from "@/lib/osi-slugs";
import { comparar_eventos, estado_sesion, ESTATUS_REAGENDADO } from "../lib/estado-sesion";
import { es_en_sha } from "../lib/en-sha";
import { hoy_caracas, normalizar_mes, rango_grilla } from "../lib/mes-grid";
import type { CalendarioMesData, EventoCalendario, PermisosSesion, ReagendaHistorial, SesionCalendario } from "../lib/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const SESION_COLUMNS_BASE =
  "id_sesion, id_osi, nro_osi, nro_sesion, total_sesiones, fecha_planificada, hora_inicio, hora_fin, fecha_reagendada, hora_reagendada, fecha_ejecutada, hora_ejecutada, fecha_efectiva, reagenda_count, motivo_no_ejecucion_tipo, motivo_no_ejecucion, id_estatus_sesion, id_estatus_osi, nombre_empresa, servicio, tipo_servicio, id_ciudad, direccion_ejecucion, ejecutivo_negocios";
/** Columnas de 20261104170000_osi_sesion_permisos_por_accion; si la migración no está, se lee sin ellas. */
const SESION_COLUMNS = `${SESION_COLUMNS_BASE}, no_se_dio, no_se_dio_at, no_se_dio_nota`;

const TIPO_ST = "tipo_servicio.ilike.%servicios tecnicos%,tipo_servicio.ilike.%servicio tecnico%";

/** Un permiso por acción (ejecutar, reagendar, cancelar). Una vez por petición. */
export const getPermisosSesionOSI = cache(async (): Promise<PermisosSesion> => {
  const perms = await getUserPermissionsByApp();
  return {
    ejecutar: has_permission_slug(perms, OSI_SESION_EJECUTAR),
    reagendar: has_permission_slug(perms, OSI_SESION_REAGENDAR),
    cancelar: has_permission_slug(perms, OSI_SESION_CANCELAR),
  };
});

/** Permiso osis:facturar (botón «Facturar» de las tarjetas). */
export const getPuedeFacturarOSI = cache(async (): Promise<boolean> => has_permission_slug(await getUserPermissionsByApp(), OSI_FACTURAR));

export async function getCalendarioMes(mes_param?: string | null): Promise<Result<CalendarioMesData>> {
  const hoy = hoy_caracas();
  const mes = normalizar_mes(mes_param, hoy);
  const { desde, hasta } = rango_grilla(mes);

  // Onda 1: acceso, permiso y cliente en paralelo.
  const [access, permisos, puede_facturar, supabase] = await Promise.all([
    getUserOSIAccessFilter(),
    getPermisosSesionOSI(),
    getPuedeFacturarOSI(),
    createClient(),
  ]);
  if (access === "none") return { ok: false, error: "Sin acceso a OSIs" };

  const con_acceso = <Q extends { ilike: (c: string, v: string) => Q; or: (f: string) => Q }>(q: Q): Q => {
    if (access === "capacitacion") return q.ilike("tipo_servicio", "%capacitacion%");
    if (access === "servicios_tecnicos") return q.or(TIPO_ST);
    return q;
  };

  const leer = (columnas: string) =>
    Promise.all([
      con_acceso(
        supabase
          .from("v_osi_sesion_calendario")
          .select(columnas)
          .gte("fecha_efectiva", desde)
          .lte("fecha_efectiva", hasta),
      ),
      con_acceso(
        supabase
          .from("v_osi_sesion_calendario")
          .select(columnas)
          .eq("id_estatus_sesion", ESTATUS_REAGENDADO)
          .is("fecha_reagendada", null)
          .is("fecha_ejecutada", null),
      ),
    ]);

  let [mes_res, pendientes_res] = await leer(SESION_COLUMNS);
  // 42703: la vista aún no tiene las columnas "no se dio" (migración pendiente en este entorno).
  if (mes_res.error?.code === "42703" || pendientes_res.error?.code === "42703") {
    [mes_res, pendientes_res] = await leer(SESION_COLUMNS_BASE);
  }

  if (mes_res.error || pendientes_res.error) {
    console.error("Error leyendo v_osi_sesion_calendario:", mes_res.error ?? pendientes_res.error);
    return { ok: false, error: "No se pudo cargar el calendario" };
  }

  const filas = (mes_res.data ?? []) as unknown as SesionCalendario[];
  const pendientes = (pendientes_res.data ?? []) as unknown as SesionCalendario[];
  const todas = [...filas, ...pendientes];

  // Onda 2: ciudades, comentarios, certificados, factura y OC de las OSIs visibles.
  const ciudad_ids = [...new Set(todas.map((s) => s.id_ciudad).filter((id): id is number => id != null))];
  const osis = [...new Map(todas.map((s) => [s.id_osi, { id_osi: s.id_osi, nro_osi: s.nro_osi }])).values()];
  const [ciudades_res, comentarios, extras, salones_res] = await Promise.all([
    ciudad_ids.length
      ? supabase.from("cat_ciudades").select("id, nombre_ciudad").in("id", ciudad_ids)
      : Promise.resolve({ data: [] as Array<{ id: number; nombre_ciudad: string }> }),
    getOSIComentariosResumen(osis.map((o) => o.id_osi)),
    getOSIExtras(osis),
    // Salón de cada sesión (lo elige Capacitación; estandarizado contra cat_salones).
    osis.length
      ? supabase.rpc("fn_osi_salones", { p_osi_ids: osis.map((o) => o.id_osi) })
      : Promise.resolve({ data: [] as Array<{ id_osi: number; nro_sesion: number; salon: string | null }> }),
  ]);
  const salones = new Map(
    ((salones_res.data ?? []) as Array<{ id_osi: number; nro_sesion: number; salon: string | null }>).map((r) => [
      `${r.id_osi}:${r.nro_sesion}`,
      r.salon,
    ]),
  );
  const ciudades = new Map((ciudades_res.data ?? []).map((c) => [c.id as number, c.nombre_ciudad as string]));

  const a_evento = (s: SesionCalendario): EventoCalendario => ({
    ...s,
    no_se_dio: s.no_se_dio ?? false,
    no_se_dio_at: s.no_se_dio_at ?? null,
    no_se_dio_nota: s.no_se_dio_nota ?? null,
    estado: estado_sesion(s, hoy),
    ciudad: s.id_ciudad != null ? ciudades.get(s.id_ciudad) ?? null : null,
    comentarios_count: comentarios[s.id_osi]?.total ?? 0,
    en_sha: es_en_sha(s.direccion_ejecucion),
    id_presupuesto: extras[s.id_osi]?.id_presupuesto ?? null,
    certificados: extras[s.id_osi]?.certificados ?? 0,
    factura: extras[s.id_osi]?.factura ?? null,
    ordenes_compra: extras[s.id_osi]?.ordenes_compra ?? [],
    salon: salones.get(`${s.id_osi}:${s.nro_sesion}`) ?? null,
  });

  const por_confirmar = pendientes.map(a_evento).sort(comparar_eventos);
  const ids_pendientes = new Set(por_confirmar.map((e) => e.id_sesion));
  const eventos = filas
    .filter((s) => !ids_pendientes.has(s.id_sesion))
    .map(a_evento)
    .sort((a, b) => a.fecha_efectiva.localeCompare(b.fecha_efectiva) || comparar_eventos(a, b));

  return { ok: true, data: { mes, hoy, eventos, por_confirmar, permisos, puede_facturar } };
}

export async function getReagendasSesion(id_sesion: number): Promise<Result<ReagendaHistorial[]>> {
  if (!Number.isFinite(id_sesion) || id_sesion <= 0) return { ok: false, error: "Sesión inválida" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("osi_sesion_reagenda")
    .select("id, fecha_desde, fecha_hasta, hora_hasta, motivo_tipo, motivo, created_at")
    .eq("id_sesion", id_sesion)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error leyendo osi_sesion_reagenda:", error);
    return { ok: false, error: "No se pudo cargar el historial de reagendas" };
  }
  return { ok: true, data: (data ?? []) as ReagendaHistorial[] };
}

export type CambioEjecucion = {
  id: number;
  accion: string;
  antes: { fecha_ejecutada?: string | null; id_estatus?: number | null };
  despues: { fecha_ejecutada?: string | null; fecha_reagendada?: string | null; id_estatus?: number | null };
  created_at: string;
};

/** Cambios hechos sobre la sesión cuando ya estaba ejecutada (tabla de 20261105090000). Sin la tabla, lista vacía. */
export async function getAuditoriaSesion(id_sesion: number): Promise<Result<CambioEjecucion[]>> {
  if (!Number.isFinite(id_sesion) || id_sesion <= 0) return { ok: false, error: "Sesión inválida" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("osi_sesion_auditoria")
    .select("id, accion, antes, despues, created_at")
    .eq("id_sesion", id_sesion)
    .order("created_at", { ascending: false });
  if (error) {
    // 42P01: la migración aún no está en este entorno.
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("Error leyendo osi_sesion_auditoria:", error);
    return { ok: true, data: [] };
  }
  return { ok: true, data: (data ?? []) as CambioEjecucion[] };
}
