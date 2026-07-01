"use server";

import { createClient } from "@/lib/supabase/server";
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
    const supabase = await createClient();

    let query = supabase
      .from("v_osi_formato_completo")
      .select("*", { count: "exact" });

    // Exclude pending OSIs (nro_osi starting with PEN-)
    query = query.not("nro_osi", "like", "PEN-%");

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
    const supabase = await createClient();

    const [companiesResult, ejecutivosResult, cityIdsResult, statusesResult] =
      await Promise.all([
        supabase
          .from("v_osi_formato_completo")
          .select("id_empresa, nombre_empresa")
          .not("nombre_empresa", "is", null)
          .not("nro_osi", "like", "PEN-%")
          .order("nombre_empresa"),

        supabase
          .from("v_osi_formato_completo")
          .select("ejecutivo_negocios")
          .not("ejecutivo_negocios", "is", null)
          .not("nro_osi", "like", "PEN-%")
          .order("ejecutivo_negocios"),

        supabase
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
