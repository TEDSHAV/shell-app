"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { createAdminClient, createClient, peek_dev_db_target } from "@/lib/supabase/server";
import type { DevDbTarget } from "@/lib/supabase/dev-db";
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
  notifyCreatorOfLiderRechazada,
  notifyCreatorOfApproverChanges,
  notifyLiderOfPendingInterna,
  notifyCoordinadorOfPendingExterna,
} from "@/actions/requisicion-notifications";
import { getUsdToVesRate } from "@/lib/exchange-rate";
import { deptNameInList, isCapacitacionDept } from "@/lib/requisiciones-gerencia";
import {
  getCurrentUserDepartment,
  getCurrentUserUsuarioId,
  getRequisicionAccess,
} from "@/actions/requisiciones-access-context";
import { dept_in_keys, stamp_coord_dept_keys } from "@/lib/requisiciones-dept-context";
import {
  apply_item_money_updates,
  interna_needs_lider,
  requisicion_items_total,
} from "@/lib/requisiciones-totals";
import {
  ADMIN_APP_SLUG,
} from "@/lib/requisiciones-slugs";

export {
  getCurrentUserUsuarioId,
  getCurrentUserDepartment,
};

// Build a JSON snapshot of the editable content fields of a requisicion record.
// Captured at creation and on every creator save (so it always reflects the
// creator's latest version), and used as the baseline for the approver-edit diff
// shown to the solicitor. The approver's edit action does NOT refresh this
// snapshot — that's the whole point: the solicitor sees what changed vs. their
// original request.
function buildRequisicionSnapshot(rec: Record<string, any>): Record<string, any> {
  return {
    additional_items: rec.additional_items,
    osi_fixed_items: rec.osi_fixed_items,
    cant_traslado: rec.cant_traslado,
    cant_impresion: rec.cant_impresion,
    cant_honorarios: rec.cant_honorarios,
    cant_informe_final: rec.cant_informe_final,
    dias_traslado: rec.dias_traslado,
    costo_traslado: rec.costo_traslado,
    impresion_total: rec.impresion_total,
    honorarios_horas: rec.honorarios_horas,
    honorarios_costo_hora: rec.honorarios_costo_hora,
    honorarios_total: rec.honorarios_total,
    informe_final_total: rec.informe_final_total,
    facilitador: rec.facilitador,
    cod_facilitador: rec.cod_facilitador,
    cedula_facilitador: rec.cedula_facilitador,
    rif_facilitador: rec.rif_facilitador,
    telefono_facilitador: rec.telefono_facilitador,
    banco: rec.banco,
    nro_cuenta: rec.nro_cuenta,
    observaciones_compras: rec.observaciones_compras,
    prioridad: rec.prioridad,
    corresponde_a: rec.corresponde_a,
    fecha_solicitud: rec.fecha_solicitud,
    solicitante: rec.solicitante,
    departamento: rec.departamento,
    gerencia_solicitante: rec.gerencia_solicitante,
    tipo_servicio: rec.tipo_servicio,
    id_sesion: rec.id_sesion,
  };
}

// Check if the current user belongs to the Administración department.
// Department-based only — role (admin/superadmin) is NOT considered.
// Wrapped in cache() to deduplicate across multiple calls in the same request
export const isRequisicionesAdmin = cache(async (): Promise<boolean> => {
  const access = await getRequisicionAccess();
  return access.can_process;
});

export const isCurrentUserCapacitacion = cache(async (): Promise<boolean> => {
  const access = await getRequisicionAccess();
  return isCapacitacionDept(access.home_dept);
});

// Returns the gerencia name for the current user's department (via
// departamentos.gerencia FK to gerencias.nombre). Cached per request.
export const getCurrentUserGerencia = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = await createAdminClient();
    const { data: usuario } = await admin
      .from("usuarios")
      .select("departamentos!usuarios_departamento_fkey(gerencia)")
      .eq("id_auth", user.id)
      .single();
    return (usuario?.departamentos as any)?.gerencia || null;
  } catch {
    return null;
  }
});

async function loadUsuarioRolesByApp(usuarioId: number): Promise<Record<string, string>> {
  try {
    const admin = await createAdminClient();
    const { data: assignments } = await admin
      .schema("authprisma")
      .from("user_app_roles")
      .select("app_id, role_id")
      .eq("usuario_id", usuarioId);
    if (!assignments?.length) return {};
    const { data: roles } = await admin
      .schema("authprisma")
      .from("roles")
      .select("id, slug, app_id");
    const { data: apps } = await admin
      .schema("authprisma")
      .from("apps")
      .select("id, slug");
    const role_map = new Map(
      (roles || []).map((r: { id: number; slug: string; app_id: number }) => [r.id, r]),
    );
    const app_map = new Map(
      (apps || []).map((a: { id: number; slug: string }) => [a.id, a.slug]),
    );
    const result: Record<string, string> = {};
    for (const row of assignments) {
      const role = role_map.get(row.role_id);
      const app_slug = app_map.get(row.app_id);
      if (role && app_slug) result[app_slug] = role.slug;
    }
    return result;
  } catch {
    return {};
  }
}

async function isUsuarioCoordinadorForDepartment(
  usuarioId: number,
  deptName: string | null | undefined,
): Promise<boolean> {
  if (!deptName) return false;
  const roles = await loadUsuarioRolesByApp(usuarioId);
  return dept_in_keys(deptName, stamp_coord_dept_keys(roles));
}

export const isCoordinadorForDepartment = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  const access = await getRequisicionAccess();
  return (
    access.can_approve_coord &&
    (access.coord_depts.some(
      (nombre) => nombre.toLowerCase() === deptName.trim().toLowerCase(),
    ) ||
      dept_in_keys(deptName, stamp_coord_dept_keys(access.roles_by_app)))
  );
});

