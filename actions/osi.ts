"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { notifySessionStatusChange } from "@/actions/osi-session-notifications";
import type { BuildOsiPreviewInput } from "@sha/osi-formato";
import type {
  OSIListFilters,
  OSIListItem,
  OSIListResult,
  OSIListFilterOptions,
  OSIStatusOption,
  OSISession,
  OSISessionsFinalCheck,
} from "@/types/osi";

export async function getOSIList(
  filters: OSIListFilters = {},
  page = 1,
  limit = 20,
): Promise<OSIListResult> {
  try {
    const accessFilter = await getUserOSIAccessFilter();
    if (accessFilter === "none") return { osis: [], totalCount: 0 };

    const supabase = await createClient();

    let query = supabase
      .from("v_osi_formato_completo")
      .select(
        "id_osi, nro_osi, nombre_empresa, servicio, tipo_servicio, id_ciudad_direccion_ejecucion_efectiva, ejecutivo_negocios, fecha_inicio_real, fecha_fin_real, participantes_ejecucion, participantes_max_solped, id_estatus",
        { count: "exact" },
      );

    // Exclude pending OSIs (nro_osi starting with PEN-)
    query = query.not("nro_osi", "like", "PEN-%");

    // Apply department-based tipo_servicio filter
    if (accessFilter === "capacitacion") {
      query = query.ilike("tipo_servicio", "%capacitacion%");
    } else if (accessFilter === "servicios_tecnicos") {
      query = query.or("tipo_servicio.ilike.%servicios tecnicos%,tipo_servicio.ilike.%servicio tecnico%");
    }

    // Apply filters
    if (filters.nroOsi) {
      query = query.ilike("nro_osi", `%${filters.nroOsi}%`);
    }

    if (filters.companyName) {
      query = query.ilike("nombre_empresa", `%${filters.companyName}%`);
    }

    if (filters.ciudad) {
      query = query.eq("id_ciudad_direccion_ejecucion_efectiva", parseInt(filters.ciudad));
    }

    if (filters.ejecutivo) {
      query = query.ilike("ejecutivo_negocios", `%${filters.ejecutivo}%`);
    }

    if (filters.dateFrom) {
      query = query.gte("fecha_inicio_real", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("fecha_inicio_real", filters.dateTo);
    }

    if (filters.status) {
      query = query.eq("id_estatus", parseInt(filters.status));
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Sort by fecha_inicio_real descending
    const { data, error, count } = await query.order("fecha_inicio_real", {
      ascending: false,
      nullsFirst: false,
    });

    if (error) {
      console.error("Error fetching OSI list:", error);
      return { osis: [], totalCount: 0 };
    }

    // Fetch statuses and city names in parallel for enrichment
    const cityIds = (data || [])
      .map((osi: any) => osi.id_ciudad_direccion_ejecucion_efectiva)
      .filter((id: number | null) => id !== null);
    const uniqueCityIds = [...new Set(cityIds)] as number[];

    const [statuses, cityResult] = await Promise.all([
      getOSIStatuses(),
      uniqueCityIds.length > 0
        ? supabase
            .from("cat_ciudades")
            .select("id, nombre_ciudad")
            .in("id", uniqueCityIds)
        : Promise.resolve({ data: null }),
    ]);

    const statusMap = new Map(statuses.map((s) => [s.id, s]));
    const cityMap = new Map((cityResult.data || []).map((c: any) => [c.id, c.nombre_ciudad]));

    const enrichedOSIs: OSIListItem[] = (data || []).map((osi: any) => {
      const status = osi.id_estatus ? statusMap.get(osi.id_estatus) : null;
      return {
        id_osi: osi.id_osi,
        nro_osi: osi.nro_osi,
        nombre_empresa: osi.nombre_empresa,
        servicio: osi.servicio,
        tipo_servicio: osi.tipo_servicio,
        ciudad_ejecucion: osi.id_ciudad_direccion_ejecucion_efectiva
          ? cityMap.get(osi.id_ciudad_direccion_ejecucion_efectiva) ?? null
          : null,
        ejecutivo_negocios: osi.ejecutivo_negocios,
        fecha_inicio_real: osi.fecha_inicio_real,
        fecha_fin_real: osi.fecha_fin_real,
        participantes: osi.participantes_ejecucion ?? osi.participantes_max_solped ?? null,
        id_estatus: osi.id_estatus,
        status_name: status?.nombre_estado || "Desconocido",
        status_color: status?.color_hex || "#9CA3AF",
      };
    });

    return {
      osis: enrichedOSIs,
      totalCount: count || 0,
    };
  } catch (err) {
    console.error("Unexpected error in getOSIList:", err);
    return { osis: [], totalCount: 0 };
  }
}

export async function getOSIListFilterOptions(): Promise<OSIListFilterOptions> {
  try {
    const accessFilter = await getUserOSIAccessFilter();
    if (accessFilter === "none") {
      return { companies: [], ejecutivos: [], cityOptions: [], statuses: [] };
    }

    const supabase = await createClient();

    const tipoServicioOr = accessFilter === "servicios_tecnicos"
      ? "tipo_servicio.ilike.%servicios tecnicos%,tipo_servicio.ilike.%servicio tecnico%"
      : null;

    const [companiesResult, ejecutivosResult, cityIdsResult, statusesResult] =
      await Promise.all([
        (accessFilter === "capacitacion"
          ? supabase
              .from("v_osi_formato_completo")
              .select("id_empresa, nombre_empresa")
              .not("nombre_empresa", "is", null)
              .not("nro_osi", "like", "PEN-%")
              .ilike("tipo_servicio", "%capacitacion%")
          : tipoServicioOr
            ? supabase
                .from("v_osi_formato_completo")
                .select("id_empresa, nombre_empresa")
                .not("nombre_empresa", "is", null)
                .not("nro_osi", "like", "PEN-%")
                .or(tipoServicioOr)
            : supabase
                .from("v_osi_formato_completo")
                .select("id_empresa, nombre_empresa")
                .not("nombre_empresa", "is", null)
                .not("nro_osi", "like", "PEN-%")
        ).order("nombre_empresa"),

        (accessFilter === "capacitacion"
          ? supabase
              .from("v_osi_formato_completo")
              .select("ejecutivo_negocios")
              .not("ejecutivo_negocios", "is", null)
              .not("nro_osi", "like", "PEN-%")
              .ilike("tipo_servicio", "%capacitacion%")
          : tipoServicioOr
            ? supabase
                .from("v_osi_formato_completo")
                .select("ejecutivo_negocios")
                .not("ejecutivo_negocios", "is", null)
                .not("nro_osi", "like", "PEN-%")
                .or(tipoServicioOr)
            : supabase
                .from("v_osi_formato_completo")
                .select("ejecutivo_negocios")
                .not("ejecutivo_negocios", "is", null)
                .not("nro_osi", "like", "PEN-%")
        ).order("ejecutivo_negocios"),

        accessFilter === "capacitacion"
          ? supabase
              .from("v_osi_formato_completo")
              .select("id_ciudad_direccion_ejecucion_efectiva")
              .not("id_ciudad_direccion_ejecucion_efectiva", "is", null)
              .not("nro_osi", "like", "PEN-%")
              .ilike("tipo_servicio", "%capacitacion%")
          : tipoServicioOr
            ? supabase
                .from("v_osi_formato_completo")
                .select("id_ciudad_direccion_ejecucion_efectiva")
                .not("id_ciudad_direccion_ejecucion_efectiva", "is", null)
                .not("nro_osi", "like", "PEN-%")
                .or(tipoServicioOr)
            : supabase
                .from("v_osi_formato_completo")
                .select("id_ciudad_direccion_ejecucion_efectiva")
                .not("id_ciudad_direccion_ejecucion_efectiva", "is", null)
                .not("nro_osi", "like", "PEN-%"),

        supabase
          .from("conf_estatus")
          .select("id, nombre_estado, color_hex, orden, es_estado_final")
          .eq("tabla_referencia", "ejecucion_osi")
          .order("orden"),
      ]);

    const companies = Array.from(
      new Map(
        (companiesResult.data || []).map((c: any) => [c.id_empresa, c]),
      ).values(),
    ) as { id_empresa: number; nombre_empresa: string }[];

    const ejecutivos = Array.from(
      new Set(
        (ejecutivosResult.data || []).map((e: any) => e.ejecutivo_negocios),
      ),
    )
      .filter(Boolean)
      .sort() as string[];

    // Fetch city names for the city IDs found in the view
    const uniqueCityIds = [...new Set(
      (cityIdsResult.data || [])
        .map((c: any) => c.id_ciudad_direccion_ejecucion_efectiva)
        .filter(Boolean),
    )] as number[];
    let cityOptions: { id: number; nombre_ciudad: string }[] = [];
    if (uniqueCityIds.length > 0) {
      const { data: cityData } = await supabase
        .from("cat_ciudades")
        .select("id, nombre_ciudad")
        .in("id", uniqueCityIds)
        .order("nombre_ciudad");
      cityOptions = (cityData || []).map((c: any) => ({
        id: c.id,
        nombre_ciudad: c.nombre_ciudad,
      }));
    }

    const statuses: OSIStatusOption[] = (statusesResult.data || []).map(
      (s: any) => ({
        id: s.id,
        nombre_estado: s.nombre_estado,
        color_hex: s.color_hex,
        orden: s.orden,
        es_estado_final: s.es_estado_final,
      }),
    );

    return { companies, ejecutivos, cityOptions, statuses };
  } catch (err) {
    console.error("Error fetching OSI filter options:", err);
    return { companies: [], ejecutivos: [], cityOptions: [], statuses: [] };
  }
}

const getOSIStatuses = cache(async (): Promise<OSIStatusOption[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("conf_estatus")
      .select("id, nombre_estado, color_hex, orden, es_estado_final")
      .eq("tabla_referencia", "ejecucion_osi")
      .order("orden");

    if (error) {
      console.error("Error fetching OSI statuses:", error);
      return [];
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      nombre_estado: s.nombre_estado,
      color_hex: s.color_hex,
      orden: s.orden,
      es_estado_final: s.es_estado_final,
    }));
  } catch {
    return [];
  }
});

