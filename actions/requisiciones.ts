"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserRole } from "@/actions/apps";
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
} from "@/actions/requisicion-notifications";
import { getUsdToVesRate } from "@/lib/exchange-rate";

const ADMIN_ROLES = ["admin", "superadmin"];

// Check if the current user can manage all requisiciones (Administración)
export async function isRequisicionesAdmin(): Promise<boolean> {
  const role = (await getUserRole())?.toLowerCase() || "";
  if (ADMIN_ROLES.includes(role)) return true;

  // Fallback: check if user belongs to the Administración department
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
}

// Get all OSIs for the dropdown
export async function getAllOSIsForRequisiciones() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_osi_formato_completo")
    .select("*")
    .order("id_osi", { ascending: false });

  if (error) {
    console.error("Error fetching OSIs:", error);
    return [];
  }
  return data as OSIFullData[];
}

// Get all banks for the dropdown
export async function getBanksForDropdown() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cat_bancos")
    .select("id, nombre")
    .order("nombre");

  if (error) {
    console.error("Error fetching banks:", error);
    return [];
  }
  return data as { id: number; nombre: string }[];
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

  const isCapacitacion = !formData.is_general && formData.gerencia_solicitante?.trim().toLowerCase() === "capacitacion";
  const primaryOSI = formData.selectedOSIs[0] || null;

  // Calculate totals for fixed items as requested (Cant is removed from UI, so we use 1)
  const totalTraslado = (formData.dias_traslado || 0) * (formData.costo_traslado || 0);
  const totalImpresion = (formData.impresion_total || 0);
  const totalHonorarios = (formData.honorarios_total || 0);
  const totalInformeFinal = (formData.informe_final_total || 0);

  const record = {
    id_osi: primaryOSI?.id_osi || null,
    solicitante: formData.solicitante,
    gerencia_solicitante: formData.gerencia_solicitante,
    fecha_solicitud: formData.fecha_solicitud,
    // Auto-derived: Internas = General (no OSI), Externas = OSI-based
    tipo_solicitud: formData.is_general ? "Interno" : "Externo",
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

  const { data, error } = await supabase
    .from("requisiciones")
    .insert(record)
    .select()
    .single();

  if (error) throw error;

  await syncRequisicionOsis(data.id, formData);

  const requisicionLabel = formData.is_general
    ? "interna"
    : `de la OSI N° ${primaryOSI?.nro_osi || formData.selectedOSIs[0]?.nro_osi || ""}`;
  await notifyAdminsOfNewRequisicion(data.id, formData.solicitante, requisicionLabel);

  // Revalidate both the shell and potentially the capacitacion app list if needed
  revalidatePath("/requisiciones");
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

  if (data?.procesada_por) {
    const { data: procesadaPorUser } = await supabase
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id_auth", data.procesada_por)
      .single();
    (data as Record<string, unknown>).procesada_por_nombre = procesadaPorUser?.nombre_apellido || null;
  }

  // Resolve distinct item-level verificador ids (additional_items + osi_fixed_items) to names
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
  if (verificadorIds.size > 0) {
    const { data: verificadores } = await supabase
      .from("usuarios")
      .select("id_auth, nombre_apellido")
      .in("id_auth", Array.from(verificadorIds));
    const map: Record<string, string> = {};
    (verificadores || []).forEach((u: { id_auth: string | null; nombre_apellido: string }) => {
      if (u.id_auth) map[u.id_auth] = u.nombre_apellido;
    });
    (data as Record<string, unknown>).verificado_por_map = map;
  }

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

  const isCapacitacion = !formData.is_general && formData.gerencia_solicitante?.trim().toLowerCase() === "capacitacion";
  const primaryOSI = formData.selectedOSIs[0] || null;

  // Calculate totals for fixed items
  const totalTraslado = (formData.dias_traslado || 0) * (formData.costo_traslado || 0);
  const totalImpresion = (formData.impresion_total || 0);
  const totalHonorarios = (formData.honorarios_total || 0);
  const totalInformeFinal = (formData.informe_final_total || 0);

  const record = {
    id_osi: primaryOSI?.id_osi || null,
    solicitante: formData.solicitante,
    gerencia_solicitante: formData.gerencia_solicitante,
    fecha_solicitud: formData.fecha_solicitud,
    // Auto-derived: Internas = General (no OSI), Externas = OSI-based
    tipo_solicitud: formData.is_general ? "Interno" : "Externo",
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

  const { data, error } = await supabase
    .from("requisiciones")
    .update(record)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await syncRequisicionOsis(id, formData);

  revalidatePath("/requisiciones");
  return data;
}

// Get requisitions for list view.
// Administración (admin/superadmin) sees all records; regular users only their own.
export async function getAllRequisiciones() {
  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;

  if (!userId) return [];

  const isAdmin = await isRequisicionesAdmin();

  let query = supabase
    .from("requisiciones")
    .select(`
      *,
      v_osi_formato_completo!left (
        id_osi,
        nro_osi,
        servicio,
        fecha_inicio_real
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

  if (!isAdmin) {
    query = query.eq("created_by", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching requisiciones:", error);
    return [];
  }
  return data;
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

// Mark a requisition as procesada / pendiente (Administración only)
export async function setRequisicionEstatus(
  id: number,
  estatus: "pendiente" | "procesada" | "rechazada",
) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para cambiar el estatus de requisiciones.");
  }

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const isResolved = estatus === "procesada" || estatus === "rechazada";

  const { error } = await supabase
    .from("requisiciones")
    .update({
      estatus_admin: estatus,
      procesada_por: isResolved ? userId : null,
      procesada_at: isResolved ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw error;

  if (isResolved) {
    const adminClient = await createAdminClient();
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
        await notifyCreatorOfRechazada(id, req.created_by, requisicionLabel);
      }
    } else {
      console.warn(`[setRequisicionEstatus] No created_by found for requisicion ${id}, skipping creator notification`);
    }
  }

  revalidatePath("/requisiciones");
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

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select("additional_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) throw fetchError;

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

  const { error } = await supabase
    .from("requisiciones")
    .update({ additional_items: items })
    .eq("id", requisicionId);

  if (error) throw error;
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

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select("osi_fixed_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) throw fetchError;

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

  const { error } = await supabase
    .from("requisiciones")
    .update({ osi_fixed_items: fixedItems })
    .eq("id", requisicionId);

  if (error) throw error;
  revalidatePath("/requisiciones");
}

// Mark all additional_items and osi_fixed_items as "listo" (Administración only)
export async function markAllItemsVerificadas(requisicionId: number) {
  if (!(await isRequisicionesAdmin())) {
    throw new Error("No tiene permisos para verificar items de requisiciones.");
  }

  const supabase = await createClient();
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id || null;

  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select("additional_items, osi_fixed_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) throw fetchError;

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

  const { error } = await supabase
    .from("requisiciones")
    .update({ additional_items: items, osi_fixed_items: fixedItems })
    .eq("id", requisicionId);

  if (error) throw error;
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

// Get facilitators for dropdown with banking details
export async function getFacilitatorsForDropdown() {
  const supabase = await createClient();
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
    console.error("Error updating requisicion snapshot:", snapshotError);
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