export const isStAppLider = cache(async (): Promise<boolean> => {
  const access = await getRequisicionAccess();
  return access.roles_by_app.st?.toLowerCase() === "lider";
});

export const isSadministracionAppLider = cache(async (): Promise<boolean> => {
  const access = await getRequisicionAccess();
  return access.roles_by_app[ADMIN_APP_SLUG]?.toLowerCase() === "lider";
});

export const isLiderForInternaApproval = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  const access = await getRequisicionAccess();
  return access.can_approve_lider && deptNameInList(deptName, access.lider_depts);
});

export const departmentHasCoordinador = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  try {
    const admin = await createAdminClient();
    const { data: assignments } = await admin
      .schema("authprisma")
      .from("user_app_roles")
      .select("usuario_id, app_id, role_id");
    if (!assignments?.length) return false;
    const { data: roles } = await admin
      .schema("authprisma")
      .from("roles")
      .select("id, slug, app_id");
    const { data: apps } = await admin
      .schema("authprisma")
      .from("apps")
      .select("id, slug");
    const role_map = new Map(
      (roles || []).map((r: { id: number; slug: string }) => [r.id, r.slug]),
    );
    const app_map = new Map(
      (apps || []).map((a: { id: number; slug: string }) => [a.id, a.slug]),
    );
    const by_user = new Map<number, Record<string, string>>();
    for (const row of assignments) {
      const app_slug = app_map.get(row.app_id);
      const role_slug = role_map.get(row.role_id);
      if (!app_slug || !role_slug) continue;
      const current = by_user.get(row.usuario_id) || {};
      current[app_slug] = role_slug;
      by_user.set(row.usuario_id, current);
    }
    for (const roles_by_app of by_user.values()) {
      if (dept_in_keys(deptName, stamp_coord_dept_keys(roles_by_app))) return true;
    }
    return false;
  } catch {
    return false;
  }
});

export const canPlaceInterna = cache(async (deptName: string | null | undefined): Promise<boolean> => {
  if (!deptName) return false;
  const access = await getRequisicionAccess();
  if (!access.can_create) return false;
  return access.request_depts.some(
    (nombre) => nombre.toLowerCase() === deptName.trim().toLowerCase(),
  );
});

export const getCoordinatedDepartments = cache(async (): Promise<string[]> => {
  const access = await getRequisicionAccess();
  return access.can_approve_coord ? access.coord_depts : [];
});

export const getLedGerencias = cache(async (): Promise<string[]> => {
  const access = await getRequisicionAccess();
  if (!access.can_approve_lider) return [];
  const names = new Set<string>();
  for (const row of access.catalog) {
    if (row.gerencia && deptNameInList(row.nombre, access.lider_depts)) {
      names.add(row.gerencia);
    }
  }
  return [...names];
});

export const getDepartmentsInLedGerencias = cache(async (): Promise<string[]> => {
  const access = await getRequisicionAccess();
  return access.can_approve_lider ? access.lider_depts : [];
});

// Department names WITHOUT a coordinador inside the gerencias the current user
// leads. For those departments the lider is the fallback approver of externas.
export const getCoordinatorlessDepartmentsInLedGerencias = cache(async (): Promise<string[]> => {
  const gerencias = await getLedGerencias();
  if (gerencias.length === 0) return [];
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("departamentos")
      .select("nombre")
      .in("gerencia", gerencias);
    if (error) {
      console.error("[getCoordinatorlessDepartmentsInLedGerencias] Error:", error);
      return [];
    }
    const names = (data || [])
      .map((d: { nombre: string | null }) => d.nombre)
      .filter((n): n is string => Boolean(n));
    const leftover: string[] = [];
    for (const nombre of names) {
      if (!(await departmentHasCoordinador(nombre))) leftover.push(nombre);
    }
    return leftover;
  } catch {
    return [];
  }
});

// Back-compat: some callers still reference isRequisicionesCoordinador to decide
// whether to show coordinador-related UI. Derived from the schema (the user is the
// coordinador of AT LEAST ONE department).
export const isRequisicionesCoordinador = cache(async (): Promise<boolean> => {
  return (await getCoordinatedDepartments()).length > 0;
});

// True when the current user is the lider of AT LEAST ONE gerencia.
export const isRequisicionesLider = cache(async (): Promise<boolean> => {
  const access = await getRequisicionAccess();
  return access.can_approve_lider;
});

export const canAccessRequisicionesGestion = cache(async (): Promise<boolean> => {
  const access = await getRequisicionAccess();
  return access.can_process;
});

// Derive whether a requisicion record is a "Capacitacion" record based on the
// stored department (preferred) or, for legacy records, gerencia_solicitante.
function recordIsCapacitacion(record: { departamento?: string | null; gerencia_solicitante?: string | null }): boolean {
  if (record.departamento) return isCapacitacionDept(record.departamento);
  return (record.gerencia_solicitante || "").trim().toLowerCase() === "capacitacion";
}