export async function getOSIPreviewBundle(
  osiId: number,
): Promise<BuildOsiPreviewInput | null> {
  if (!Number.isFinite(osiId) || osiId <= 0) return null;

  try {
    const accessFilter = await getUserOSIAccessFilter();
    if (accessFilter === "none") return null;

    const supabase = await createClient();
    const { data: view_row, error } = await supabase
      .from("v_osi_formato_completo")
      .select("*")
      .eq("id_osi", osiId)
      .single();

    if (error || !view_row) {
      console.error("Error fetching OSI preview view:", error);
      return null;
    }

    const tipoServicio = String(
      (view_row as Record<string, unknown>).tipo_servicio ?? "",
    ).toUpperCase();
    if (
      accessFilter === "capacitacion" &&
      !tipoServicio.includes("CAPACITACION")
    ) {
      return null;
    }
    if (
      accessFilter === "servicios_tecnicos" &&
      !tipoServicio.includes("SERVICIOS TECNICOS") &&
      !tipoServicio.includes("SERVICIO TECNICO")
    ) {
      return null;
    }

    const { data: osi_base_row } = await supabase
      .from("ejecucion_osi")
      .select("id, pretenciones_adicionales_osi, observaciones_adicionales_osi")
      .eq("id", osiId)
      .maybeSingle();

    const { data: recursos_rows, error: recursos_error } = await supabase
      .from("osi_recursos_estimados")
      .select("id_sesion, public_cost_mask")
      .eq("id_osi", osiId)
      .limit(50);

    if (recursos_error) {
      console.error("Error fetching OSI recursos mask:", recursos_error);
    }

    // Prefer global mask; else first session row with a non-empty mask object.
    const public_cost_mask = resolve_public_cost_mask(
      (recursos_rows ?? []) as Array<{
        id_sesion?: number | null;
        public_cost_mask?: unknown;
      }>,
      (view_row as Record<string, unknown>).desglose_recursos_sesiones,
    );

    const id_ecc = Number(
      (view_row as Record<string, unknown>).id_ecc_actual ??
        (view_row as Record<string, unknown>).id_ecc_origen ??
        0,
    );

    let ecc_children: Record<string, unknown>[] = [];
    if (id_ecc > 0) {
      const { data: children } = await supabase
        .from("ecc_encabezado")
        .select(
          "servicio_id, numero_areas, numero_trabajadores, numero_puntos_evaluar, pretenciones_cliente, observaciones_cliente",
        )
        .eq("id_ecc_consolidada", id_ecc);
      ecc_children = (children ?? []) as Record<string, unknown>[];
    }

    const { data: servicios_rows } = await supabase
      .from("catalogo_servicios")
      .select("id, nombre")
      .limit(500);

    const servicio_nombre_by_id: Record<number, string> = {};
    for (const row of servicios_rows ?? []) {
      const id = Number((row as { id?: number }).id ?? 0);
      const nombre = String((row as { nombre?: string }).nombre ?? "").trim();
      if (id > 0 && nombre) {
        servicio_nombre_by_id[id] = nombre;
      }
    }

    return {
      view_row: view_row as Record<string, unknown>,
      osi_base_row: (osi_base_row ?? null) as Record<string, unknown> | null,
      ecc_children,
      servicio_nombre_by_id,
      public_cost_mask,
      // Consulta OSI is internal staff: always show private costs.
      can_see_private_costs: true,
    };
  } catch (err) {
    console.error("Unexpected error in getOSIPreviewBundle:", err);
    return null;
  }
}

