"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  RequisicionFormData,
  OSIFullData,
  RequisicionItem,
  VerificacionStatus,
  OSIFixedItem,
} from "@/types/requisiciones";
import {
  notifyAdminsOfNewRequisicion,
  notifyCreatorOfProcesada,
  notifyCreatorOfRechazada,
  notifyCreatorOfPartialVerificacion,
  notifyAdminOfAcuseRecibo,
  notifyCreatorOfCoordinadorRechazada,
} from "@/actions/requisicion-notifications";
import { getUsdToVesRate } from "@/lib/exchange-rate";
import { isCapacitacionDept } from "@/lib/requisiciones-gerencia";
import { getUserRole } from "@/actions/apps";

// Check if the current user belongs to the Administración department.
// Department-based only — role (admin/superadmin) is NOT considered.
// Wrapped in cache() to deduplicate across multiple calls in the same request
export const isRequisicionesAdmin = cache(async (): Promise<boolean> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("departamentos(nombre)")
      .eq("id_auth", user.id)
      .single();

    const deptName = (usuario?.departamentos as any)?.nombre?.toLowerCase() || "";
    return deptName.includes("admin");
  } catch {
    return false;
  }
});

// True when the current user belongs to the Capacitación department.
export const isCurrentUserCapacitacion = cache(async (): Promise<boolean> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("departamentos(nombre)")
      .eq("id_auth", user.id)
      .single();

    const deptName = (usuario?.departamentos as any)?.nombre || "";
    return isCapacitacionDept(deptName);
  } catch {
    return false;
  }
});

// True when the current user has the "coordinador" role in any app.
// Coordinadors approve internas before they are surfaced to Administración.
export const isRequisicionesCoordinador = cache(async (): Promise<boolean> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id_auth", user.id)
      .single();
    if (!usuario) return false;

    // Join user_app_roles → roles to check if the user has ANY role with
    // slug = 'coordinador' across all apps. This avoids the ambiguity of
    // multiple apps each having their own 'coordinador' role.
    const { data: uar } = await supabase
      .schema("authprisma")
      .from("user_app_roles")
      .select(`
        id,
        roles!inner (slug)
      `)
      .eq("usuario_id", usuario.id);

    if (!uar) return false;
    return uar.some((r: any) => r.roles?.slug === "coordinador");
  } catch {
    return false;
  }
});

// Returns the current user's department name (or null). Cached per request.
export const getCurrentUserDepartment = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("departamentos(nombre)")
      .eq("id_auth", user.id)
      .single();
    return (usuario?.departamentos as any)?.nombre || null;
  } catch {
    return null;
  }
});

// True when the current user is a coordinador AND their department matches the
// given department name (case-insensitive, partial match to handle accents).
export const isCoordinadorForDepartment = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  const isCoord = await isRequisicionesCoordinador();
  if (!isCoord) return false;
  const userDept = await getCurrentUserDepartment();
  if (!userDept) return false;
  return userDept.trim().toLowerCase().includes(deptName.trim().toLowerCase());
});

// True when the current user has a privileged role (admin, superadmin, or lider).
// These users bypass the coordinador approval gate when creating internas.
export const isPrivilegedUser = cache(async (): Promise<boolean> => {
  try {
    const role = (await getUserRole()).toLowerCase();
    return role === "admin" || role === "superadmin" || role === "lider";
  } catch {
    return false;
  }
});

// Derive whether a requisicion record is a "Capacitacion" record based on the
// stored department (preferred) or, for legacy records, gerencia_solicitante.
function recordIsCapacitacion(record: { departamento?: string | null; gerencia_solicitante?: string | null }): boolean {
  if (record.departamento) return isCapacitacionDept(record.departamento);
  return (record.gerencia_solicitante || "").trim().toLowerCase() === "capacitacion";
}

// Get all OSIs for the dropdown (cached 5 minutes)
export const getAllOSIsForRequisiciones = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("v_osi_formato_completo")
      .select("*")
      .order("id_osi", { ascending: false });

    if (error) {
      console.error("Error fetching OSIs:", error);
      return [];
    }
    return data as OSIFullData[];
  },
  ["osis-for-requisiciones"],
  { tags: ["osis"], revalidate: 300 }
);

// Get lightweight OSI id→nro_osi pairs for lookup maps (cached 5 minutes)
export const getOsiNumbersForLookup = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("v_osi_lista")
      .select("id_osi, nro_osi")
      .order("id_osi", { ascending: false });

    if (error) {
      console.error("Error fetching OSI numbers for lookup:", error);
      return [];
    }
    return data as { id_osi: number; nro_osi: string | null }[];
  },
  ["osi-numbers-for-lookup"],
  { tags: ["osi-numbers"], revalidate: 300 }
);

// Get all OSI sessions from the osi_sesion table (cached 5 minutes).
// Returns a flat list; the form groups by id_osi.
// Used as a fallback when v_osi_formato_completo.desglose_recursos_sesiones
// is empty (which happens when no recursos are assigned per session).
export const getAllOsiSessions = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("osi_sesion")
      .select("id, id_osi, nro_sesion, fecha, hora_inicio, hora_fin")
      .order("id_osi", { ascending: true })
      .order("nro_sesion", { ascending: true });

    if (error) {
      console.error("Error fetching OSI sessions:", error);
      return [];
    }
    return data as {
      id: number;
      id_osi: number;
      nro_sesion: number;
      fecha: string | null;
      hora_inicio: string | null;
      hora_fin: string | null;
    }[];
  },
  ["osi-sessions-all"],
  { tags: ["osi-numbers"], revalidate: 300 }
);

// Get all banks for the dropdown (cached 1 hour)
export const getBanksForDropdown = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("cat_bancos")
      .select("id, nombre")
      .order("nombre");

    if (error) {
      console.error("Error fetching banks:", error);
      return [];
    }
    return data as { id: number; nombre: string }[];
  },
  ["banks-for-dropdown"],
  { tags: ["banks"], revalidate: 3600 }
);

