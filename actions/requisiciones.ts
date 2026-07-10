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
} from "@/actions/requisicion-notifications";

const ADMIN_ROLES = ["admin", "superadmin"];

// Check if the current user can manage all requisiciones (Administración)
export async function isRequisicionesAdmin(): Promise<boolean> {
  const role = (await getUserRole())?.toLowerCase() || "";
  return ADMIN_ROLES.includes(role);
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

  await notifyAdminsOfNewRequisicion(data.id, formData.solicitante);

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
    .single();

  if (error) {
    console.error("Error fetching requisicion record:", error);
    return null;
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
        servicio
      ),
      facilitadores!left (
        nombre_apellido,
        cedula
      ),
      requisiciones_osis (
        id_osi
      )
    `)
    .order("id", { ascending: false });

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

  const { error } = await supabase
    .from("requisiciones")
    .delete()
    .eq("id", id);

  if (error) throw error;
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
      .select("created_by")
      .eq("id", id)
      .single();

    console.log(`[setRequisicionEstatus] id=${id} estatus=${estatus} created_by=${req?.created_by} fetchError=${fetchError?.message}`);

    if (req?.created_by) {
      if (estatus === "procesada") {
        console.log(`[setRequisicionEstatus] Calling notifyCreatorOfProcesada for creator ${req.created_by}`);
        await notifyCreatorOfProcesada(id, req.created_by);
      } else if (estatus === "rechazada") {
        console.log(`[setRequisicionEstatus] Calling notifyCreatorOfRechazada for creator ${req.created_by}`);
        await notifyCreatorOfRechazada(id, req.created_by);
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
  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select("additional_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) throw fetchError;

  const items: RequisicionItem[] = (record?.additional_items || []).map(
    (item: RequisicionItem) =>
      item.id === itemId ? { ...item, verificacion } : item,
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
  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select("osi_fixed_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) throw fetchError;

  const fixedItems: OSIFixedItem[] = (record?.osi_fixed_items || []).map(
    (fi: OSIFixedItem) =>
      fi.id_osi === idOsi ? { ...fi, [field]: verificacion } : fi,
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
  const { data: record, error: fetchError } = await supabase
    .from("requisiciones")
    .select("additional_items, osi_fixed_items")
    .eq("id", requisicionId)
    .single();

  if (fetchError) throw fetchError;

  const items: RequisicionItem[] = (record?.additional_items || []).map(
    (item: RequisicionItem) => ({ ...item, verificacion: "listo" }),
  );

  const fixedItems: OSIFixedItem[] = (record?.osi_fixed_items || []).map(
    (fi: OSIFixedItem) => ({
      ...fi,
      verificacion_traslado: "listo" as const,
      verificacion_impresion: "listo" as const,
      verificacion_honorarios: "listo" as const,
      verificacion_informe_final: "listo" as const,
    }),
  );

  const { error } = await supabase
    .from("requisiciones")
    .update({ additional_items: items, osi_fixed_items: fixedItems })
    .eq("id", requisicionId);

  if (error) throw error;
  revalidatePath("/requisiciones");
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