function as_mask_record(value: unknown): Record<string, boolean> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return null;
  const out: Record<string, boolean> = {};
  for (const [key, raw] of entries) {
    out[key] = Boolean(raw);
  }
  return out;
}

/**
 * Resolve OSI public cost mask for por_sesion or global recursos rows.
 * Prefer id_sesion IS NULL; else first non-empty mask from recursos or desglose.
 */
function resolve_public_cost_mask(
  recursos_rows: Array<{
    id_sesion?: number | null;
    public_cost_mask?: unknown;
  }>,
  desglose: unknown,
): Record<string, boolean> {
  const global_row = recursos_rows.find((r) => r.id_sesion == null);
  const from_global = as_mask_record(global_row?.public_cost_mask);
  if (from_global) return from_global;

  for (const row of recursos_rows) {
    const mask = as_mask_record(row.public_cost_mask);
    if (mask) return mask;
  }

  if (Array.isArray(desglose)) {
    for (const item of desglose) {
      if (!item || typeof item !== "object") continue;
      const mask = as_mask_record(
        (item as Record<string, unknown>).public_cost_mask,
      );
      if (mask) return mask;
    }
  }

  return {};
}

export type OSIAccessFilter = "all" | "capacitacion" | "servicios_tecnicos" | "other" | "none";

