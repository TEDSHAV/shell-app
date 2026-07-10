"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { BuildOsiPreviewInput } from "@sha/osi-formato";
import type {
  OSIListFilters,
  OSIListItem,
  OSIListResult,
  OSIListFilterOptions,
  OSIStatusOption,
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
      .select("*", { count: "exact" });

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

    // Fetch statuses for enrichment
    const statuses = await getOSIStatuses();
    const statusMap = new Map(statuses.map((s) => [s.id, s]));

    // Fetch city names for enrichment
    const cityIds = (data || [])
      .map((osi: any) => osi.id_ciudad_direccion_ejecucion_efectiva)
      .filter((id: number | null) => id !== null);
    const uniqueCityIds = [...new Set(cityIds)] as number[];
    let cityMap = new Map<number, string>();
    if (uniqueCityIds.length > 0) {
      const { data: cityData } = await supabase
        .from("cat_ciudades")
        .select("id, nombre_ciudad")
        .in("id", uniqueCityIds);
      cityMap = new Map((cityData || []).map((c: any) => [c.id, c.nombre_ciudad]));
    }

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

async function getOSIStatuses(): Promise<OSIStatusOption[]> {
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
}

export async function getOSIPreviewBundle(
  osiId: number,
): Promise<BuildOsiPreviewInput | null> {
  if (!Number.isFinite(osiId) || osiId <= 0) return null;

  try {
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

    const { data: osi_base_row } = await supabase
      .from("ejecucion_osi")
      .select("id, pretenciones_adicionales_osi, observaciones_adicionales_osi")
      .eq("id", osiId)
      .maybeSingle();

    const { data: recursos_row } = await supabase
      .from("osi_recursos_estimados")
      .select("public_cost_mask")
      .eq("id_osi", osiId)
      .maybeSingle();

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

    const public_cost_mask =
      recursos_row?.public_cost_mask &&
      typeof recursos_row.public_cost_mask === "object"
        ? (recursos_row.public_cost_mask as Record<string, boolean>)
        : {};

    return {
      view_row: view_row as Record<string, unknown>,
      osi_base_row: (osi_base_row ?? null) as Record<string, unknown> | null,
      ecc_children,
      servicio_nombre_by_id,
      public_cost_mask,
      can_see_private_costs: true,
    };
  } catch (err) {
    console.error("Unexpected error in getOSIPreviewBundle:", err);
    return null;
  }
}

export type OSIAccessFilter = "all" | "capacitacion" | "servicios_tecnicos" | "other" | "none";

export async function getUserOSIAccessFilter(): Promise<OSIAccessFilter> {
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

    // Fetch OSI info for notification
    const { data: osiRow } = await supabase
      .from("v_osi_formato_completo")
      .select("nro_osi, ejecutivo_negocios")
      .eq("id_osi", osiId)
      .single();

    if (!osiRow?.ejecutivo_negocios) return { success: true };

    // Fetch the new status name
    const { data: statusRow } = await supabase
      .from("conf_estatus")
      .select("nombre_estado")
      .eq("id", newStatusId)
      .single();

    const newStatusName = statusRow?.nombre_estado || `ID ${newStatusId}`;
    const nroOsi = osiRow.nro_osi || `ID ${osiId}`;
    const ejecutivoNombre = osiRow.ejecutivo_negocios as string;

    // Find the ejecutivo_negocios user in usuarios table
    const adminClient = await createAdminClient();
    const { data: ejecutivoUser } = await adminClient
      .from("usuarios")
      .select("id_auth")
      .ilike("nombre_apellido", ejecutivoNombre)
      .not("id_auth", "is", null)
      .limit(1)
      .maybeSingle();

    if (!ejecutivoUser?.id_auth) return { success: true };

    // Insert notification
    const { error: notifError } = await adminClient
      .schema("notify")
      .from("inbox")
      .insert({
        app_slug: "shell",
        event_key: "osi_status_changed",
        recipient_id_auth: ejecutivoUser.id_auth,
        title: "Estado de OSI Actualizado",
        body: `El estado de la OSI ${nroOsi} ha cambiado a "${newStatusName}"`,
        link_path: "/consulta-osi",
        dedupe_key: `osi:${osiId}:status_changed:${newStatusId}:${Date.now()}`,
        priority: 2,
      });

    if (notifError) {
      console.error("Error inserting OSI status notification:", notifError);
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in updateOSIStatus:", err);
    return { success: false, error: "Error inesperado" };
  }
}