// Get all OSIs for the dropdown (cached 5 minutes)
const getAllOSIsForRequisicionesCached = unstable_cache(
  async (target: DevDbTarget) => {
    const supabase = await createAdminClient(target);
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

export async function getAllOSIsForRequisiciones() {
  return getAllOSIsForRequisicionesCached(await peek_dev_db_target());
}

const getOsiNumbersForLookupCached = unstable_cache(
  async (target: DevDbTarget) => {
    const supabase = await createAdminClient(target);
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

export async function getOsiNumbersForLookup() {
  return getOsiNumbersForLookupCached(await peek_dev_db_target());
}

const getAllOsiSessionsCached = unstable_cache(
  async (target: DevDbTarget) => {
    const supabase = await createAdminClient(target);
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

export async function getAllOsiSessions() {
  return getAllOsiSessionsCached(await peek_dev_db_target());
}

const getBanksForDropdownCached = unstable_cache(
  async (target: DevDbTarget) => {
    const supabase = await createAdminClient(target);
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

export async function getBanksForDropdown() {
  return getBanksForDropdownCached(await peek_dev_db_target());
}

// Get current logged in user details
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*, departamentos!usuarios_departamento_fkey(nombre, gerencia)")
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

  const access = await getRequisicionAccess();
  if (!access.can_create) {
    throw new Error("No tiene permiso para crear requisiciones.");
  }
  const deptOk = !formData.departamento || access.request_depts.some(
    (nombre) => nombre.toLowerCase() === formData.departamento.trim().toLowerCase(),
  );
  if (!deptOk) {
    throw new Error("No puede crear requisiciones para ese departamento.");
  }

  const isCapacitacion = !formData.is_general && isCapacitacionDept(formData.departamento);
  const primaryOSI = formData.selectedOSIs[0] || null;
  const isInterna = formData.is_general;

  // Internas: coordinador → Admin estima montos → líder solo si supera umbral.
  // Externas: directo a Administración.
  let needsCoordinadorApproval = false;

  if (isInterna) {
    const isCoord = await isCoordinadorForDepartment(formData.departamento);
    if (!isCoord && (await departmentHasCoordinador(formData.departamento))) {
      needsCoordinadorApproval = true;
    }
  }

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
    // Externas require coordinador approval (or lider fallback) before reaching
    // Administración. Internas never use coordinador_estatus.
    // Internas require coordinador approval (when placed by an analyst in a
    // department that has a coordinador) before reaching the lider gate.
    // Externas never use coordinador_estatus.
    coordinador_estatus: isInterna && needsCoordinadorApproval ? "pendiente" : null,
    lider_estatus: null,
    costos_confirmados_at: null,
    // Locked at creation: rev.01 / 20/08/2026 for all new requisiciones.
    revision: "01",
    fecha_revision: "20/08/2026",
  };

  const fullRecord = { ...baseRecord, ...newColumns, original_snapshot: buildRequisicionSnapshot({ ...baseRecord, ...newColumns }) };

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

  // Notifications based on the workflow path:
  // - Internas that skip both gates (creator is lider) → notify Administración directly.
  // - Internas that skip coordinador gate but need lider → notify the gerencia's lider.
  // - Internas that need coordinador approval → notify the department's coordinador.
  // - Externas → notify Administración directly (no approval gate).
  if (isInterna && needsCoordinadorApproval) {
    await notifyCoordinadorOfPendingExterna(data.id, formData.solicitante, formData.departamento || "");
  } else {
    const label = isInterna
      ? "interna"
      : `de la OSI N° ${primaryOSI?.nro_osi || ""}`;
    await notifyAdminsOfNewRequisicion(data.id, formData.solicitante, label);
  }

  // Revalidate both the shell and potentially the capacitacion app list if needed
  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
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
      v_osi_lista!left (
        id_osi,
        nro_osi,
        servicio
      ),
      requisiciones_osis!requisiciones_osis_id_requisicion_fkey (
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

  // Resolve the approver who modified the requisicion (aprobador_edito_por is a
  // usuarios.id FK, not an id_auth).
  if (data?.aprobador_edito_por) {
    promises.push(
      (async () => {
        const { data: approverUser } = await supabase
          .from("usuarios")
          .select("nombre_apellido")
          .eq("id", data.aprobador_edito_por!)
          .single();
        (data as Record<string, unknown>).aprobador_edito_por_nombre = approverUser?.nombre_apellido || null;
      })(),
    );
  }

  // Resolve the gerencia from the DB (departamentos.gerencia) for accurate display.
  // Falls back to the stored gerencia_solicitante for legacy records without a
  // departamento, or to mapGerenciaSolicitante as a last resort.
  if (data?.departamento) {
    promises.push(
      (async () => {
        const { data: dept } = await supabase
          .from("departamentos")
          .select("gerencia")
          .ilike("nombre", data.departamento!)
          .maybeSingle();
        (data as Record<string, unknown>).gerencia_display = dept?.gerencia || data.gerencia_solicitante || null;
      })(),
    );
  } else {
    (data as Record<string, unknown>).gerencia_display = data?.gerencia_solicitante || null;
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

  const { data: authData } = await supabase.auth.getUser();
  if (authData.user?.id && data) {
    await annotateRequisicionApproverFlags([data], authData.user.id);
  }

  return data;
}

// Get OSI details for a list of ids (used by the view page)
export async function getOsisByIds(ids: number[]) {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_osi_lista")
    .select("id_osi, nro_osi")
    .in("id_osi", ids);

  if (error) {
    console.error("Error fetching OSIs by ids:", error);
    return [];
  }
  return data as { id_osi: number; nro_osi: string | null }[];
}

// Update requisition record
export async function updateRequisicionRecord(
  id: number,
  formData: RequisicionFormData,
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  // Locked once Administración marks it as procesada or rechazada (unless caller is admin).
  // Also locked once an approver (lider/coordinador) has modified it — the approver's
  // version becomes authoritative and the creator can no longer edit it.
  const { data: existing } = await supabase
    .from("requisiciones")
    .select("estatus_admin, aprobador_edito")
    .eq("id", id)
    .single();

  const isLocked = existing?.estatus_admin === "procesada" || existing?.estatus_admin === "rechazada";
  if (isLocked && !(await isRequisicionesAdmin())) {
    throw new Error("Esta requisición ya fue procesada por Administración y no puede editarse.");
  }
  if (existing?.aprobador_edito === true && !(await isRequisicionesAdmin())) {
    throw new Error("El aprobador ya modificó esta requisición. No puede editarla.");
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

  // Refresh the original_snapshot on every creator save so it always reflects the
  // creator's latest version. The approver's edit action does NOT refresh it.
  const fullRecord = { ...baseRecord, ...newColumns, original_snapshot: buildRequisicionSnapshot({ ...baseRecord, ...newColumns }) };

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
  revalidatePath("/requisiciones/gestion");
  revalidateTag("osis", "default");
  revalidateTag("osi-numbers", "default");
  return data;
}

const REQUISICION_LIST_SELECT = `
      *,
      v_osi_lista!left (
        id_osi,
        nro_osi,
        servicio,
        nombre_empresa,
        fecha_inicio_real
      ),
      facilitadores!left (
        nombre_apellido,
        cedula
      ),
      requisiciones_osis!requisiciones_osis_id_requisicion_fkey (
        id_osi
      )
    `;

export async function getOwnRequisiciones() {
  return fetchRequisicionesList("own");
}

export async function getGestionRequisiciones() {
  return fetchRequisicionesList("gestion");
}

// Get requisitions for list view.
// `own`: records the user created (or the Capacitacion department, for that dept).
// `gestion`: Administración inbox and/or lider/coordinador approval queues.
export async function getAllRequisiciones(isAdmin?: boolean) {
  if (isAdmin === undefined) {
    isAdmin = await isRequisicionesAdmin();
  }
  return fetchRequisicionesList(isAdmin ? "gestion" : "inbox");
}

async function annotateRequisicionApproverFlags(
  rows: any[],
  viewerAuthId: string,
) {
  for (const row of rows) {
    row._isOwn = Boolean(row.created_by && row.created_by === viewerAuthId);
    row._creatorIsDeptCoordinador = false;
    row._deptHasCoordinador = false;
  }
  try {
    const depts = [...new Set(rows.map((row) => row.departamento).filter(Boolean))];
    const hasCoordByDept = new Map<string, boolean>();
    await Promise.all(
      depts.map(async (dept) => {
        hasCoordByDept.set(dept, await departmentHasCoordinador(dept));
      }),
    );
    for (const row of rows) {
      row._deptHasCoordinador = hasCoordByDept.get(row.departamento) === true;
    }

    const admin = await createAdminClient();
    const authIds = [
      ...new Set(
        rows
          .map((row) => row.created_by)
          .filter((id: unknown): id is string => Boolean(id)),
      ),
    ];
    if (authIds.length === 0) return;
    const { data: users } = await admin
      .from("usuarios")
      .select("id, id_auth")
      .in("id_auth", authIds);
    const authToUsuario = new Map<string, number>(
      (users || [])
        .filter((u: { id: number; id_auth: string | null }) => u.id_auth)
        .map((u: { id: number; id_auth: string }) => [u.id_auth, u.id]),
    );
    const rolesByUsuario = new Map<number, Record<string, string>>();
    await Promise.all(
      [...new Set(authToUsuario.values())].map(async (usuarioId) => {
        rolesByUsuario.set(usuarioId, await loadUsuarioRolesByApp(usuarioId));
      }),
    );
    for (const row of rows) {
      const usuarioId = authToUsuario.get(row.created_by);
      if (!usuarioId) continue;
      row._creatorIsDeptCoordinador = dept_in_keys(
        row.departamento,
        stamp_coord_dept_keys(rolesByUsuario.get(usuarioId) || {}),
      );
    }
  } catch (error) {
    console.error("[annotateRequisicionApproverFlags]", error);
  }
}

async function fetchRequisicionesList(scope: "own" | "gestion" | "inbox") {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;

  if (!userId) return [];

  const isAdmin = await isRequisicionesAdmin();

  let query = supabase
    .from("requisiciones")
    .select(`
      *,
      v_osi_lista!left (
        id_osi,
        nro_osi,
        servicio,
        nombre_empresa,
        fecha_inicio_real
      ),
      facilitadores!left (
        nombre_apellido,
        cedula
      ),
      requisiciones_osis!requisiciones_osis_id_requisicion_fkey (
        id_osi
      )
    `)
    .order("id", { ascending: false })
    .is("deleted_at", null);

  if (scope === "gestion") {
    if (!isAdmin) return [];
    const adminQuery = query.or(
      "coordinador_estatus.is.null,coordinador_estatus.eq.aprobada",
    );
    let { data, error } = await adminQuery;
    if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
      console.warn("[getAllRequisiciones] approval columns not found, admin sees all");
      const fallback = await supabase
        .from("requisiciones")
        .select(REQUISICION_LIST_SELECT)
        .order("id", { ascending: false })
        .is("deleted_at", null);
      data = fallback.data;
      error = fallback.error;
    }
    if (error) {
      console.error("Error fetching requisiciones:", error);
      return [];
    }
    const adminRows = data || [];
    await annotateRequisicionApproverFlags(adminRows, userId);
    return adminRows;
  }


  if (scope === "own" || scope === "inbox") {
    const access = await getRequisicionAccess();
    const { data: ownData, error: ownError } = await query.eq("created_by", userId);
    if (ownError) {
      console.error("Error fetching requisiciones:", ownError);
      return [];
    }
    const merged: any[] = [...(ownData || [])];
    const ownIds = new Set<number>(merged.map((r: any) => r.id));

    if (access.can_access_depto && access.request_depts.length > 0) {
      const { data: mural, error: muralErr } = await supabase
        .from("requisiciones")
        .select(REQUISICION_LIST_SELECT)
        .in("departamento", access.request_depts)
        .is("deleted_at", null)
        .order("id", { ascending: false });
      if (muralErr) {
        console.error("Error fetching mural requisiciones:", muralErr);
      } else {
        for (const row of mural || []) {
          if (!ownIds.has(row.id)) {
            merged.push(row);
            ownIds.add(row.id);
          }
        }
      }
    }

    if (scope === "own") {
      await annotateRequisicionApproverFlags(merged, userId);
      return merged;
    }

    const addPending = (rows: any[] | null) => {
      for (const r of rows || []) {
        if (!ownIds.has(r.id)) {
          merged.push(r);
          ownIds.add(r.id);
        }
      }
    };

    const SELECT_RELATIONS = REQUISICION_LIST_SELECT;
    const coordDepts = await getCoordinatedDepartments();
    const isCoord = coordDepts.length > 0;
    const isLider = (await getDepartmentsInLedGerencias()).length > 0;

    if (isLider) {
      const { data: pendingAll, error: pendingErr } = await supabase
        .from("requisiciones")
        .select(SELECT_RELATIONS)
        .eq("lider_estatus", "pendiente")
        .neq("created_by", userId)
        .is("deleted_at", null)
        .order("id", { ascending: false });
      if (pendingErr) {
        console.error("[getAllRequisiciones] Error fetching pending approvals for lider:", pendingErr);
      } else {
        addPending(pendingAll);
      }
    }
    if (isCoord && coordDepts.length > 0) {
      const { data: pendingCoord, error: pendingErr } = await supabase
        .from("requisiciones")
        .select(SELECT_RELATIONS)
        .eq("coordinador_estatus", "pendiente")
        .neq("created_by", userId)
        .is("deleted_at", null)
        .in("departamento", coordDepts)
        .order("id", { ascending: false });
      if (pendingErr) {
        console.error("[getAllRequisiciones] Error fetching pending for coordinador:", pendingErr);
      } else {
        addPending(pendingCoord);
      }
    }

    const historyUsuarioId = await getCurrentUserUsuarioId();
    const addHistory = (rows: any[] | null) => {
      for (const r of rows || []) {
        if (!r) continue;
        r._isApprovalHistory = true;
        if (!ownIds.has(r.id)) {
          merged.push(r);
          ownIds.add(r.id);
        } else {
          const existing = merged.find((m: any) => m.id === r.id);
          if (existing) existing._isApprovalHistory = true;
        }
      }
    };

    if (isLider && historyUsuarioId) {
      const { data: liderHistory, error: histErr } = await supabase
        .from("requisiciones")
        .select(SELECT_RELATIONS)
        .eq("tipo_solicitud", "Interno")
        .eq("lider_por", historyUsuarioId)
        .in("lider_estatus", ["aprobada", "rechazada"])
        .is("deleted_at", null)
        .order("id", { ascending: false });
      if (!histErr) addHistory(liderHistory);
    }

    if (isCoord && userId) {
      const { data: coordHistory, error: histErr } = await supabase
        .from("requisiciones")
        .select(SELECT_RELATIONS)
        .eq("tipo_solicitud", "Interno")
        .eq("coordinador_por", userId)
        .in("coordinador_estatus", ["aprobada", "rechazada"])
        .is("deleted_at", null)
        .order("id", { ascending: false });
      if (!histErr) addHistory(coordHistory);
    }

    merged.sort((a: any, b: any) => b.id - a.id);
    await annotateRequisicionApproverFlags(merged, userId);
    return merged;
  }

  return [];
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
  revalidatePath("/requisiciones/gestion");
}

// Mark a requisition as procesada / pendiente / rechazada (Administración only).
// When rejecting, a motivo (reason) is required and persisted + included in the
// creator notification.
export async function setRequisicionEstatus(
  id: number,
  estatus: "pendiente" | "procesada" | "rechazada",
  motivoRechazo?: string,
  tasaCambio?: number | null,
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para cambiar el estatus de requisiciones.");
  }

  if (estatus === "procesada") {
    const gateClient = await createAdminClient();
    const { data: gate } = await gateClient
      .from("requisiciones")
      .select("tipo_solicitud, coordinador_estatus, lider_estatus, costos_confirmados_at, additional_items")
      .eq("id", id)
      .maybeSingle();
    if (gate?.tipo_solicitud === "Interno") {
      const coordDone = !gate.coordinador_estatus || gate.coordinador_estatus === "aprobada";
      if (!coordDone) {
        throw new Error("La interna aún no tiene el sello del coordinador.");
      }
      if (!gate.costos_confirmados_at) {
        throw new Error("Debe confirmar los montos estimados antes de procesar.");
      }
      const umbral = await getUmbralLiderUsd();
      const total = requisicion_items_total(
        (gate.additional_items || []) as Parameters<typeof requisicion_items_total>[0],
      );
      if (interna_needs_lider(total, umbral) && gate.lider_estatus !== "aprobada") {
        throw new Error("Esta interna supera el umbral y requiere aprobación del líder.");
      }
    }
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
  // Snapshot the exchange rate when processing so future views show the rate
  // that was actually used at payment time, not today's live rate.
  if (estatus === "procesada" && tasaCambio != null && !isNaN(tasaCambio)) {
    update.tasa_cambio = tasaCambio;
    update.tasa_cambio_at = new Date().toISOString();
  }

  const adminClient = await createAdminClient();
  let { error } = await adminClient
    .from("requisiciones")
    .update(update)
    .eq("id", id);

  // If the tasa_cambio columns don't exist yet (migration not applied), retry
  // without them so the estatus change still goes through.
  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[setRequisicionEstatus] tasa_cambio columns not found, retrying without rate snapshot");
    const { tasa_cambio, tasa_cambio_at, ...updateWithoutRate } = update;
    void tasa_cambio; void tasa_cambio_at;
    const retry = await adminClient
      .from("requisiciones")
      .update(updateWithoutRate)
      .eq("id", id);
    error = retry.error;
  }

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
        v_osi_formato_completo!left (nro_osi)
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
  revalidatePath("/requisiciones/gestion");
}

// Coordinador approves a pending INTERNA. After approval, the requisicion
// moves to the Lider gate (or straight to Administración if the creator IS the
// approving lider).
export async function approveRequisicionByCoordinador(id: number) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const admin = await createAdminClient();

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, coordinador_estatus, solicitante, created_by, departamento, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo!left (nro_osi)")
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
  if (existing.created_by && userId && existing.created_by === userId) {
    throw new Error("No puede aprobar su propia requisición como coordinador.");
  }
  if (existing.created_by && existing.departamento) {
    const { data: creatorUser } = await admin
      .from("usuarios")
      .select("id")
      .eq("id_auth", existing.created_by)
      .maybeSingle();
    if (
      creatorUser?.id &&
      (await isUsuarioCoordinadorForDepartment(creatorUser.id, existing.departamento))
    ) {
      throw new Error("Esta requisición la creó un coordinador y pasa directo a Administración.");
    }
  }
  // Verify the caller is the coordinador of the requisicion's department.
  if (existing.departamento) {
    const isCoord = await isCoordinadorForDepartment(existing.departamento);
    if (!isCoord) {
      throw new Error("Solo el coordinador del departamento puede aprobar esta requisición interna.");
    }
  }

  const updateData: Record<string, any> = {
    coordinador_estatus: "aprobada",
    coordinador_por: userId,
    coordinador_at: new Date().toISOString(),
    lider_estatus: null,
  };

  const { error } = await admin
    .from("requisiciones")
    .update(updateData)
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[approveRequisicionByCoordinador] coordinador columns not found, notifying admin only");
  } else if (error) {
    throw error;
  }

  await notifyAdminsOfNewRequisicion(id, existing.solicitante || "", "interna");

  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}

// Coordinador rejects a pending INTERNA with a reason. The creator is notified
// and the requisicion is locked for further editing.
export async function rejectRequisicionByCoordinador(id: number, motivo: string) {
  if (!motivo?.trim()) {
    throw new Error("Debe indicar el motivo del rechazo.");
  }

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const admin = await createAdminClient();

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, coordinador_estatus, solicitante, created_by, departamento, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo!left (nro_osi)")
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
  // Verify the caller is the coordinador of the requisicion's department.
  if (existing.departamento) {
    const isCoord = await isCoordinadorForDepartment(existing.departamento);
    if (!isCoord) {
      throw new Error("Solo el coordinador del departamento puede rechazar esta requisición interna.");
    }
  }

  // Try updating with new columns; fall back to just notifying creator if they don't exist.
  // NOTE: coordinador_por is a UUID column (stores auth uid), unlike lider_por
  // which is int4 (stores usuarios.id). Use the auth UUID here.
  const { error } = await admin
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
    await notifyCreatorOfCoordinadorRechazada(id, existing.created_by, "interna", motivo.trim());
  }

  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}

// Lider approves a pending INTERNA. After approval, Administración is notified
// (the requisicion becomes visible to them).
export async function approveRequisicionByLider(id: number) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;
  const usuarioId = await getCurrentUserUsuarioId();

  const admin = await createAdminClient();

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, lider_estatus, coordinador_estatus, solicitante, created_by, departamento, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo!left (nro_osi)")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud !== "Interno") {
    throw new Error("Solo las requisiciones internas requieren aprobación del lider.");
  }
  if (existing.lider_estatus !== "pendiente") {
    throw new Error("Esta requisición no está pendiente de aprobación del líder.");
  }
  // A creator can never approve their own interna.
  if (existing.created_by && userId && existing.created_by === userId) {
    throw new Error("No puede aprobar su propia requisición interna.");
  }
  // Verify the caller is the lider who approves internas for this department.
  if (existing.departamento) {
    const isLider = await isLiderForInternaApproval(existing.departamento);
    if (!isLider) {
      throw new Error("Solo el lider de la gerencia puede aprobar esta requisición interna.");
    }
  }

  // Try updating with new columns; fall back to just notifying admin if they don't exist.
  const { error } = await admin
    .from("requisiciones")
    .update({
      lider_estatus: "aprobada",
      lider_por: usuarioId,
      lider_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[approveRequisicionByLider] lider columns not found, notifying admin only");
  } else if (error) {
    throw error;
  }

  // Now that the lider approved, surface the requisicion to Administración.
  await notifyAdminsOfNewRequisicion(id, existing.solicitante || "", "interna");

  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}

// Lider rejects a pending INTERNA with a reason. The creator is notified and
// the requisicion is locked for further editing.
export async function rejectRequisicionByLider(id: number, motivo: string) {
  if (!motivo?.trim()) {
    throw new Error("Debe indicar el motivo del rechazo.");
  }

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;
  const usuarioId = await getCurrentUserUsuarioId();

  const admin = await createAdminClient();

  // Try selecting with new columns; fall back to base columns if they don't exist.
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, lider_estatus, coordinador_estatus, solicitante, created_by, departamento, v_osi_formato_completo!left (nro_osi)")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, solicitante, created_by, v_osi_formato_completo!left (nro_osi)")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud !== "Interno") {
    throw new Error("Solo las requisiciones internas requieren aprobación del lider.");
  }
  if (existing.lider_estatus !== "pendiente") {
    throw new Error("Esta requisición no está pendiente de aprobación del líder.");
  }
  // A creator can never reject their own interna.
  if (existing.created_by && userId && existing.created_by === userId) {
    throw new Error("No puede rechazar su propia requisición interna.");
  }
  // Verify the caller is the lider who approves internas for this department.
  if (existing.departamento) {
    const isLider = await isLiderForInternaApproval(existing.departamento);
    if (!isLider) {
      throw new Error("Solo el lider de la gerencia puede rechazar esta requisición interna.");
    }
  }

  // Try updating with new columns; fall back to just notifying creator if they don't exist.
  const { error } = await admin
    .from("requisiciones")
    .update({
      lider_estatus: "rechazada",
      lider_por: usuarioId,
      lider_at: new Date().toISOString(),
      motivo_rechazo_lider: motivo.trim(),
    })
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    console.warn("[rejectRequisicionByLider] lider columns not found, notifying creator only");
  } else if (error) {
    throw error;
  }

  if (existing.created_by) {
    await notifyCreatorOfLiderRechazada(id, existing.created_by, "interna", motivo.trim());
  }

  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}