const getCachedUserOSIAccessFilter = cache(async (): Promise<OSIAccessFilter> => {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "none";

    const { data: claimsData } = await supabase.auth.getClaims();
    const globalRole = (
      claimsData?.claims?.user_role as string
    )?.toLowerCase();

    if (globalRole === "superadmin") return "all";

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("departamento")
      .eq("id_auth", user.id)
      .single();

    if (!usuario?.departamento) return "none";

    const { data: depto } = await supabase
      .from("departamentos")
      .select("nombre")
      .eq("id", usuario.departamento)
      .single();

    if (!depto?.nombre) return "none";

    const deptUpper = depto.nombre.toUpperCase();

    if (deptUpper.includes("CAPACITACION")) return "capacitacion";
    if (deptUpper.includes("SERVICIOS TECNICOS") || deptUpper.includes("SERVICIO TECNICO")) return "servicios_tecnicos";
    if (deptUpper.includes("TED")) return "all";

    return "other";
  } catch (err) {
    console.error("Error getting OSI access filter:", err);
    return "none";
  }
});

export async function getUserOSIAccessFilter(): Promise<OSIAccessFilter> {
  return getCachedUserOSIAccessFilter();
}

export async function canAccessConsultaOSI(): Promise<boolean> {
  const filter = await getUserOSIAccessFilter();
  return filter !== "none";
}

