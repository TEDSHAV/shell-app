"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserOSIAccessFilter } from "@/actions/osi";
import { getOSIComentariosResumen } from "@/actions/osi-comentarios";
import { getUserPermissionsByApp } from "@/actions/apps";
import { has_permission_slug } from "@/lib/ted-slugs";
import { OSI_SESION_GESTIONAR } from "@/lib/osi-slugs";
import { comparar_eventos, estado_sesion, ESTATUS_REAGENDADO } from "../lib/estado-sesion";
import { hoy_caracas, normalizar_mes, rango_grilla } from "../lib/mes-grid";
import type { CalendarioMesData, EventoCalendario, ReagendaHistorial, SesionCalendario } from "../lib/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const SESION_COLUMNS =
  "id_sesion, id_osi, nro_osi, nro_sesion, total_sesiones, fecha_planificada, hora_inicio, hora_fin, fecha_reagendada, hora_reagendada, fecha_ejecutada, hora_ejecutada, fecha_efectiva, reagenda_count, motivo_no_ejecucion_tipo, motivo_no_ejecucion, id_estatus_sesion, id_estatus_osi, nombre_empresa, servicio, tipo_servicio, id_ciudad, direccion_ejecucion, ejecutivo_negocios";

const TIPO_ST = "tipo_servicio.ilike.%servicios tecnicos%,tipo_servicio.ilike.%servicio tecnico%";

/** ¿El usuario puede ejecutar / reagendar / no ejecutar sesiones? Una vez por petición. */
export const canGestionarSesionesOSI = cache(async (): Promise<boolean> => {
  const perms = await getUserPermissionsByApp();
  return has_permission_slug(perms, OSI_SESION_GESTIONAR);
});

export async function getCalendarioMes(mes_param?: string | null): Promise<Result<CalendarioMesData>> {
  const hoy = hoy_caracas();
  const mes = normalizar_mes(mes_param, hoy);
  const { desde, hasta } = rango_grilla(mes);

  // Onda 1: acceso, permiso y cliente en paralelo.
  const [access, puede_gestionar, supabase] = await Promise.all([
    getUserOSIAccessFilter(),
    canGestionarSesionesOSI(),
    createClient(),
  ]);
  if (access === "none") return { ok: false, error: "Sin acceso a OSIs" };

  const con_acceso = <Q extends { ilike: (c: string, v: string) => Q; or: (f: string) => Q }>(q: Q): Q => {
    if (access === "capacitacion") return q.ilike("tipo_servicio", "%capacitacion%");
    if (access === "servicios_tecnicos") return q.or(TIPO_ST);
    return q;
  };

  const [mes_res, pendientes_res] = await Promise.all([
    con_acceso(
      supabase
        .from("v_osi_sesion_calendario")
        .select(SESION_COLUMNS)
        .gte("fecha_efectiva", desde)
        .lte("fecha_efectiva", hasta),
    ),
    con_acceso(
      supabase
        .from("v_osi_sesion_calendario")
        .select(SESION_COLUMNS)
        .eq("id_estatus_sesion", ESTATUS_REAGENDADO)
        .is("fecha_reagendada", null)
        .is("fecha_ejecutada", null),
    ),
  ]);

  if (mes_res.error || pendientes_res.error) {
    console.error("Error leyendo v_osi_sesion_calendario:", mes_res.error ?? pendientes_res.error);
    return { ok: false, error: "No se pudo cargar el calendario" };
  }

  const filas = (mes_res.data ?? []) as unknown as SesionCalendario[];
  const pendientes = (pendientes_res.data ?? []) as unknown as SesionCalendario[];
  const todas = [...filas, ...pendientes];

  // Onda 2: ciudades y comentarios de las OSIs visibles.
  const ciudad_ids = [...new Set(todas.map((s) => s.id_ciudad).filter((id): id is number => id != null))];
  const [ciudades_res, comentarios] = await Promise.all([
    ciudad_ids.length
      ? supabase.from("cat_ciudades").select("id, nombre_ciudad").in("id", ciudad_ids)
      : Promise.resolve({ data: [] as Array<{ id: number; nombre_ciudad: string }> }),
    getOSIComentariosResumen(todas.map((s) => s.id_osi)),
  ]);
  const ciudades = new Map((ciudades_res.data ?? []).map((c) => [c.id as number, c.nombre_ciudad as string]));

  const a_evento = (s: SesionCalendario): EventoCalendario => ({
    ...s,
    estado: estado_sesion(s, hoy),
    ciudad: s.id_ciudad != null ? ciudades.get(s.id_ciudad) ?? null : null,
    comentarios_count: comentarios[s.id_osi]?.total ?? 0,
  });

  const por_confirmar = pendientes.map(a_evento).sort(comparar_eventos);
  const ids_pendientes = new Set(por_confirmar.map((e) => e.id_sesion));
  const eventos = filas
    .filter((s) => !ids_pendientes.has(s.id_sesion))
    .map(a_evento)
    .sort((a, b) => a.fecha_efectiva.localeCompare(b.fecha_efectiva) || comparar_eventos(a, b));

  return { ok: true, data: { mes, hoy, eventos, por_confirmar, puede_gestionar } };
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
