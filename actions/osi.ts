"use server";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { notifySessionStatusChange } from "@/actions/osi-session-notifications";
import {
  getUserRole,
  getUserRolesByApp,
  getUserPermissionsByApp,
} from "@/actions/apps";
import type { BuildOsiPreviewInput } from "@sha/osi-formato";
import {
  has_cap_cierre_certificados_step,
  parse_osi_cost_visibility_row,
  user_can_reveal_osi_costs,
} from "@sha/osi-formato";
import type {
  OSIListFilters,
  OSIListItem,
  OSIListResult,
  OSIListFilterOptions,
  OSIStatusOption,
  OSISession,
  OSISessionsFinalCheck,
  SessionExecutionPayload,
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

    // If the attachment-received filter is active, pre-fetch the set of OSI IDs
    // that have attachment_received=true on an active facilitador assignment,
    // then constrain the main query to either those IDs ("received") or the
    // complement ("not_received"). Uses admin client to bypass RLS.
    let receivedOsiIds: number[] | null = null;
    if (filters.attachmentReceived) {
      const admin = await createAdminClient();
      const { data: receivedRows } = await admin
        .from("facilitador_osi_assignments")
        .select("osi_id")
        .eq("is_active", true)
        .eq("attachment_received", true);
      receivedOsiIds = (receivedRows || []).map((r: any) => r.osi_id as number);
    }

    let query = supabase
      .from("v_osi_lista")
      .select(
        "id_osi, nro_osi, nombre_empresa, servicio, tipo_servicio, id_ciudad_direccion_ejecucion_efectiva, ejecutivo_negocios, fecha_inicio_real, fecha_fin_real, participantes_ejecucion, participantes_max_solped, id_estatus, sesiones_ejecucion",
        { count: "exact" },
      );

    // Exclude pending OSIs (nro_osi starting with PEN-)
    query = query.not("nro_osi", "like", "PEN-%");

    // Apply attachment-received filter
    if (filters.attachmentReceived === "received") {
      query = query.in("id_osi", receivedOsiIds && receivedOsiIds.length > 0 ? receivedOsiIds : [-1]);
    } else if (filters.attachmentReceived === "not_received") {
      query = query.not("id_osi", "in", `(${(receivedOsiIds && receivedOsiIds.length > 0 ? receivedOsiIds : [-1]).join(",")})`);
    }

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

    // Fetch statuses, city names, and visibility flags in parallel.
    // Statuses are cached per-request; cities and visibility depend on the
    // page data but can run concurrently with each other.
    const cityIds = (data || [])
      .map((osi: any) => osi.id_ciudad_direccion_ejecucion_efectiva)
      .filter((id: number | null) => id !== null);
    const uniqueCityIds = [...new Set(cityIds)] as number[];
    const pageOsiIds = (data || [])
      .map((osi: any) => osi.id_osi)
      .filter((id: number | null) => id !== null) as number[];

    const [statuses, cityResult, visibleOsiIds, sesionesProgramadasResult, attachmentResult] = await Promise.all([
      getOSIStatuses(),
      uniqueCityIds.length > 0
        ? supabase
            .from("cat_ciudades")
            .select("id, nombre_ciudad")
            .in("id", uniqueCityIds)
        : Promise.resolve({ data: null }),
      getVisibleOsiIdsForList(pageOsiIds),
      // sesiones_programadas is the authoritative JSONB array of scheduled
      // sessions on ejecucion_osi (populated at creation, kept in sync by the
      // trg_osi_sesion_after_change trigger). sesiones_ejecucion (numeric) and
      // osi_sesion rows can both diverge from it, so we count this array's
      // length to drive the expandable check in OSITable. Primary-key lookup
      // for ~20 ids, runs in parallel — no extra round-trip on the critical path.
      pageOsiIds.length > 0
        ? supabase
            .from("ejecucion_osi")
            .select("id, sesiones_programadas")
            .in("id", pageOsiIds)
        : Promise.resolve({ data: null }),
      // Fetch attachment-received flags from active facilitador assignments.
      // Uses admin client to avoid RLS on the assignments table.
      pageOsiIds.length > 0
        ? (await createAdminClient())
            .from("facilitador_osi_assignments")
            .select("osi_id, attachment_received, attachment_received_at, attachment_received_by")
            .in("osi_id", pageOsiIds)
            .eq("is_active", true)
        : Promise.resolve({ data: null }),
    ]);

    const statusMap = new Map(statuses.map((s) => [s.id, s]));
    const cityMap = new Map((cityResult.data || []).map((c: any) => [c.id, c.nombre_ciudad]));

    const sessionCountMap = new Map<number, number>();
    for (const row of (sesionesProgramadasResult as any)?.data || []) {
      const osiId = row.id as number;
      const sesiones = row.sesiones_programadas;
      sessionCountMap.set(osiId, Array.isArray(sesiones) ? sesiones.length : 0);
    }

    // Map attachment-received state by osi_id
    const attachmentByOsi = new Map<number, { received: boolean; at: string | null; by: string | null }>();
    for (const row of (attachmentResult as any)?.data || []) {
      attachmentByOsi.set(row.osi_id, {
        received: !!row.attachment_received,
        at: row.attachment_received_at ?? null,
        by: row.attachment_received_by ?? null,
      });
    }

    const enrichedOSIs: OSIListItem[] = (data || []).map((osi: any) => {
      const status = osi.id_estatus ? statusMap.get(osi.id_estatus) : null;
      const attachment = osi.id_osi ? attachmentByOsi.get(osi.id_osi) : undefined;
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
        oculto_para_cliente: osi.id_osi ? !visibleOsiIds.has(osi.id_osi) : true,
        sesiones_ejecucion: osi.sesiones_ejecucion ?? null,
        total_sesiones: osi.id_osi ? (sessionCountMap.get(osi.id_osi) ?? 0) : null,
        attachment_received: attachment?.received ?? false,
        attachment_received_at: attachment?.at ?? null,
        attachment_received_by: attachment?.by ?? null,
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

// Inner cached implementation — keyed by the user's access filter so that
// different departments get different filter options. Revalidated every 5
// minutes via the "osi-filters" tag.
const getOSIListFilterOptionsCached = unstable_cache(
  async (accessFilter: OSIAccessFilter): Promise<OSIListFilterOptions> => {
    if (accessFilter === "none") {
      return { companies: [], ejecutivos: [], cityOptions: [], statuses: [] };
    }

    const supabase = await createAdminClient();

    const tipoServicioOr = accessFilter === "servicios_tecnicos"
      ? "tipo_servicio.ilike.%servicios tecnicos%,tipo_servicio.ilike.%servicio tecnico%"
      : null;

    // Single view scan for companies, ejecutivos, and city IDs (was 3 separate
    // scans of the 8-join view — consolidating into 1 cuts ~66% of the time).
    let viewQuery = supabase
      .from("v_osi_lista")
      .select("id_empresa, nombre_empresa, ejecutivo_negocios, id_ciudad_direccion_ejecucion_efectiva")
      .not("nro_osi", "like", "PEN-%");

    if (accessFilter === "capacitacion") {
      viewQuery = viewQuery.ilike("tipo_servicio", "%capacitacion%");
    } else if (tipoServicioOr) {
      viewQuery = viewQuery.or(tipoServicioOr);
    }

    const [viewResult, statuses] = await Promise.all([
      viewQuery,
      getOSIStatuses(),
    ]);

    const viewRows = viewResult.data || [];

    // Dedupe companies from the single result set
    const companyMap = new Map<number, { id_empresa: number; nombre_empresa: string }>();
    for (const r of viewRows) {
      if (r.nombre_empresa && r.id_empresa != null && !companyMap.has(r.id_empresa)) {
        companyMap.set(r.id_empresa, { id_empresa: r.id_empresa, nombre_empresa: r.nombre_empresa });
      }
    }
    const companies = [...companyMap.values()].sort((a, b) =>
      a.nombre_empresa.localeCompare(b.nombre_empresa),
    );

    // Dedupe ejecutivos from the single result set
    const ejecutivos = [...new Set(
      viewRows.map((r: any) => r.ejecutivo_negocios).filter(Boolean),
    )].sort() as string[];

    // Dedupe city IDs from the single result set
    const uniqueCityIds = [...new Set(
      viewRows
        .map((r: any) => r.id_ciudad_direccion_ejecucion_efectiva)
        .filter(Boolean),
    )] as number[];

    // Fetch city names for the city IDs (separate small query on cat_ciudades)
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

    return { companies, ejecutivos, cityOptions, statuses };
  },
  ["osi-filter-options"],
  { tags: ["osi-filters"], revalidate: 300 }
);

export async function getOSIListFilterOptions(): Promise<OSIListFilterOptions> {
  try {
    const accessFilter = await getUserOSIAccessFilter();
    return getOSIListFilterOptionsCached(accessFilter);
  } catch (err) {
    console.error("Error fetching OSI filter options:", err);
    return { companies: [], ejecutivos: [], cityOptions: [], statuses: [] };
  }
}

const getOSIStatuses = unstable_cache(
  async (): Promise<OSIStatusOption[]> => {
    try {
      const supabase = await createAdminClient();
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
  },
  ["osi-statuses"],
  { tags: ["osi-statuses"], revalidate: 300 }
);

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

    const { data: osi_sesiones_rows } = await supabase
      .from("osi_sesion")
      .select(
        "nro_sesion, fecha, hora_inicio, fecha_ejecutada, hora_ejecutada",
      )
      .eq("id_osi", osiId)
      .order("nro_sesion", { ascending: true });

    const { data: visibility_rows } = await supabase
      .from("osi_cost_visibility_config")
      .select("*");

    const visibility_by_formato = new Map<
      string,
      ReturnType<typeof parse_osi_cost_visibility_row>
    >();
    for (const row of visibility_rows ?? []) {
      const parsed = parse_osi_cost_visibility_row(
        row as Record<string, unknown>,
      );
      if (parsed) visibility_by_formato.set(parsed.formato, parsed);
    }

    const { data: { user } } = await supabase.auth.getUser();
    let departamento_id: number | null = null;
    if (user) {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("departamento")
        .eq("id_auth", user.id)
        .maybeSingle();
      departamento_id =
        typeof usuario?.departamento === "number" ? usuario.departamento : null;
    }

    const appRoles = await getUserRolesByApp();
    const role_slugs = Object.values(appRoles).filter(Boolean);
    const permsByApp = await getUserPermissionsByApp();
    const permission_slugs = Object.values(permsByApp).flat();

    const is_cap = tipoServicio.includes("CAPACITACION");
    const visibility_formato = is_cap ? "capacitacion" : "servicios_tecnicos";
    const visibility_config =
      visibility_by_formato.get(visibility_formato) ?? null;
    const visibility_ctx = {
      role: appRoles.sgestion ?? appRoles.scapacitacion ?? null,
      role_slugs,
      departamento_id,
      permission_slugs,
    };
    const can_reveal_costs = user_can_reveal_osi_costs(
      visibility_formato,
      visibility_config,
      visibility_ctx,
    );

    const can_reveal_st_monetary = is_cap
      ? can_reveal_costs
      : user_can_reveal_osi_costs(
          "servicios_tecnicos",
          visibility_by_formato.get("servicios_tecnicos") ?? null,
          visibility_ctx,
        );
    const st_default_hide =
      visibility_by_formato.get("servicios_tecnicos")?.default_hide_monetary ??
      true;

    const { data: cap_proceso_steps, error: cap_proceso_steps_error } =
      await supabase
        .from("capacitacion_proceso_steps")
        .select("step_key, completed")
        .eq("osi_id", osiId);

    if (cap_proceso_steps_error) {
      console.warn(
        "capacitacion_proceso_steps no disponible para preview OSI:",
        cap_proceso_steps_error.message,
      );
    }

    const cap_cierre_certificados_step_completed = has_cap_cierre_certificados_step(
      (cap_proceso_steps ?? []) as Array<{
        step_key?: unknown;
        completed?: unknown;
      }>,
    );

    return {
      view_row: view_row as Record<string, unknown>,
      osi_base_row: (osi_base_row ?? null) as Record<string, unknown> | null,
      ecc_children,
      servicio_nombre_by_id,
      public_cost_mask,
      can_reveal_st_monetary,
      st_monetary_public_view: can_reveal_st_monetary ? st_default_hide : true,
      can_see_private_costs: is_cap ? can_reveal_costs : true,
      cap_cierre_certificados_step_completed,
      osi_sesiones: (osi_sesiones_rows ?? []) as Array<Record<string, unknown>>,
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
        .from("v_osi_lista")
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

// ─── Cliente visibility ("Ocultar para cliente") ───

// Returns the set of osi_ids (from the given list) that are explicitly marked
// VISIBLE for the cliente portal. With inverted logic, OSIs are hidden by
// default (no row = hidden); staff must explicitly toggle them to visible.
// Used by getOSIList to flag rows that are NOT visible as "oculto_para_cliente".
async function getVisibleOsiIdsForList(osiIds: number[]): Promise<Set<number>> {
  if (!osiIds.length) return new Set();
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("osi_visibilidad_cliente")
      .select("osi_id")
      .in("osi_id", osiIds)
      .eq("oculto", false);
    if (error) {
      console.error("Error fetching visible osi ids:", error);
      return new Set();
    }
    return new Set((data || []).map((r: any) => r.osi_id as number));
  } catch (err) {
    console.error("Unexpected error in getVisibleOsiIdsForList:", err);
    return new Set();
  }
}

// True when the current user may toggle "Ocultar para cliente":
//   - global JWT role claim is admin/superadmin, OR
//   - has the "coordinador" role in the scapacitacion app (via authprisma).
const getCachedCanHideOSIFromClient = cache(async (): Promise<boolean> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Reuse the shared role resolver — it checks the JWT claim first, then
    // falls back to deriving the role from app roles (which is what actually
    // resolves for most users in this codebase).
    const globalRole = (await getUserRole()).toLowerCase();
    if (globalRole === "admin" || globalRole === "superadmin") return true;

    // Check for coordinador role in the scapacitacion app.
    const appRoles = await getUserRolesByApp();
    return appRoles?.scapacitacion?.toLowerCase() === "coordinador";
  } catch (err) {
    console.error("Error checking canHideOSIFromClient:", err);
    return false;
  }
});

export async function canHideOSIFromClient(): Promise<boolean> {
  return getCachedCanHideOSIFromClient();
}

// True when the current user belongs to the capacitacion department OR is a
// superadmin/admin (global role). Used to gate the "lista física recibida"
// toggle so only capacitacion users (and superadmins) can see/use it on the
// Consulta de OSIs page.
export async function canToggleOSIAttachment(): Promise<boolean> {
  try {
    // Only capacitacion department users and global superadmins can see/use
    // the "lista física recibida" toggle. We intentionally do NOT bypass for
    // the "admin" role (unlike canHideOSIFromClient): getUserRole() treats
    // app-level admins in any app as "admin", which would wrongly grant the
    // toggle to servicios tecnicos (and other department) app-admins.
    const globalRole = (await getUserRole()).toLowerCase();
    if (globalRole === "superadmin") return true;

    const filter = await getUserOSIAccessFilter();
    return filter === "capacitacion";
  } catch {
    return false;
  }
}

export async function setOSIHiddenForClient(
  osiId: number,
  hidden: boolean,
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI inválido" };
  }
  try {
    const canHide = await canHideOSIFromClient();
    if (!canHide) {
      return {
        success: false,
        error: "No tiene permisos para ocultar OSIs para el cliente",
      };
    }

    const supabase = await createClient();

    // Resolve current usuarios.id for the audit column.
    const { data: { user } } = await supabase.auth.getUser();
    let updatedBy: number | null = null;
    if (user) {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id")
        .eq("id_auth", user.id)
        .maybeSingle();
      updatedBy = usuario?.id ?? null;
    }

    // Use the admin (service-role) client for the upsert so RLS on the
    // control table doesn't block the write. The permission check above
    // already gated who can call this; the admin client just ensures the
    // write actually lands.
    const admin = await createAdminClient();
    const { error } = await admin
      .from("osi_visibilidad_cliente")
      .upsert(
        {
          osi_id: osiId,
          oculto: hidden,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "osi_id" },
      );

    if (error) {
      console.error("Error upserting osi_visibilidad_cliente:", error);
      return { success: false, error: "Error al actualizar la visibilidad" };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in setOSIHiddenForClient:", err);
    return { success: false, error: "Error inesperado" };
  }
}

// ─── Attachment received toggle ("Lista física recibida") ───

export async function toggleOSIAttachmentReceived(
  osiId: number,
): Promise<{ success: boolean; attachment_received?: boolean; error?: string }> {
  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "OSI inválido" };
  }
  try {
    // Only capacitacion users can toggle the attachment-received flag.
    const canToggle = await canToggleOSIAttachment();
    if (!canToggle) {
      return {
        success: false,
        error: "Solo el departamento de capacitación puede marcar listas físicas",
      };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Use admin client for the assignment lookup + update to avoid RLS.
    const admin = await createAdminClient();

    const { data: assignment, error: findError } = await admin
      .from("facilitador_osi_assignments")
      .select("id, attachment_received")
      .eq("osi_id", osiId)
      .eq("is_active", true)
      .maybeSingle();

    if (findError) {
      console.error("Error finding active assignment for attachment flag:", findError);
      return { success: false, error: "Error al buscar la asignación" };
    }

    if (!assignment) {
      return { success: false, error: "No hay facilitador asignado a esta OSI" };
    }

    const currentlyReceived = !!assignment.attachment_received;
    const newReceived = !currentlyReceived;

    const { error: updateError } = await admin
      .from("facilitador_osi_assignments")
      .update({
        attachment_received: newReceived,
        attachment_received_at: newReceived ? new Date().toISOString() : null,
        attachment_received_by: newReceived ? userId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);

    if (updateError) {
      console.error("Error toggling attachment_received flag:", updateError);
      return { success: false, error: "Error al actualizar el estado" };
    }

    return { success: true, attachment_received: newReceived };
  } catch (err) {
    console.error("Unexpected error in toggleOSIAttachmentReceived:", err);
    return { success: false, error: "Error inesperado" };
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

const OSI_SESION_SELECT_WITH_EXEC =
  "id, id_osi, nro_sesion, fecha, hora_inicio, hora_fin, fecha_ejecutada, hora_ejecutada, ejecutada_en_fecha_planificada";
const OSI_SESION_SELECT_BASE =
  "id, id_osi, nro_sesion, fecha, hora_inicio, hora_fin";

function is_missing_column_error(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  return (
    msg.includes("fecha_ejecutada") ||
    msg.includes("hora_ejecutada") ||
    msg.includes("ejecutada_en_fecha_planificada") ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

/**
 * If osi_sesion has no rows but ejecucion_osi.sesiones_programadas does,
 * materialize rows so consulta-osi can show/update session status.
 */
async function ensure_osi_sesiones_from_programadas(
  osiId: number,
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: osiRow } = await supabase
      .from("ejecucion_osi")
      .select("sesiones_programadas")
      .eq("id", osiId)
      .maybeSingle();

    const programmed = Array.isArray(osiRow?.sesiones_programadas)
      ? (osiRow.sesiones_programadas as Array<Record<string, unknown>>)
      : [];
    if (programmed.length === 0) return;

    const rows = programmed
      .map((item, index) => {
        const fecha =
          typeof item.fecha === "string" ? item.fecha.trim() : "";
        if (!fecha) return null;
        return {
          id_osi: osiId,
          nro_sesion: index + 1,
          fecha,
          hora_inicio:
            typeof item.hora_inicio === "string" ? item.hora_inicio : null,
          hora_fin: typeof item.hora_fin === "string" ? item.hora_fin : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) return;

    // Admin bypasses RLS insert mutators (finance/sales) so capacitacion
    // operators can still expand and mark execution for legacy OSIs.
    const admin = await createAdminClient();
    const { error } = await admin.from("osi_sesion").upsert(rows, {
      onConflict: "id_osi,nro_sesion",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error("Error ensuring osi_sesion from programadas:", error);
    }
  } catch (err) {
    console.error("Unexpected error ensuring osi_sesion:", err);
  }
}

async function fetch_osi_sesion_rows(osiId: number) {
  const supabase = await createClient();
  const withExec = await supabase
    .from("osi_sesion")
    .select(OSI_SESION_SELECT_WITH_EXEC)
    .eq("id_osi", osiId)
    .order("nro_sesion", { ascending: true });

  if (!withExec.error) {
    return { sessions: withExec.data ?? [], hasExecCols: true as const };
  }

  if (!is_missing_column_error(withExec.error)) {
    console.error("Error fetching OSI sessions:", withExec.error);
    return { sessions: [], hasExecCols: false as const };
  }

  // Migration not applied yet — fall back to pre–Fase 2 columns.
  const base = await supabase
    .from("osi_sesion")
    .select(OSI_SESION_SELECT_BASE)
    .eq("id_osi", osiId)
    .order("nro_sesion", { ascending: true });

  if (base.error) {
    console.error("Error fetching OSI sessions (base):", base.error);
    return { sessions: [], hasExecCols: false as const };
  }
  return { sessions: base.data ?? [], hasExecCols: false as const };
}

export async function getOSISessions(osiId: number): Promise<OSISession[]> {
  if (!Number.isFinite(osiId) || osiId <= 0) return [];

  try {
    let { sessions, hasExecCols } = await fetch_osi_sesion_rows(osiId);

    if (sessions.length === 0) {
      await ensure_osi_sesiones_from_programadas(osiId);
      ({ sessions, hasExecCols } = await fetch_osi_sesion_rows(osiId));
    }

    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.id as number);
    const supabase = await createClient();

    const { data: statusHistory, error: historyError } = await supabase
      .from("historial_cambios_estado")
      .select("id_registro, id_estatus_nuevo, fecha_cambio")
      .eq("tabla_afectada", "osi_sesion")
      .in("id_registro", sessionIds)
      .order("fecha_cambio", { ascending: false });

    if (historyError) {
      console.error("Error fetching session status history:", historyError);
    }

    const latestStatusBySession = new Map<number, number | null>();
    for (const row of statusHistory || []) {
      const sid = row.id_registro as number;
      if (!latestStatusBySession.has(sid)) {
        latestStatusBySession.set(sid, row.id_estatus_nuevo as number | null);
      }
    }

    return sessions.map((s) => {
      const statusId = latestStatusBySession.get(s.id as number) ?? null;
      const exec = hasExecCols ? (s as Record<string, unknown>) : null;
      return {
        id: s.id as number,
        id_osi: s.id_osi as number,
        nro_sesion: s.nro_sesion as number,
        fecha: s.fecha as string,
        hora_inicio: (s.hora_inicio as string | null) ?? null,
        hora_fin: (s.hora_fin as string | null) ?? null,
        fecha_ejecutada: exec
          ? ((exec.fecha_ejecutada as string | null) ?? null)
          : null,
        hora_ejecutada: exec
          ? ((exec.hora_ejecutada as string | null) ?? null)
          : null,
        ejecutada_en_fecha_planificada: exec
          ? ((exec.ejecutada_en_fecha_planificada as boolean | null) ?? null)
          : null,
        id_estatus: statusId,
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
  execution?: SessionExecutionPayload | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("osi_sesion")
      .select("id_osi, fecha, hora_inicio")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return { success: false, error: "Sesión no encontrada" };
    }

    const canChange = await canChangeOSIStatus(session.id_osi);
    if (!canChange) {
      return { success: false, error: "No tiene permisos para cambiar el estado de sesiones" };
    }

    const EJECUTADO_ID = 12;
    if (newStatusId === EJECUTADO_ID && !execution) {
      return {
        success: false,
        error: "Debe confirmar la fecha de ejecución de la sesión",
      };
    }

    if (newStatusId === EJECUTADO_ID && execution) {
      const { error: sesionUpdateError } = await supabase
        .from("osi_sesion")
        .update({
          fecha_ejecutada: execution.fecha_ejecutada,
          hora_ejecutada: execution.hora_ejecutada,
          ejecutada_en_fecha_planificada:
            execution.ejecutada_en_fecha_planificada,
        })
        .eq("id", sessionId);

      if (sesionUpdateError) {
        console.error(
          "Error updating session execution dates:",
          sesionUpdateError,
        );
        if (is_missing_column_error(sesionUpdateError)) {
          return {
            success: false,
            error:
              "Falta aplicar la migración de fechas de ejecución (osi_sesion.fecha_ejecutada). Ejecuta supabase db push.",
          };
        }
        return {
          success: false,
          error: "Error al guardar la fecha de ejecución",
        };
      }
    } else {
      // Leaving EJECUTADO: clear execution dates when columns exist.
      const { error: clearError } = await supabase
        .from("osi_sesion")
        .update({
          fecha_ejecutada: null,
          hora_ejecutada: null,
          ejecutada_en_fecha_planificada: null,
        })
        .eq("id", sessionId);
      if (clearError && !is_missing_column_error(clearError)) {
        console.error("Error clearing session execution dates:", clearError);
      }
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
      console.log("[updateSessionStatus] Gathering data for notification, sessionId=" + sessionId + ", osiId=" + session.id_osi);

      const [osiData, newStatusData, prevStatusData] = await Promise.all([
        supabase
          .from("v_osi_lista")
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

      console.log("[updateSessionStatus] Notification data:", {
        nroOsi: osiData.data?.nro_osi,
        nroSesion: sessionData.data?.nro_sesion,
        newStatusName: newStatusData.data?.nombre_estado,
        prevStatusName: prevStatusData?.data?.nombre_estado ?? null,
        osiError: osiData.error,
        newStatusError: newStatusData.error,
        sessionError: sessionData.error,
      });

      await notifySessionStatusChange({
        osiId: session.id_osi,
        nroOsi: osiData.data?.nro_osi ?? `ID ${session.id_osi}`,
        sessionNumber: sessionData.data?.nro_sesion ?? 0,
        newStatusName: newStatusData.data?.nombre_estado ?? "Desconocido",
        prevStatusName: prevStatusData?.data?.nombre_estado ?? null,
      });

      console.log("[updateSessionStatus] notifySessionStatusChange completed");
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
  totalSessions: number,
  statusIds: number[],
): Promise<OSISessionsFinalCheck> {
  try {
    if (totalSessions === 0) {
      return { allFinal: false, totalSessions: 0, finalCount: 0 };
    }

    if (statusIds.length < totalSessions) {
      const supabase = await createClient();
      const finalCount = statusIds.length > 0
        ? (await supabase
            .from("conf_estatus")
            .select("id")
            .in("id", statusIds)
            .eq("es_estado_final", true)
          ).data?.length ?? 0
        : 0;
      return { allFinal: false, totalSessions, finalCount };
    }

    const supabase = await createClient();
    const { data: finalStatuses } = await supabase
      .from("conf_estatus")
      .select("id")
      .in("id", statusIds)
      .eq("es_estado_final", true);

    const finalCount = finalStatuses?.length ?? 0;
    return {
      allFinal: finalCount === totalSessions,
      totalSessions,
      finalCount,
    };
  } catch (err) {
    console.error("Unexpected error in checkAllSessionsFinal:", err);
    return { allFinal: false, totalSessions: 0, finalCount: 0 };
  }
}