export async function canChangeOSIStatus(osiId?: number): Promise<boolean> {
  try {
    const filter = await getUserOSIAccessFilter();

    if (filter === "none" || filter === "other") return false;
    if (filter === "all") return true;

    if (osiId !== undefined) {
      const supabase = await createClient();
      const { data: osi } = await supabase
        .from("v_osi_formato_completo")
        .select("tipo_servicio")
        .eq("id_osi", osiId)
        .single();

      if (!osi?.tipo_servicio) return false;
      const tipoUpper = osi.tipo_servicio.toUpperCase();

      if (filter === "capacitacion") return tipoUpper.includes("CAPACITACION");
      if (filter === "servicios_tecnicos")
        return tipoUpper.includes("SERVICIOS TECNICOS") || tipoUpper.includes("SERVICIO TECNICO");
    }

    return true;
  } catch (err) {
    console.error("Error checking OSI status change permission:", err);
    return false;
  }
}

export async function updateOSIStatus(
  osiId: number,
  newStatusId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const canChange = await canChangeOSIStatus(osiId);
    if (!canChange) {
      return { success: false, error: "No tiene permisos para cambiar el estado de OSIs" };
    }

    const supabase = await createClient();

    const { error: updateError } = await supabase
      .from("ejecucion_osi")
      .update({ id_estatus: newStatusId })
      .eq("id", osiId);

    if (updateError) {
      console.error("Error updating OSI status:", updateError);
      return { success: false, error: "Error al actualizar el estado" };
    }

    // Notification is sent by DB trigger notify_shell_osi_status_changed
    // on ejecucion_osi.id_estatus update (see SGestion migration).

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in updateOSIStatus:", err);
    return { success: false, error: "Error inesperado" };
  }
}

export async function getOSISessions(osiId: number): Promise<OSISession[]> {
  if (!Number.isFinite(osiId) || osiId <= 0) return [];

  try {
    const accessFilter = await getUserOSIAccessFilter();
    if (accessFilter === "none") return [];

    const supabase = await createClient();

    const { data: sessions, error } = await supabase
      .from("osi_sesion")
      .select("id, id_osi, nro_sesion, fecha, hora_inicio, hora_fin")
      .eq("id_osi", osiId)
      .order("nro_sesion", { ascending: true });

    if (error || !sessions || sessions.length === 0) {
      if (error) console.error("Error fetching OSI sessions:", error);
      return [];
    }

    const sessionIds = sessions.map((s) => s.id);

    const [statusHistoryResult, statusesResult] = await Promise.all([
      supabase
        .from("historial_cambios_estado")
        .select("id_registro, id_estatus_nuevo, fecha_cambio")
        .eq("tabla_afectada", "osi_sesion")
        .in("id_registro", sessionIds)
        .order("fecha_cambio", { ascending: false }),
      getOSIStatuses(),
    ]);

    const statusMap = new Map(statusesResult.map((s) => [s.id, s]));

    const latestStatusBySession = new Map<number, number | null>();
    for (const row of statusHistoryResult.data || []) {
      const sid = row.id_registro as number;
      if (!latestStatusBySession.has(sid)) {
        latestStatusBySession.set(sid, row.id_estatus_nuevo as number | null);
      }
    }

    return sessions.map((s) => {
      const statusId = latestStatusBySession.get(s.id) ?? null;
      const status = statusId ? statusMap.get(statusId) : null;
      return {
        id: s.id,
        id_osi: s.id_osi,
        nro_sesion: s.nro_sesion,
        fecha: s.fecha,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        id_estatus: statusId,
        status_name: status?.nombre_estado || "Sin estado",
        status_color: status?.color_hex || "#9CA3AF",
      } as OSISession;
    });
  } catch (err) {
    console.error("Unexpected error in getOSISessions:", err);
    return [];
  }
}