// Approver (lider for internas, coordinador/lider-fallback for externas) edits the
// CONTENT of a pending requisicion before approving. The original_snapshot is
// preserved (captured at creation or, for legacy records, from the current state
// on the first edit) so the solicitor can see a diff of what changed. This action
// does NOT change lider_estatus / coordinador_estatus — that stays "pendiente"
// until the approver explicitly approves/rejects.
export async function updateRequisicionByApprover(
  id: number,
  updates: {
    additional_items?: any[];
    observaciones_compras?: string;
    prioridad?: string;
    corresponde_a?: string;
    fecha_solicitud?: string;
    solicitante?: string;
  },
) {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;
  const usuarioId = await getCurrentUserUsuarioId();

  const admin = await createAdminClient();

  // Fetch the record with approval + snapshot columns. Fall back to base columns
  // if the new columns don't exist yet (migration not applied).
  let existing: any;
  let fetchError: any;
  ({ data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, estatus_admin, lider_estatus, coordinador_estatus, departamento, created_by, original_snapshot, aprobador_edito, additional_items, observaciones_compras, prioridad, corresponde_a, fecha_solicitud, solicitante, gerencia_solicitante, tipo_servicio, id_sesion, cant_traslado, cant_impresion, cant_honorarios, cant_informe_final, dias_traslado, costo_traslado, impresion_total, honorarios_total, informe_final_total, facilitador, cod_facilitador, cedula_facilitador, rif_facilitador, telefono_facilitador, banco, nro_cuenta, osi_fixed_items")
    .eq("id", id)
    .single());

  if (fetchError && (fetchError.message || "").includes("column") && (fetchError.message || "").includes("does not exist")) {
    const fallback = await admin
      .from("requisiciones")
      .select("tipo_solicitud, estatus_admin, departamento, created_by, additional_items, observaciones_compras, prioridad, corresponde_a, fecha_solicitud, solicitante, gerencia_solicitante, tipo_servicio, id_sesion, cant_traslado, cant_impresion, cant_honorarios, cant_informe_final, dias_traslado, costo_traslado, impresion_total, honorarios_total, informe_final_total, facilitador, cod_facilitador, cedula_facilitador, rif_facilitador, telefono_facilitador, banco, nro_cuenta, osi_fixed_items")
      .eq("id", id)
      .single();
    existing = fallback.data;
    fetchError = fallback.error;
  }

  if (fetchError || !existing) throw new Error("Requisición no encontrada.");

  const isInterna = existing.tipo_solicitud === "Interno";
  const adminProcessed = existing.estatus_admin === "procesada" || existing.estatus_admin === "rechazada";

  // Verify the caller is the approver (lider for internas, coordinador/lider-fallback
  // for externas). Edits are allowed while the approval is pending OR after the
  // approver has approved (they may realize they need to change something before
  // Administración processes it) — but NOT after a rejection (that's final) and
  // NOT after Administración has processed it.
  if (isInterna) {
    if (existing.lider_estatus === "rechazada") {
      throw new Error("Esta requisición interna fue rechazada por el lider y no puede editarse.");
    }
    if (adminProcessed) {
      throw new Error("Esta requisición ya fue procesada por Administración y no puede editarse.");
    }
    if (existing.departamento) {
      const isLider = await isLiderForInternaApproval(existing.departamento);
      if (!isLider) {
        throw new Error("Solo el lider de la gerencia puede editar esta requisición interna.");
      }
    }
  } else {
    if (existing.coordinador_estatus === "rechazada") {
      throw new Error("Esta requisición externa fue rechazada por el coordinador y no puede editarse.");
    }
    if (adminProcessed) {
      throw new Error("Esta requisición ya fue procesada por Administración y no puede editarse.");
    }
    if (existing.departamento) {
      const isCoord = await isCoordinadorForDepartment(existing.departamento);
      if (!isCoord) {
        const hasCoord = await departmentHasCoordinador(existing.departamento);
        if (hasCoord) {
          throw new Error("Solo el coordinador del departamento puede editar esta requisición externa.");
        }
        const isLider = await isLiderForDepartmentGerencia(existing.departamento);
        if (!isLider) {
          throw new Error("Solo el lider de la gerencia puede editar esta requisición externa (el departamento no tiene coordinador).");
        }
      }
    }
  }

  // A creator can never edit their own requisicion as an approver.
  if (existing.created_by && userId && existing.created_by === userId) {
    throw new Error("No puede modificar su propia requisición como aprobador.");
  }

  // Build the update payload from the provided fields only.
  const updatePayload: Record<string, any> = {};
  if (updates.additional_items !== undefined) updatePayload.additional_items = updates.additional_items;
  if (updates.observaciones_compras !== undefined) updatePayload.observaciones_compras = updates.observaciones_compras;
  if (updates.prioridad !== undefined) updatePayload.prioridad = updates.prioridad;
  if (updates.corresponde_a !== undefined) updatePayload.corresponde_a = updates.corresponde_a;
  if (updates.fecha_solicitud !== undefined) updatePayload.fecha_solicitud = updates.fecha_solicitud;
  if (updates.solicitante !== undefined) updatePayload.solicitante = updates.solicitante;

  // If this is the first approver edit and no original_snapshot exists (legacy
  // record created before the migration), capture it NOW from the current live
  // state so the diff has a baseline.
  const isFirstEdit = existing.aprobador_edito !== true;
  if (isFirstEdit && !existing.original_snapshot) {
    updatePayload.original_snapshot = buildRequisicionSnapshot(existing);
  }

  // Mark that the approver modified the requisicion.
  updatePayload.aprobador_edito = true;
  updatePayload.aprobador_edito_por = usuarioId;
  updatePayload.aprobador_edito_at = new Date().toISOString();

  const { error } = await admin
    .from("requisiciones")
    .update(updatePayload)
    .eq("id", id);

  if (error && (error.message || "").includes("column") && (error.message || "").includes("does not exist")) {
    // New columns not found — retry with just the content fields (no snapshot/approver tracking).
    console.warn("[updateRequisicionByApprover] approver columns not found, updating content only");
    const contentOnly: Record<string, any> = {};
    if (updates.additional_items !== undefined) contentOnly.additional_items = updates.additional_items;
    if (updates.observaciones_compras !== undefined) contentOnly.observaciones_compras = updates.observaciones_compras;
    if (updates.prioridad !== undefined) contentOnly.prioridad = updates.prioridad;
    if (updates.corresponde_a !== undefined) contentOnly.corresponde_a = updates.corresponde_a;
    if (updates.fecha_solicitud !== undefined) contentOnly.fecha_solicitud = updates.fecha_solicitud;
    if (updates.solicitante !== undefined) contentOnly.solicitante = updates.solicitante;
    const { error: contentErr } = await admin
      .from("requisiciones")
      .update(contentOnly)
      .eq("id", id);
    if (contentErr) throw contentErr;
  } else if (error) {
    throw error;
  }

  // Notify the creator on the FIRST edit only (avoid spam on subsequent saves).
  if (isFirstEdit && existing.created_by) {
    const approverRole = isInterna ? "Lider" : "Coordinador";
    const requisicionLabel = isInterna
      ? `interna #${id}`
      : `de la OSI N° ${(existing as any).v_osi_formato_completo?.nro_osi || ""}`;
    await notifyCreatorOfApproverChanges(id, existing.created_by, requisicionLabel, approverRole);
  }

  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
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
  revalidatePath("/requisiciones/gestion");
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
  revalidatePath("/requisiciones/gestion");
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
  revalidatePath("/requisiciones/gestion");
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
      v_osi_formato_completo!left (nro_osi)
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
  revalidatePath("/requisiciones/gestion");
  return { verifiedCount, totalCount };
}

// Get facilitators for dropdown with banking details (cached 5 minutes)
const getFacilitatorsForDropdownCached = unstable_cache(
  async (target: DevDbTarget) => {
    const supabase = await createAdminClient(target);
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

export async function getFacilitatorsForDropdown() {
  return getFacilitatorsForDropdownCached(await peek_dev_db_target());
}

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
      requisiciones_osis!requisiciones_osis_id_requisicion_fkey (id_osi)
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
    .select("created_by, estatus_admin, acuse_recibido, procesada_por, tipo_solicitud, v_osi_formato_completo!left (nro_osi)")
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
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}

const DEFAULT_UMBRAL_LIDER_USD = 100;

export async function getUmbralLiderUsd(): Promise<number> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("requisiciones_ajustes")
      .select("umbral_lider_usd")
      .eq("id", 1)
      .maybeSingle();
    if (error || data?.umbral_lider_usd == null) return DEFAULT_UMBRAL_LIDER_USD;
    return Number(data.umbral_lider_usd);
  } catch {
    return DEFAULT_UMBRAL_LIDER_USD;
  }
}