// Get current logged in user details
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*, departamentos(nombre)")
    .eq("id_auth", user.id)
    .single();

  if (error) {
    console.error("Error fetching user details:", error);
    return null;
  }

  return data;
}

// Get OSI data for auto-population
export async function getOSIForRequisicion(osiId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .eq("id_osi", osiId)
    .single();

  if (error) throw error;
  return data as OSIFullData;
}

// Create requisition record
export async function createRequisicionRecord(
  formData: RequisicionFormData,
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const isCapacitacion = !formData.is_general && isCapacitacionDept(formData.departamento);
  const primaryOSI = formData.selectedOSIs[0] || null;
  const isInterna = formData.is_general;

  // Internas bypass the coordinador approval gate when the creator is:
  //   - a privileged user (admin, superadmin, or lider), OR
  //   - a coordinador for their own department.
  // In both cases the requisicion goes straight to Administración.
  const creatorIsCoordinadorForDept = isInterna && await isCoordinadorForDepartment(formData.departamento);
  const creatorIsPrivileged = isInterna && await isPrivilegedUser();
  const bypassCoordinadorGate = creatorIsCoordinadorForDept || creatorIsPrivileged;
  const needsCoordinadorApproval = isInterna && !bypassCoordinadorGate;

  // Calculate totals for fixed items as requested (Cant is removed from UI, so we use 1)
  const totalTraslado = (formData.dias_traslado || 0) * (formData.costo_traslado || 0);
  const totalImpresion = (formData.impresion_total || 0);
  const totalHonorarios = (formData.honorarios_total || 0);
  const totalInformeFinal = (formData.informe_final_total || 0);

  // Base record (columns that always exist in the DB)
  const baseRecord = {
    id_osi: primaryOSI?.id_osi || null,
    solicitante: formData.solicitante,
    gerencia_solicitante: formData.gerencia_solicitante,
    fecha_solicitud: formData.fecha_solicitud,
    // Auto-derived: Internas = General (no OSI), Externas = OSI-based
    tipo_solicitud: isInterna ? "Interno" : "Externo",
    nro_correlativo: formData.nro_correlativo || null,
    tipo_servicio: formData.tipo_servicio || null,
    prioridad: formData.prioridad || null,
    corresponde_a: formData.corresponde_a || null,

    // Store calculated totals in numeric columns (zeroed when non-Capacitacion)
    costo_traslado: isCapacitacion ? totalTraslado : 0,
    impresion_total: isCapacitacion ? totalImpresion : 0,
    honorarios_total: isCapacitacion ? totalHonorarios : 0,
    informe_final_total: isCapacitacion ? totalInformeFinal : 0,
    dias_traslado: isCapacitacion ? formData.dias_traslado : 0,

    // DB Quantities set to 1 as requested (since we removed them from UI)
    cant_traslado: 1,
    cant_impresion: 1,
    cant_honorarios: 1,
    cant_informe_final: 1,

    // Per-OSI fixed items (Capacitación mode)
    osi_fixed_items: isCapacitacion ? formData.osi_fixed_items : [],

    // Facilitator (null when non-Capacitacion)
    cod_facilitador: isCapacitacion && formData.cod_facilitador ? parseInt(formData.cod_facilitador) : null,
    facilitador: isCapacitacion ? formData.facilitador : null,
    cedula_facilitador: isCapacitacion ? formData.cedula_facilitador : null,
    rif_facilitador: isCapacitacion ? formData.rif_facilitador : null,
    telefono_facilitador: isCapacitacion ? formData.telefono_facilitador : null,
    banco: isCapacitacion ? formData.banco : null,
    nro_cuenta: isCapacitacion ? formData.nro_cuenta : null,

    // Dynamic Items
    additional_items: formData.additional_items,

    observaciones_compras: formData.observaciones,
    created_by: userId,
    updated_by: userId,

    // Schema fields
    item_solicitado: primaryOSI?.servicio || null,
    cantidad: 1,
    id_estatus: 1, // Default status
    estatus_admin: "pendiente",
  };

  // New columns that may not exist yet if the migration hasn't been applied.
  // These are added in a separate layer so the insert can retry without them.
  const newColumns = {
    departamento: formData.departamento || null,
    id_sesion: formData.id_sesion || null,
    // Internas require coordinador approval before being surfaced to Administración.
    // Externas (and internas created by a coordinador for their own dept) go straight to admin.
    coordinador_estatus: needsCoordinadorApproval ? "pendiente" : null,
  };

  const fullRecord = { ...baseRecord, ...newColumns };

  // Try with all columns first; if a column doesn't exist yet, retry with base only.
  let data: any;
  let error: any;
  ({ data, error } = await supabase
    .from("requisiciones")
    .insert(fullRecord)
    .select()
    .single());

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[createRequisicionRecord] New columns not found, retrying with base record:", error.message);
    ({ data, error } = await supabase
      .from("requisiciones")
      .insert(baseRecord)
      .select()
      .single());
  }

  if (error) throw error;

  await syncRequisicionOsis(data.id, formData);

  // Notify Administración immediately for Externas and internas that bypassed the
  // coordinador gate. Internas awaiting coordinador approval wait (see approveRequisicionByCoordinador).
  if (!isInterna || bypassCoordinadorGate) {
    const requisicionLabel = isInterna
      ? "interna"
      : `de la OSI N° ${primaryOSI?.nro_osi || formData.selectedOSIs[0]?.nro_osi || ""}`;
    await notifyAdminsOfNewRequisicion(data.id, formData.solicitante, requisicionLabel);
  }

  // Revalidate both the shell and potentially the capacitacion app list if needed
  revalidatePath("/requisiciones");
  revalidateTag("osis", "default");
  revalidateTag("osi-numbers", "default");
  return data;
}

// Persist the multi-OSI links in the junction table
async function syncRequisicionOsis(
  requisicionId: number,
  formData: RequisicionFormData,
) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("requisiciones_osis")
    .delete()
    .eq("id_requisicion", requisicionId);

  if (deleteError) {
    console.error("Error clearing requisicion OSI links:", deleteError);
  }

  if (formData.selectedOSIs.length === 0) return;

  const rows = formData.selectedOSIs.map((osi) => ({
    id_requisicion: requisicionId,
    id_osi: osi.id_osi,
  }));

  const { error } = await supabase.from("requisiciones_osis").insert(rows);
  if (error) {
    console.error("Error saving requisicion OSI links:", error);
  }
}