export async function updateSessionStatus(
  sessionId: number,
  newStatusId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("osi_sesion")
      .select("id_osi")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return { success: false, error: "Sesión no encontrada" };
    }

    const canChange = await canChangeOSIStatus(session.id_osi);
    if (!canChange) {
      return { success: false, error: "No tiene permisos para cambiar el estado de sesiones" };
    }

    const { data: prevStatusRow } = await supabase
      .from("historial_cambios_estado")
      .select("id_estatus_nuevo")
      .eq("tabla_afectada", "osi_sesion")
      .eq("id_registro", sessionId)
      .order("fecha_cambio", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevStatusId = prevStatusRow?.id_estatus_nuevo ?? null;

    const { data: { user } } = await supabase.auth.getUser();
    let userId: number | null = null;
    if (user) {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id")
        .eq("id_auth", user.id)
        .maybeSingle();
      userId = usuario?.id ?? null;
    }

    const { error: insertError } = await supabase
      .from("historial_cambios_estado")
      .insert({
        tabla_afectada: "osi_sesion",
        id_registro: sessionId,
        id_estatus_anterior: prevStatusId,
        id_estatus_nuevo: newStatusId,
        fecha_cambio: new Date().toISOString(),
        id_usuario_cambio: userId,
      });

    if (insertError) {
      console.error("Error inserting session status change:", insertError);
      return { success: false, error: "Error al registrar el cambio de estado" };
    }

    // Fire-and-forget notification (errors logged, don't block the status change)
    try {
      const [osiData, newStatusData, prevStatusData] = await Promise.all([
        supabase
          .from("v_osi_formato_completo")
          .select("nro_osi")
          .eq("id_osi", session.id_osi)
          .maybeSingle(),
        supabase
          .from("conf_estatus")
          .select("nombre_estado")
          .eq("id", newStatusId)
          .maybeSingle(),
        prevStatusId
          ? supabase
              .from("conf_estatus")
              .select("nombre_estado")
              .eq("id", prevStatusId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const sessionData = await supabase
        .from("osi_sesion")
        .select("nro_sesion")
        .eq("id", sessionId)
        .maybeSingle();

      await notifySessionStatusChange({
        osiId: session.id_osi,
        nroOsi: osiData.data?.nro_osi ?? `ID ${session.id_osi}`,
        sessionNumber: sessionData.data?.nro_sesion ?? 0,
        newStatusName: newStatusData.data?.nombre_estado ?? "Desconocido",
        prevStatusName: prevStatusData?.data?.nombre_estado ?? null,
      });
    } catch (notifErr) {
      console.error("Error sending session status notification:", notifErr);
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in updateSessionStatus:", err);
    return { success: false, error: "Error inesperado" };
  }
}

export async function checkAllSessionsFinal(
  osiId: number,
): Promise<OSISessionsFinalCheck> {
  try {
    const sessions = await getOSISessions(osiId);
    if (sessions.length === 0) {
      return { allFinal: false, totalSessions: 0, finalCount: 0 };
    }

    const supabase = await createClient();
    const statusIds = sessions
      .map((s) => s.id_estatus)
      .filter((id): id is number => id !== null);

    if (statusIds.length < sessions.length) {
      const finalCount = statusIds.length > 0
        ? (await supabase
            .from("conf_estatus")
            .select("id")
            .in("id", statusIds)
            .eq("es_estado_final", true)
          ).data?.length ?? 0
        : 0;
      return { allFinal: false, totalSessions: sessions.length, finalCount };
    }

    const { data: finalStatuses } = await supabase
      .from("conf_estatus")
      .select("id")
      .in("id", statusIds)
      .eq("es_estado_final", true);

    const finalCount = finalStatuses?.length ?? 0;
    return {
      allFinal: finalCount === sessions.length,
      totalSessions: sessions.length,
      finalCount,
    };
  } catch (err) {
    console.error("Unexpected error in checkAllSessionsFinal:", err);
    return { allFinal: false, totalSessions: 0, finalCount: 0 };
  }
}