export async function updateUmbralLiderUsd(umbral: number) {
  const access = await getRequisicionAccess();
  if (!access.can_edit_config) {
    throw new Error("Solo el líder de Administración o Admin TED pueden cambiar el umbral.");
  }
  const value = Number(umbral);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("El umbral debe ser un número mayor o igual a 0.");
  }
  const admin = await createAdminClient();
  const { error } = await admin.from("requisiciones_ajustes").upsert({
    id: 1,
    umbral_lider_usd: value,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath("/requisiciones/configuracion");
}

export async function confirmInternaCostos(id: number, items: RequisicionItem[]) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("Solo Administración puede confirmar la estimación de costos.");
  }
  const admin = await createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, coordinador_estatus, lider_estatus, solicitante, departamento, estatus_admin")
    .eq("id", id)
    .single();
  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud !== "Interno") {
    throw new Error("La confirmación de costos aplica a requisiciones internas.");
  }
  if (existing.estatus_admin === "procesada" || existing.estatus_admin === "rechazada") {
    throw new Error("No se puede reestimar una requisición ya tramitada.");
  }
  const coordDone = !existing.coordinador_estatus || existing.coordinador_estatus === "aprobada";
  if (!coordDone) {
    throw new Error("Espere el sello del coordinador antes de estimar montos.");
  }
  if (existing.lider_estatus === "aprobada") {
    throw new Error("El líder ya aprobó. No se puede cambiar la estimación.");
  }

  const normalized = (items || []).map((item) => {
    const total = Number(item.total) || 0;
    if (total > 0) {
      return apply_item_money_updates(item, { total });
    }
    return apply_item_money_updates(item, {
      costo_unitario: Number(item.costo_unitario) || 0,
    });
  });
  const total = requisicion_items_total(normalized);
  const umbral = await getUmbralLiderUsd();
  const needsLider = interna_needs_lider(total, umbral);
  const now = new Date().toISOString();

  const { error } = await admin
    .from("requisiciones")
    .update({
      additional_items: normalized,
      costos_confirmados_at: now,
      lider_estatus: needsLider ? "pendiente" : null,
    })
    .eq("id", id);
  if (error) throw error;

  if (needsLider) {
    await notifyLiderOfPendingInterna(id, existing.solicitante || "", existing.departamento || "");
  }

  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
  return { needsLider, total, umbral };
}