// Get single record for editing
export async function getRequisicionRecord(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requisiciones")
    .select(`
      *,
      v_osi_formato_completo!left (
        id_osi,
        nro_osi,
        servicio
      ),
      requisiciones_osis (
        id_osi
      )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching requisicion record:", error);
    return null;
  }

  // Collect verificador ids from additional_items and osi_fixed_items
  const verificadorIds = new Set<string>();
  for (const item of (data?.additional_items || []) as RequisicionItem[]) {
    if (item.verificado_por) verificadorIds.add(item.verificado_por);
  }
  for (const fi of (data?.osi_fixed_items || []) as OSIFixedItem[]) {
    for (const key of ["verificado_por_traslado", "verificado_por_impresion", "verificado_por_honorarios", "verificado_por_informe_final"] as const) {
      const v = fi[key];
      if (v) verificadorIds.add(v);
    }
  }

  const promises: Promise<void>[] = [];

  if (data?.procesada_por) {
    promises.push(
      (async () => {
        const { data: procesadaPorUser } = await supabase
          .from("usuarios")
          .select("nombre_apellido")
          .eq("id_auth", data.procesada_por!)
          .single();
        (data as Record<string, unknown>).procesada_por_nombre = procesadaPorUser?.nombre_apellido || null;
      })(),
    );
  }

  if (verificadorIds.size > 0) {
    promises.push(
      (async () => {
        const { data: verificadores } = await supabase
          .from("usuarios")
          .select("id_auth, nombre_apellido")
          .in("id_auth", Array.from(verificadorIds));
        const map: Record<string, string> = {};
        (verificadores || []).forEach((u: { id_auth: string | null; nombre_apellido: string }) => {
          if (u.id_auth) map[u.id_auth] = u.nombre_apellido;
        });
        (data as Record<string, unknown>).verificado_por_map = map;
      })(),
    );
  }

  await Promise.all(promises);

  return data;
}

// Get OSI details for a list of ids (used by the view page)
export async function getOsisByIds(ids: number[]) {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .in("id_osi", ids);

  if (error) {
    console.error("Error fetching OSIs by ids:", error);
    return [];
  }
  return data as OSIFullData[];
}

// Update requisition record
export async function updateRequisicionRecord(
  id: number,
  formData: RequisicionFormData,
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  // Locked once Administración marks it as procesada or rechazada (unless caller is admin)
  const { data: existing } = await supabase
    .from("requisiciones")
    .select("estatus_admin")
    .eq("id", id)
    .single();

  const isLocked = existing?.estatus_admin === "procesada" || existing?.estatus_admin === "rechazada";
  if (isLocked && !(await isRequisicionesAdmin())) {
    throw new Error("Esta requisición ya fue procesada por Administración y no puede editarse.");
  }

  const isCapacitacion = !formData.is_general && isCapacitacionDept(formData.departamento);
  const primaryOSI = formData.selectedOSIs[0] || null;
  const isInterna = formData.is_general;

  // Calculate totals for fixed items
  const totalTraslado = (formData.dias_traslado || 0) * (formData.costo_traslado || 0);
  const totalImpresion = (formData.impresion_total || 0);
  const totalHonorarios = (formData.honorarios_total || 0);
  const totalInformeFinal = (formData.informe_final_total || 0);

  // Base record (columns that always exist in the DB)
  const baseRecord = {
    id_osi: primaryOSI?.id_osi || null,
    solicitante: formData.solicitante,
    gerencia_solicitante: formData.gerencia_solicitante,
    fecha_solicitud: formData.fecha_solicitud,
    // Auto-derived: Internas = General (no OSI), Externas = OSI-based
    tipo_solicitud: isInterna ? "Interno" : "Externo",
    nro_correlativo: formData.nro_correlativo || null,
    tipo_servicio: formData.tipo_servicio || null,
    prioridad: formData.prioridad || null,
    corresponde_a: formData.corresponde_a || null,

    // Store calculated totals in numeric columns (zeroed when non-Capacitacion)
    costo_traslado: isCapacitacion ? totalTraslado : 0,
    impresion_total: isCapacitacion ? totalImpresion : 0,
    honorarios_total: isCapacitacion ? totalHonorarios : 0,
    informe_final_total: isCapacitacion ? totalInformeFinal : 0,
    dias_traslado: isCapacitacion ? formData.dias_traslado : 0,

    // DB Quantities set to 1
    cant_traslado: 1,
    cant_impresion: 1,
    cant_honorarios: 1,
    cant_informe_final: 1,

    // Per-OSI fixed items (Capacitación mode)
    osi_fixed_items: isCapacitacion ? formData.osi_fixed_items : [],

    // Facilitator (null when non-Capacitacion)
    cod_facilitador: isCapacitacion && formData.cod_facilitador ? parseInt(formData.cod_facilitador) : null,
    facilitador: isCapacitacion ? formData.facilitador : null,
    cedula_facilitador: isCapacitacion ? formData.cedula_facilitador : null,
    rif_facilitador: isCapacitacion ? formData.rif_facilitador : null,
    telefono_facilitador: isCapacitacion ? formData.telefono_facilitador : null,
    banco: isCapacitacion ? formData.banco : null,
    nro_cuenta: isCapacitacion ? formData.nro_cuenta : null,

    additional_items: formData.additional_items,
    observaciones_compras: formData.observaciones,
    updated_by: userId,

    // Schema fields
    item_solicitado: primaryOSI?.servicio || null,
  };

  // New columns that may not exist yet if the migration hasn't been applied.
  const newColumns = {
    departamento: formData.departamento || null,
    id_sesion: formData.id_sesion || null,
  };

  const fullRecord = { ...baseRecord, ...newColumns };

  // Try with all columns first; if a column doesn't exist yet, retry with base only.
  let data: any;
  let error: any;
  ({ data, error } = await supabase
    .from("requisiciones")
    .update(fullRecord)
    .eq("id", id)
    .select()
    .single());

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[updateRequisicionRecord] New columns not found, retrying with base record:", error.message);
    ({ data, error } = await supabase
      .from("requisiciones")
      .update(baseRecord)
      .eq("id", id)
      .select()
      .single());
  }

  if (error) throw error;

  await syncRequisicionOsis(id, formData);

  revalidatePath("/requisiciones");
  revalidateTag("osis", "default");
  revalidateTag("osi-numbers", "default");
  return data;
}

// Get requisitions for list view.
// Administración (admin/superadmin) sees all records; regular users only their own.
export async function getAllRequisiciones(isAdmin?: boolean) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;

  if (!userId) return [];

  if (isAdmin === undefined) {
    isAdmin = await isRequisicionesAdmin();
  }

  let query = supabase
    .from("requisiciones")
    .select(`
      *,
      v_osi_formato_completo!left (
        id_osi,
        nro_osi,
        servicio,
        nombre_empresa,
        fecha_inicio_real,
        desglose_recursos_sesiones
      ),
      facilitadores!left (
        nombre_apellido,
        cedula
      ),
      requisiciones_osis (
        id_osi
      )
    `)
    .order("id", { ascending: false })
    .is("deleted_at", null);

  if (isAdmin) {
    // Administración should not see internas that are still pending coordinador
    // approval. Externas (coordinador_estatus IS NULL) and approved internas are shown.
    query = query.or("coordinador_estatus.is.null,coordinador_estatus.eq.aprobada");
    let { data, error } = await query;
    // If the coordinador_estatus column doesn't exist yet, retry without the filter
    // (admin sees all records, which is correct since no gate is active).
    if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
      console.warn("[getAllRequisiciones] coordinador_estatus column not found, admin sees all");
      const fallback = await supabase
        .from("requisiciones")
        .select(`
          *,
          v_osi_formato_completo!left (
            id_osi,
            nro_osi,
            servicio,
            nombre_empresa,
            fecha_inicio_real,
            desglose_recursos_sesiones
          ),
          facilitadores!left (
            nombre_apellido,
            cedula
          ),
          requisiciones_osis (
            id_osi
          )
        `)
        .order("id", { ascending: false })
        .is("deleted_at", null);
      data = fallback.data;
      error = fallback.error;
    }
    if (error) {
      console.error("Error fetching requisiciones:", error);
      return [];
    }
    return data;
  }

  // Non-admin: start with the user's own requisiciones.
  const isCapDept = await isCurrentUserCapacitacion();
  if (isCapDept) {
    const { data: dept } = await supabase
      .from("departamentos")
      .select("id")
      .ilike("nombre", "%capacitacion%")
      .maybeSingle();
    let creatorIds: string[] = [userId];
    if (dept?.id) {
      const { data: deptUsers } = await supabase
        .from("usuarios")
        .select("id_auth")
        .eq("departamento", dept.id)
        .not("id_auth", "is", null)
        .eq("esta_activo", true);
      creatorIds = (deptUsers || [])
        .map((u: any) => u.id_auth)
        .filter((id: string | null): id is string => Boolean(id));
      if (!creatorIds.includes(userId)) creatorIds.push(userId);
    }
    query = query.in("created_by", creatorIds);
  } else {
    query = query.eq("created_by", userId);
  }

  const { data: ownData, error: ownError } = await query;
  if (ownError) {
    console.error("Error fetching requisiciones:", ownError);
    return [];
  }

  // Coordinadors (non-admin) additionally see pending internas from their department
  // that were created by other users (awaiting their approval).
  const isCoord = await isRequisicionesCoordinador();
  if (isCoord) {
    const coordDept = await getCurrentUserDepartment();
    if (coordDept) {
      const coordDeptNorm = coordDept.trim().toLowerCase();

      // Build the pending-internas query. Try filtering by departamento first;
      // if that column doesn't exist yet (migration not applied), retry without it
      // and filter in-memory by gerencia_solicitante as a fallback.
      const pendingQuery = () => supabase
        .from("requisiciones")
        .select(`
          *,
          v_osi_formato_completo!left (
            id_osi,
            nro_osi,
            servicio,
            nombre_empresa,
            fecha_inicio_real,
            desglose_recursos_sesiones
          ),
          facilitadores!left (
            nombre_apellido,
            cedula
          ),
          requisiciones_osis (
            id_osi
          )
        `)
        .eq("tipo_solicitud", "Interno")
        .eq("coordinador_estatus", "pendiente")
        .neq("created_by", userId)
        .is("deleted_at", null)
        .order("id", { ascending: false });

      let { data: pendingInternas, error: pendingError } = await pendingQuery()
        .ilike("departamento", `%${coordDeptNorm}%`);

      // If a column doesn't exist yet (migration not applied), retry without the
      // new-column filters and apply them in-memory.
      if (pendingError && (pendingError.message || "").includes("column") && (pendingError.message || "").includes("does not exist")) {
        console.warn("[getAllRequisiciones] New column not found, falling back to base query:", pendingError.message);
        // Retry with just the base filters (no departamento, no coordinador_estatus).
        const fallback = await supabase
          .from("requisiciones")
          .select(`
            *,
            v_osi_formato_completo!left (
              id_osi,
              nro_osi,
              servicio,
              nombre_empresa,
              fecha_inicio_real,
              desglose_recursos_sesiones
            ),
            facilitadores!left (
              nombre_apellido,
              cedula
            ),
            requisiciones_osis (
              id_osi
            )
          `)
          .eq("tipo_solicitud", "Interno")
          .neq("created_by", userId)
          .is("deleted_at", null)
          .order("id", { ascending: false });

        pendingInternas = fallback.data;
        pendingError = fallback.error;
        // In-memory filter: coordinador_estatus === "pendiente" (null/undefined = no gate = not pending).
        pendingInternas = (pendingInternas || []).filter((r: any) => r.coordinador_estatus === "pendiente");
        // In-memory filter: match by gerencia_solicitante as a fallback for departamento.
        const mappedGerencia = coordDeptNorm.includes("capacitacion") ? "servicios"
          : coordDeptNorm.includes("negocios") ? "negocios"
          : coordDeptNorm.includes("admin") ? "administracion"
          : coordDeptNorm;
        pendingInternas = pendingInternas.filter((r: any) => {
          const g = (r.gerencia_solicitante || "").trim().toLowerCase();
          return g === mappedGerencia || g.includes(coordDeptNorm) || coordDeptNorm.includes(g);
        });
      }

      if (pendingError) {
        console.error("Error fetching pending internas for coordinador:", pendingError);
      } else if (pendingInternas && pendingInternas.length > 0) {
        // Merge + deduplicate by id (ownData already excludes these via created_by filter).
        const ownIds = new Set((ownData || []).map((r: any) => r.id));
        const merged = [...(ownData || [])];
        for (const r of pendingInternas) {
          if (!ownIds.has(r.id)) merged.push(r);
        }
        // Re-sort by id descending.
        merged.sort((a: any, b: any) => b.id - a.id);
        return merged;
      }
    }
  }

  return ownData;
}

// Delete requisition record
// Admin users: soft delete (sets deleted_at). Regular users: hard delete (only pending records).
export async function deleteRequisicionRecord(id: number) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("requisiciones")
    .select("estatus_admin")
    .eq("id", id)
    .single();

  const isLocked = existing?.estatus_admin === "procesada" || existing?.estatus_admin === "rechazada";
  if (isLocked && !(await isRequisicionesAdmin())) {
    throw new Error("Esta requisición ya fue procesada por Administración y no puede eliminarse.");
  }

  const isAdmin = await isRequisicionesAdmin();

  if (isAdmin) {
    const { error } = await supabase
      .from("requisiciones")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("requisiciones")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  revalidatePath("/requisiciones");
}

// Mark a requisition as procesada / pendiente / rechazada (Administración only).
// When rejecting, a motivo (reason) is required and persisted + included in the
// creator notification.
export async function setRequisicionEstatus(
  id: number,
  estatus: "pendiente" | "procesada" | "rechazada",
  motivoRechazo?: string,
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para cambiar el estatus de requisiciones.");
  }

  if (estatus === "rechazada" && !motivoRechazo?.trim()) {
    throw new Error("Debe indicar el motivo del rechazo.");
  }

  const userClient = await createClient();
  const userResponse = await userClient.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const isResolved = estatus === "procesada" || estatus === "rechazada";

  const update: Record<string, unknown> = {
    estatus_admin: estatus,
    procesada_por: isResolved ? userId : null,
    procesada_at: isResolved ? new Date().toISOString() : null,
  };
  if (estatus === "rechazada") {
    update.motivo_rechazo = motivoRechazo!.trim();
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("requisiciones")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[setRequisicionEstatus] Supabase update error:", JSON.stringify(error));
    throw error;
  }

  if (isResolved) {
    const { data: req, error: fetchError } = await adminClient
      .from("requisiciones")
      .select(`
        created_by,
        tipo_solicitud,
        v_osi_formato_completo (nro_osi)
      `)
      .eq("id", id)
      .single();

    console.log(`[setRequisicionEstatus] id=${id} estatus=${estatus} created_by=${req?.created_by} fetchError=${fetchError?.message}`);

    if (req?.created_by) {
      const requisicionLabel = req.tipo_solicitud === "Interno"
        ? "interna"
        : `de la OSI N° ${(req.v_osi_formato_completo as any)?.nro_osi || ""}`;
      if (estatus === "procesada") {
        console.log(`[setRequisicionEstatus] Calling notifyCreatorOfProcesada for creator ${req.created_by}`);
        await notifyCreatorOfProcesada(id, req.created_by, requisicionLabel);
      } else if (estatus === "rechazada") {
        console.log(`[setRequisicionEstatus] Calling notifyCreatorOfRechazada for creator ${req.created_by}`);
        await notifyCreatorOfRechazada(id, req.created_by, requisicionLabel, motivoRechazo!.trim());
      }
    } else {
      console.warn(`[setRequisicionEstatus] No created_by found for requisicion ${id}, skipping creator notification`);
    }
  }

  revalidatePath("/requisiciones");
}

// Coordinador approves a pending interna. After approval, Administración is
// notified (the requisicion becomes visible to them).
export async function approveRequisicionByCoordinador(id: number) {
  if (!(await isRequisicionesCoordinador())) {
    throw new Error("No tiene permisos de coordinador para aprobar requisiciones.");
  }

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await supabase
    .from("requisiciones")
    .select("tipo_solicitud, coordinador_estatus, solicitante, created_by, departamento, v_osi_formato_completo (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await supabase
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo (nro_osi)")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud !== "Interno") {
    throw new Error("Solo las requisiciones internas requieren aprobación del coordinador.");
  }
  if (existing.coordinador_estatus !== undefined && existing.coordinador_estatus !== "pendiente") {
    throw new Error("Esta requisición interna ya fue procesada por el coordinador.");
  }
  // Verify the coordinador's department matches the requisicion's department.
  // Fallback: if departamento is null (column doesn't exist), allow the coordinador.
  if (existing.departamento) {
    const deptOk = await isCoordinadorForDepartment(existing.departamento);
    if (!deptOk) {
      throw new Error("Solo puede aprobar requisiciones internas de su departamento.");
    }
  }

  // Try updating with new columns; fall back to just notifying admin if they don't exist.
  const { error } = await supabase
    .from("requisiciones")
    .update({
      coordinador_estatus: "aprobada",
      coordinador_por: userId,
      coordinador_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[approveRequisicionByCoordinador] coordinador columns not found, notifying admin only");
  } else if (error) {
    throw error;
  }

  // Now that the coordinador approved, surface the requisicion to Administración.
  const requisicionLabel = "interna";
  await notifyAdminsOfNewRequisicion(id, existing.solicitante || "", requisicionLabel);

  revalidatePath("/requisiciones");
  revalidatePath(`/requisiciones/view/${id}`);
}

// Coordinador rejects a pending interna with a reason. The creator is notified
// and the requisicion is locked for further editing.
export async function rejectRequisicionByCoordinador(id: number, motivo: string) {
  if (!(await isRequisicionesCoordinador())) {
    throw new Error("No tiene permisos de coordinador para rechazar requisiciones.");
  }
  if (!motivo?.trim()) {
    throw new Error("Debe indicar el motivo del rechazo.");
  }

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await supabase
    .from("requisiciones")
    .select("tipo_solicitud, coordinador_estatus, solicitante, created_by, departamento, v_osi_formato_completo (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await supabase
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo (nro_osi)")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud !== "Interno") {
    throw new Error("Solo las requisiciones internas requieren aprobación del coordinador.");
  }
  if (existing.coordinador_estatus !== undefined && existing.coordinador_estatus !== "pendiente") {
    throw new Error("Esta requisición interna ya fue procesada por el coordinador.");
  }
  // Verify the coordinador's department matches the requisicion's department.
  // Fallback: if departamento is null (column doesn't exist), allow the coordinador.
  if (existing.departamento) {
    const deptOk = await isCoordinadorForDepartment(existing.departamento);
    if (!deptOk) {
      throw new Error("Solo puede rechazar requisiciones internas de su departamento.");
    }
  }

  // Try updating with new columns; fall back to just notifying creator if they don't exist.
  const { error } = await supabase
    .from("requisiciones")
    .update({
      coordinador_estatus: "rechazada",
      coordinador_por: userId,
      coordinador_at: new Date().toISOString(),
      motivo_rechazo_coordinador: motivo.trim(),
    })
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[rejectRequisicionByCoordinador] coordinador columns not found, notifying creator only");
  } else if (error) {
    throw error;
  }

  if (existing.created_by) {
    const requisicionLabel = "interna";
    await notifyCreatorOfCoordinadorRechazada(id, existing.created_by, requisicionLabel, motivo.trim());
  }

  revalidatePath("/requisiciones");
  revalidatePath(`/requisiciones/view/${id}`);
}

// Toggle LISTO/PENDIENTE for an item of a General requisition (Administración only)
export async function updateItemVerificacion(
  requisicionId: number,
  itemId: string,
  verificacion: VerificacionStatus,
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para verificar items de requisiciones.");
  }

  const userClient = await createClient();
  const userResponse = await userClient.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const adminClient = await createAdminClient();
  const { data: record, error: fetchError } = await adminClient
    .from("requisiciones")
    .select("additional_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) {
    console.error("[updateItemVerificacion] Fetch error:", JSON.stringify(fetchError));
    throw fetchError;
  }

  const isListo = verificacion === "listo";
  const items: RequisicionItem[] = (record?.additional_items || []).map(
    (item: RequisicionItem) =>
      item.id === itemId
        ? {
            ...item,
            verificacion,
            verificado_por: isListo ? userId : null,
            verificado_en: isListo ? new Date().toISOString() : null,
          }
        : item,
  );

  const { error } = await adminClient
    .from("requisiciones")
    .update({ additional_items: items })
    .eq("id", requisicionId);

  if (error) {
    console.error("[updateItemVerificacion] Update error:", JSON.stringify(error));
    throw error;
  }
  revalidatePath("/requisiciones");
}

// Toggle verification for a fixed item field within an OSI block (Administración only)
export async function updateFixedItemVerificacion(
  requisicionId: number,
  idOsi: number,
  field: "verificacion_traslado" | "verificacion_impresion" | "verificacion_honorarios" | "verificacion_informe_final",
  verificacion: VerificacionStatus,
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para verificar items de requisiciones.");
  }

  const userClient = await createClient();
  const userResponse = await userClient.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const adminClient = await createAdminClient();
  const { data: record, error: fetchError } = await adminClient
    .from("requisiciones")
    .select("osi_fixed_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) {
    console.error("[updateFixedItemVerificacion] Fetch error:", JSON.stringify(fetchError));
    throw fetchError;
  }

  const isListo = verificacion === "listo";
  const suffixMap: Record<string, string> = {
    verificacion_traslado: "traslado",
    verificacion_impresion: "impresion",
    verificacion_honorarios: "honorarios",
    verificacion_informe_final: "informe_final",
  };
  const suffix = suffixMap[field];
  const fixedItems: OSIFixedItem[] = (record?.osi_fixed_items || []).map(
    (fi: OSIFixedItem) =>
      fi.id_osi === idOsi
        ? {
            ...fi,
            [field]: verificacion,
            [`verificado_por_${suffix}`]: isListo ? userId : null,
            [`verificado_en_${suffix}`]: isListo ? new Date().toISOString() : null,
          }
        : fi,
  );

  const { error } = await adminClient
    .from("requisiciones")
    .update({ osi_fixed_items: fixedItems })
    .eq("id", requisicionId);

  if (error) {
    console.error("[updateFixedItemVerificacion] Update error:", JSON.stringify(error));
    throw error;
  }
  revalidatePath("/requisiciones");
}

// Mark all additional_items and osi_fixed_items as "listo" (Administración only)
export async function markAllItemsVerificadas(requisicionId: number) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para verificar items de requisiciones.");
  }

  const userClient = await createClient();
  const userResponse = await userClient.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const adminClient = await createAdminClient();
  const { data: record, error: fetchError } = await adminClient
    .from("requisiciones")
    .select("additional_items, osi_fixed_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) {
    console.error("[markAllItemsVerificadas] Fetch error:", JSON.stringify(fetchError));
    throw fetchError;
  }

  const items: RequisicionItem[] = (record?.additional_items || []).map(
    (item: RequisicionItem) => ({ ...item, verificacion: "listo", verificado_por: userId, verificado_en: new Date().toISOString() }),
  );

  const nowIso = new Date().toISOString();
  const fixedItems: OSIFixedItem[] = (record?.osi_fixed_items || []).map(
    (fi: OSIFixedItem) => ({
      ...fi,
      verificacion_traslado: "listo" as const,
      verificacion_impresion: "listo" as const,
      verificacion_honorarios: "listo" as const,
      verificacion_informe_final: "listo" as const,
      verificado_por_traslado: userId,
      verificado_en_traslado: nowIso,
      verificado_por_impresion: userId,
      verificado_en_impresion: nowIso,
      verificado_por_honorarios: userId,
      verificado_en_honorarios: nowIso,
      verificado_por_informe_final: userId,
      verificado_en_informe_final: nowIso,
    }),
  );

  const { error } = await adminClient
    .from("requisiciones")
    .update({ additional_items: items, osi_fixed_items: fixedItems })
    .eq("id", requisicionId);

  if (error) {
    console.error("[markAllItemsVerificadas] Update error:", JSON.stringify(error));
    throw error;
  }
  revalidatePath("/requisiciones");
}

// Save partial verification progress and notify the creator (Administración only)
export async function saveVerificacionProgress(requisicionId: number) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para guardar el avance de verificación.");
  }

  const supabase = await createAdminClient();

  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select(`
      created_by,
      additional_items,
      osi_fixed_items,
      tipo_solicitud,
      v_osi_formato_completo (nro_osi)
    `)
    .eq("id", requisicionId)
    .single();

  if (fetchError) throw fetchError;

  const fixedItems: OSIFixedItem[] = record?.osi_fixed_items || [];
  const additionalItems: RequisicionItem[] = record?.additional_items || [];

  const fixedVerifiedCount = fixedItems.reduce(
    (sum, fi) =>
      sum +
      (fi.verificacion_traslado === "listo" ? 1 : 0) +
      (fi.verificacion_impresion === "listo" ? 1 : 0) +
      (fi.verificacion_honorarios === "listo" ? 1 : 0) +
      (fi.verificacion_informe_final === "listo" ? 1 : 0),
    0,
  );
  const fixedTotalCount = fixedItems.length * 4;
  const additionalVerifiedCount = additionalItems.filter(
    (item) => item.verificacion === "listo",
  ).length;
  const verifiedCount = fixedVerifiedCount + additionalVerifiedCount;
  const totalCount = fixedTotalCount + additionalItems.length;

  if (record?.created_by) {
    const requisicionLabel = record.tipo_solicitud === "Interno"
      ? "interna"
      : `de la OSI N° ${(record.v_osi_formato_completo as any)?.nro_osi || ""}`;
    await notifyCreatorOfPartialVerificacion(
      requisicionId,
      record.created_by,
      verifiedCount,
      totalCount,
      requisicionLabel,
    );
  }

  revalidatePath("/requisiciones");
  return { verifiedCount, totalCount };
}

// Get facilitators for dropdown with banking details (cached 5 minutes)
export const getFacilitatorsForDropdown = unstable_cache(
  async () => {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("facilitadores")
      .select(`
        id, 
        nombre_apellido, 
        cedula, 
        rif,
        telefono,
        datos_bancarios (
          banco,
          nro_cuenta,
          tipo_cuenta,
          es_principal
        )
      `)
      .eq("is_active", true)
      .order("nombre_apellido");

    if (error) throw error;
    return data;
  },
  ["facilitators-for-dropdown"],
  { tags: ["facilitators"], revalidate: 300 }
);

// Get USD→VES exchange rate for display in requisicion view
export async function getExchangeRate(): Promise<number | null> {
  return await getUsdToVesRate();
}

// Update facilitador banking details from admin requisicion view.
// Updates both the requisiciones snapshot AND the facilitadores/datos_bancarios master tables.
export async function updateFacilitadorBankingDetails(
  requisicionId: number,
  updates: {
    banco: string;
    nro_cuenta: string;
    telefono_facilitador: string;
    cedula_facilitador: string;
    rif_facilitador: string;
  },
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("Solo Administración puede editar los datos del facilitador.");
  }

  const supabase = await createAdminClient();

  // Fetch the requisicion to get cod_facilitador
  const { data: requisicion, error: reqError } = await supabase
    .from("requisiciones")
    .select("cod_facilitador")
    .eq("id", requisicionId)
    .single();

  if (reqError || !requisicion) {
    throw new Error("No se pudo encontrar la requisición.");
  }

  const facilitadorId = requisicion.cod_facilitador;

  // 1. Update the requisiciones snapshot
  const { error: snapshotError } = await supabase
    .from("requisiciones")
    .update({
      banco: updates.banco,
      nro_cuenta: updates.nro_cuenta,
      telefono_facilitador: updates.telefono_facilitador,
      cedula_facilitador: updates.cedula_facilitador,
      rif_facilitador: updates.rif_facilitador,
    })
    .eq("id", requisicionId);

  if (snapshotError) {
    console.error("[updateFacilitadorBankingDetails] Snapshot update error:", JSON.stringify(snapshotError));
    throw new Error("Error al actualizar el snapshot de la requisición.");
  }

  // 2. Update facilitadores master table if we have a valid facilitador id
  if (facilitadorId) {
    const { error: facError } = await supabase
      .from("facilitadores")
      .update({
        cedula: updates.cedula_facilitador,
        rif: updates.rif_facilitador,
        telefono: updates.telefono_facilitador,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq("id", facilitadorId);

    if (facError) {
      console.error("Error updating facilitadores table:", facError);
      throw new Error("Error al actualizar los datos del facilitador.");
    }

    // 3. Update or insert the principal datos_bancarios record
    const { data: existingBank } = await supabase
      .from("datos_bancarios")
      .select("id")
      .eq("id_facilitador", facilitadorId)
      .eq("es_principal", true)
      .single();

    if (existingBank) {
      const { error: bankError } = await supabase
        .from("datos_bancarios")
        .update({
          banco: updates.banco,
          nro_cuenta: updates.nro_cuenta,
        })
        .eq("id", existingBank.id);

      if (bankError) {
        console.error("Error updating datos_bancarios:", bankError);
        throw new Error("Error al actualizar los datos bancarios.");
      }
    } else {
      // No principal banking record exists — create one
      const { error: bankInsertError } = await supabase
        .from("datos_bancarios")
        .insert({
          id_facilitador: facilitadorId,
          banco: updates.banco,
          nro_cuenta: updates.nro_cuenta,
          es_principal: true,
          cedula_titular: updates.cedula_facilitador,
          nombre_titular: null,
          tipo_cuenta: null,
          telefono_pago_movil: updates.telefono_facilitador,
        });

      if (bankInsertError) {
        console.error("Error inserting datos_bancarios:", bankInsertError);
        throw new Error("Error al crear los datos bancarios.");
      }
    }
  }

  revalidatePath(`/requisiciones/view/${requisicionId}`);
  return { success: true };
}

// Refresh requisicion data (fixed items snapshot) from the master OSI record.
// This resolves inconsistencies between the historical snapshot and the current OSI truth.
export async function refreshRequisicionFromOSI(requisicionId: number) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("Solo Administración puede sincronizar datos con la OSI.");
  }

  const supabase = await createClient();

  // 1. Get the current requisicion record to find linked OSIs
  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select(`
      *,
      requisiciones_osis (id_osi)
    `)
    .eq("id", requisicionId)
    .single();

  if (fetchError || !record) {
    throw new Error("No se pudo encontrar la requisición.");
  }

  // 2. Identify all OSI IDs to refresh
  const osiIds: number[] = [];
  if (record.id_osi) osiIds.push(record.id_osi);
  
  if (record.requisiciones_osis && record.requisiciones_osis.length > 0) {
    record.requisiciones_osis.forEach((ro: any) => {
      if (ro.id_osi && !osiIds.includes(ro.id_osi)) {
        osiIds.push(ro.id_osi);
      }
    });
  }

  if (osiIds.length === 0) {
    throw new Error("Esta requisición no tiene OSIs vinculadas para sincronizar.");
  }

  // 3. Fetch fresh data for these OSIs
  const { data: freshOsis, error: freshError } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .in("id_osi", osiIds);

  if (freshError || !freshOsis || freshOsis.length === 0) {
    throw new Error("No se pudo obtener información actualizada de las OSIs.");
  }

  const freshOsiMap = new Map(freshOsis.map((o: any) => [o.id_osi, o]));

  // 4. Update osi_fixed_items array
  const currentFixedItems: OSIFixedItem[] = record.osi_fixed_items || [];
  const updatedFixedItems: OSIFixedItem[] = currentFixedItems.map((fi) => {
    const fresh = freshOsiMap.get(fi.id_osi);
    if (!fresh) return fi;

    return {
      ...fi,
      nro_osi: fresh.nro_osi,
      costo_traslado: fresh.costo_traslado || 0,
      impresion_total: fresh.costo_impresion_material || 0,
      honorarios_horas: fresh.horas_honorarios_instructor || 0,
      honorarios_costo_hora: fresh.tarifa_hora_honorarios || 0,
      honorarios_total: fresh.costo_honorarios_instructor || 0,
    };
  });

  // 5. Update legacy snapshot fields from the first (primary) OSI
  const primaryOsi = freshOsiMap.get(record.id_osi || osiIds[0]);
  const updates: any = {
    osi_fixed_items: updatedFixedItems,
  };

  if (primaryOsi) {
    updates.costo_traslado = (record.dias_traslado || 1) * (primaryOsi.costo_traslado || 0);
    updates.impresion_total = primaryOsi.costo_impresion_material || 0;
    updates.honorarios_total = primaryOsi.costo_honorarios_instructor || 0;
  }

  // 6. Save updates
  const { error: updateError } = await supabase
    .from("requisiciones")
    .update(updates)
    .eq("id", requisicionId);

  if (updateError) {
    console.error("Error updating requisicion from OSI:", updateError);
    throw new Error("Error al guardar los datos actualizados.");
  }

  revalidatePath(`/requisiciones/view/${requisicionId}`);
  return { success: true };
}

// Acknowledge receipt of a processed requisicion (creator only)
export async function acknowledgeRequisicionReceipt(id: number) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;

  if (!userId) {
    throw new Error("Debe iniciar sesión para confirmar la recepción.");
  }

  // Fetch the requisicion to verify ownership and status
  const { data: req, error: fetchError } = await supabase
    .from("requisiciones")
    .select("created_by, estatus_admin, acuse_recibido, procesada_por, tipo_solicitud, v_osi_formato_completo (nro_osi)")
    .eq("id", id)
    .single();

  if (fetchError || !req) {
    throw new Error("No se encontró la requisición.");
  }

  // Only the creator can acknowledge
  if (req.created_by !== userId) {
    throw new Error("Solo el solicitante puede confirmar la recepción.");
  }

  // Only when procesada
  if (req.estatus_admin !== "procesada") {
    throw new Error("Solo se puede confirmar la recepción de requisiciones procesadas.");
  }

  // Prevent double acknowledge
  if (req.acuse_recibido) {
    throw new Error("Ya se ha confirmado la recepción de esta requisición.");
  }

  // Update the record
  const { error: updateError } = await supabase
    .from("requisiciones")
    .update({
      acuse_recibido: true,
      acuse_recibido_at: new Date().toISOString(),
      acuse_recibido_por: userId,
    })
    .eq("id", id);

  if (updateError) throw updateError;

  // Notify the admin who processed it
  if (req.procesada_por) {
    const adminClient = await createAdminClient();
    const { data: creator } = await adminClient
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id_auth", userId)
      .single();

    const solicitanteName = creator?.nombre_apellido || "El solicitante";
    const requisicionLabel = req.tipo_solicitud === "Interno"
      ? "interna"
      : `de la OSI N° ${(req.v_osi_formato_completo as any)?.nro_osi || ""}`;

    await notifyAdminOfAcuseRecibo(id, req.procesada_por, solicitanteName, requisicionLabel);
  }

  revalidatePath("/requisiciones");
  revalidatePath(`/requisiciones/view/${id}`);
}
