"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import type {
  Proveedor,
  ProveedorWithDetails,
  DatoBancarioProveedor,
  ProveedorAuditoria,
  ProveedorNota,
  EstadoVenezuela,
  CiudadVenezuela,
  ImpactoNivel,
  EstadoOperativoProveedor,
} from "@/types/proveedores";

/**
 * Helper to get the current authenticated user's local usuario id
 */
async function getCurrentUsuarioId(): Promise<{ id: number; nombre: string } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = await createAdminClient();
    const { data } = await admin
      .from("usuarios")
      .select("id, nombre_apellido")
      .eq("id_auth", user.id)
      .single();

    return data ? { id: data.id, nombre: data.nombre_apellido } : null;
  } catch (err) {
    console.error("[actions/proveedores] getCurrentUsuarioId error:", err);
    return null;
  }
}

async function recordAudit(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  record: Record<string, unknown>
) {
  const { error } = await admin.from("admin_auditoria_proveedores").insert(record);
  if (error) {
    await admin.from("rh_auditoria_proveedores").insert(record);
  }
}

/**
 * Fetch all proveedores with resolved lookups and banking count
 */
export async function fetchProveedores(filters?: {
  search?: string;
  impacto?: ImpactoNivel | "todos";
  estado?: EstadoOperativoProveedor | "todos";
}): Promise<ProveedorWithDetails[]> {
  const admin = await createAdminClient();

  let query = admin
    .from("proveedores")
    .select(`
      *,
      estado:cat_estados_venezuela!proveedores_id_estado_geografico_fkey(nombre_estado),
      ciudad:cat_ciudades!proveedores_id_ciudad_fkey(nombre_ciudad),
      facilitador:facilitadores!proveedores_id_facilitador_vinculado_fkey(nombre_apellido),
      creador:usuarios!proveedores_creado_por_fkey(nombre_apellido),
      datos_bancarios(id)
    `)
    .order("nombre_razon_social", { ascending: true });

  if (filters?.impacto && filters.impacto !== "todos") {
    query = query.eq("impacto_nivel", filters.impacto);
  }

  if (filters?.estado && filters.estado !== "todos") {
    query = query.eq("estado_operativo", filters.estado);
  }

  if (filters?.search && filters.search.trim() !== "") {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `nombre_razon_social.ilike.${term},rif_proveedor.ilike.${term},persona_contacto.ilike.${term},email.ilike.${term},telefono.ilike.${term},producto_servicio_admin.ilike.${term}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("[actions/proveedores] fetchProveedores error:", error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const cuentas = (row.datos_bancarios as { id: number }[] | null) ?? [];
    return {
      id: row.id as number,
      nombre_razon_social: (row.nombre_razon_social as string) ?? "",
      rif_proveedor: row.rif_proveedor as string | null,
      producto_servicio_admin: row.producto_servicio_admin as string | null,
      impacto_nivel: (row.impacto_nivel as ImpactoNivel) ?? "bajo",
      tipo_impacto: row.tipo_impacto as string | null,
      estado_operativo: (row.estado_operativo as EstadoOperativoProveedor) ?? "activo",
      persona_contacto: row.persona_contacto as string | null,
      cedula_contacto: row.cedula_contacto as string | null,
      telefono: row.telefono as string | null,
      email: row.email as string | null,
      direccion_fiscal: row.direccion_fiscal as string | null,
      direccion_referencia: row.direccion_referencia as string | null,
      id_estado_geografico: row.id_estado_geografico as number | null,
      id_ciudad: row.id_ciudad as number | null,
      id_estatus: row.id_estatus as number | null,
      fuente: row.fuente as string | null,
      condicion_pago: row.condicion_pago as string | null,
      dias_credito: (row.dias_credito as number) ?? 0,
      moneda_habitual: (row.moneda_habitual as Proveedor["moneda_habitual"]) ?? "USD",
      retencion_iva: (row.retencion_iva as boolean) ?? true,
      retencion_islr: (row.retencion_islr as boolean) ?? true,
      fecha_vencimiento_rif: row.fecha_vencimiento_rif as string | null,
      id_facilitador_vinculado: row.id_facilitador_vinculado as number | null,
      notas_observaciones: row.notas_observaciones as string | null,
      creado_por: row.creado_por as number | null,
      created_at: (row.created_at as string) || new Date().toISOString(),
      updated_at: (row.updated_at as string) || new Date().toISOString(),
      estado_nombre: (row.estado as { nombre_estado: string } | null)?.nombre_estado ?? null,
      ciudad_nombre: (row.ciudad as { nombre_ciudad: string } | null)?.nombre_ciudad ?? null,
      facilitador_nombre: (row.facilitador as { nombre_apellido: string } | null)?.nombre_apellido ?? null,
      creado_por_nombre: (row.creador as { nombre_apellido: string } | null)?.nombre_apellido ?? null,
      total_cuentas_bancarias: cuentas.length,
    };
  });
}

/**
 * Fetch a single proveedor with full relations, bank accounts, notes, and audit log
 */
export async function fetchProveedorById(id: number): Promise<{
  proveedor: ProveedorWithDetails | null;
  cuentasBancarias: DatoBancarioProveedor[];
  notas: ProveedorNota[];
  auditoria: ProveedorAuditoria[];
}> {
  const admin = await createAdminClient();

  const [provRes, bancosRes] = await Promise.all([
    admin
      .from("proveedores")
      .select(`
        *,
        estado:cat_estados_venezuela!proveedores_id_estado_geografico_fkey(nombre_estado),
        ciudad:cat_ciudades!proveedores_id_ciudad_fkey(nombre_ciudad),
        facilitador:facilitadores!proveedores_id_facilitador_vinculado_fkey(nombre_apellido),
        creador:usuarios!proveedores_creado_por_fkey(nombre_apellido)
      `)
      .eq("id", id)
      .single(),
    admin
      .from("datos_bancarios")
      .select("*")
      .eq("id_proveedor", id)
      .order("es_principal", { ascending: false })
      .order("id", { ascending: true }),
  ]);

  if (provRes.error || !provRes.data) {
    console.error("[actions/proveedores] fetchProveedorById error:", provRes.error);
    return { proveedor: null, cuentasBancarias: [], notas: [], auditoria: [] };
  }

  // Fetch notes from admin table or fallback to rh table
  let notasRes = await admin
    .from("admin_proveedor_notas")
    .select(`
      *,
      autor:usuarios!admin_proveedor_notas_autor_id_fkey(nombre_apellido)
    `)
    .eq("proveedor_id", id)
    .order("created_at", { ascending: false });

  if (notasRes.error) {
    notasRes = await admin
      .from("rh_proveedor_notas")
      .select(`
        *,
        autor:usuarios!rh_proveedor_notas_autor_id_fkey(nombre_apellido)
      `)
      .eq("proveedor_id", id)
      .order("created_at", { ascending: false });
  }

  // Fetch audit log from admin table or fallback to rh table
  let auditRes = await admin
    .from("admin_auditoria_proveedores")
    .select(`
      *,
      actor:usuarios!admin_auditoria_proveedores_realizado_por_fkey(nombre_apellido)
    `)
    .eq("proveedor_id", id)
    .order("created_at", { ascending: false });

  if (auditRes.error) {
    auditRes = await admin
      .from("rh_auditoria_proveedores")
      .select(`
        *,
        actor:usuarios!rh_auditoria_proveedores_realizado_por_fkey(nombre_apellido)
      `)
      .eq("proveedor_id", id)
      .order("created_at", { ascending: false });
  }

  const row = provRes.data;
  const cuentas: DatoBancarioProveedor[] = (bancosRes.data || []).map(
    (b: Record<string, unknown>) => ({
      id: Number(b.id),
      id_proveedor: Number(b.id_proveedor),
      banco: b.banco as string,
      nro_cuenta: b.nro_cuenta as string,
      cedula_titular: (b.cedula_titular as string) || null,
      nombre_titular: (b.nombre_titular as string) || null,
      telefono_pago_movil: (b.telefono_pago_movil as string) || null,
      tipo_cuenta: (b.tipo_cuenta as "corriente" | "ahorro") || "corriente",
      es_principal: Boolean(b.es_principal),
    })
  );

  const notas: ProveedorNota[] = (notasRes.data || []).map(
    (n: Record<string, unknown>) => ({
      id: Number(n.id),
      proveedor_id: Number(n.proveedor_id),
      autor_id: n.autor_id != null ? Number(n.autor_id) : null,
      autor_nombre: (n.autor as { nombre_apellido: string } | null)?.nombre_apellido ?? null,
      nota: n.nota as string,
      created_at: n.created_at as string,
    })
  );

  const auditoria: ProveedorAuditoria[] = (auditRes.data || []).map(
    (a: Record<string, unknown>) => ({
      id: Number(a.id),
      proveedor_id: Number(a.proveedor_id),
      realizado_por: a.realizado_por != null ? Number(a.realizado_por) : null,
      realizado_por_nombre: (a.actor as { nombre_apellido: string } | null)?.nombre_apellido ?? null,
      accion: a.accion as string,
      campos_modificados: (a.campos_modificados as Record<string, { anterior: unknown; nuevo: unknown }>) || {},
      motivo: (a.motivo as string) || null,
      created_at: a.created_at as string,
    })
  );

  const proveedor: ProveedorWithDetails = {
    id: row.id,
    nombre_razon_social: row.nombre_razon_social,
    rif_proveedor: row.rif_proveedor,
    producto_servicio_admin: row.producto_servicio_admin,
    impacto_nivel: (row.impacto_nivel as ImpactoNivel) ?? "bajo",
    tipo_impacto: row.tipo_impacto,
    estado_operativo: (row.estado_operativo as EstadoOperativoProveedor) ?? "activo",
    persona_contacto: row.persona_contacto,
    cedula_contacto: row.cedula_contacto,
    telefono: row.telefono,
    email: row.email,
    direccion_fiscal: row.direccion_fiscal,
    direccion_referencia: row.direccion_referencia,
    id_estado_geografico: row.id_estado_geografico,
    id_ciudad: row.id_ciudad,
    id_estatus: row.id_estatus,
    fuente: row.fuente,
    condicion_pago: row.condicion_pago,
    dias_credito: row.dias_credito ?? 0,
    moneda_habitual: row.moneda_habitual ?? "USD",
    retencion_iva: row.retencion_iva ?? true,
    retencion_islr: row.retencion_islr ?? true,
    fecha_vencimiento_rif: row.fecha_vencimiento_rif,
    id_facilitador_vinculado: row.id_facilitador_vinculado,
    notas_observaciones: row.notas_observaciones,
    creado_por: row.creado_por,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    estado_nombre: (row.estado as { nombre_estado: string } | null)?.nombre_estado ?? null,
    ciudad_nombre: (row.ciudad as { nombre_ciudad: string } | null)?.nombre_ciudad ?? null,
    facilitador_nombre: (row.facilitador as { nombre_apellido: string } | null)?.nombre_apellido ?? null,
    creado_por_nombre: (row.creador as { nombre_apellido: string } | null)?.nombre_apellido ?? null,
    cuentas_bancarias: cuentas,
    total_cuentas_bancarias: cuentas.length,
  };

  return { proveedor, cuentasBancarias: cuentas, notas, auditoria };
}

/**
 * Create a new proveedor with optional initial bank account and audit trail
 */
export async function createProveedor(
  payload: {
    nombre_razon_social: string;
    rif_proveedor?: string | null;
    producto_servicio_admin?: string | null;
    impacto_nivel?: ImpactoNivel;
    estado_operativo?: EstadoOperativoProveedor;
    persona_contacto?: string | null;
    cedula_contacto?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion_fiscal?: string | null;
    direccion_referencia?: string | null;
    id_estado_geografico?: number | null;
    id_ciudad?: number | null;
    condicion_pago?: string | null;
    dias_credito?: number;
    moneda_habitual?: "USD" | "VES" | "EUR";
    retencion_iva?: boolean;
    retencion_islr?: boolean;
    fecha_vencimiento_rif?: string | null;
    id_facilitador_vinculado?: number | null;
    notas_observaciones?: string | null;
    banco_inicial?: {
      banco: string;
      nro_cuenta: string;
      cedula_titular?: string;
      nombre_titular?: string;
      telefono_pago_movil?: string;
      tipo_cuenta?: string;
    } | null;
  },
  motivo?: string
): Promise<{ success: boolean; data?: Proveedor; error?: string }> {
  const admin = await createAdminClient();
  const usuario = await getCurrentUsuarioId();

  if (!payload.nombre_razon_social || payload.nombre_razon_social.trim() === "") {
    return { success: false, error: "La razón social o nombre del proveedor es obligatorio" };
  }

  const cleanRif = payload.rif_proveedor ? payload.rif_proveedor.trim().toUpperCase() : null;

  // Insert proveedor
  const { data: newRow, error: insertError } = await admin
    .from("proveedores")
    .insert({
      nombre_razon_social: payload.nombre_razon_social.trim().toUpperCase(),
      rif_proveedor: cleanRif,
      producto_servicio_admin: payload.producto_servicio_admin?.trim() || null,
      impacto_nivel: payload.impacto_nivel || "bajo",
      tipo_impacto: payload.impacto_nivel === "alto" ? "A" : "C",
      estado_operativo: payload.estado_operativo || "activo",
      persona_contacto: payload.persona_contacto?.trim() || null,
      cedula_contacto: payload.cedula_contacto?.trim() || null,
      telefono: payload.telefono?.trim() || null,
      email: payload.email?.trim().toLowerCase() || null,
      direccion_fiscal: payload.direccion_fiscal?.trim() || null,
      direccion_referencia: payload.direccion_referencia?.trim() || null,
      id_estado_geografico: payload.id_estado_geografico || null,
      id_ciudad: payload.id_ciudad || null,
      condicion_pago: payload.condicion_pago?.trim() || null,
      dias_credito: Number(payload.dias_credito) || 0,
      moneda_habitual: payload.moneda_habitual || "USD",
      retencion_iva: payload.retencion_iva ?? true,
      retencion_islr: payload.retencion_islr ?? true,
      fecha_vencimiento_rif: payload.fecha_vencimiento_rif || null,
      id_facilitador_vinculado: payload.id_facilitador_vinculado || null,
      notas_observaciones: payload.notas_observaciones?.trim() || null,
      creado_por: usuario?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !newRow) {
    console.error("[actions/proveedores] createProveedor insert error:", insertError);
    return { success: false, error: insertError?.message || "Error al crear el proveedor" };
  }

  // Insert initial bank account if provided
  if (payload.banco_inicial?.banco && payload.banco_inicial?.nro_cuenta) {
    await admin.from("datos_bancarios").insert({
      id_proveedor: newRow.id,
      banco: payload.banco_inicial.banco.trim(),
      nro_cuenta: payload.banco_inicial.nro_cuenta.replace(/\s+/g, ""),
      cedula_titular: payload.banco_inicial.cedula_titular?.trim() || cleanRif,
      nombre_titular: payload.banco_inicial.nombre_titular?.trim() || newRow.nombre_razon_social,
      telefono_pago_movil: payload.banco_inicial.telefono_pago_movil?.trim() || null,
      tipo_cuenta: payload.banco_inicial.tipo_cuenta || "corriente",
      es_principal: true,
    });
  }

  // Record audit entry
  await recordAudit(admin, {
    proveedor_id: newRow.id,
    realizado_por: usuario?.id || null,
    accion: "creacion",
    campos_modificados: {
      creacion: {
        anterior: null,
        nuevo: {
          nombre: newRow.nombre_razon_social,
          rif: newRow.rif_proveedor,
          impacto: newRow.impacto_nivel,
          estado: newRow.estado_operativo,
        },
      },
    },
    motivo: motivo || "Registro inicial de proveedor",
    created_at: new Date().toISOString(),
  });

  return { success: true, data: newRow as Proveedor };
}

/**
 * Update an existing proveedor and record modified fields in audit trail
 */
export async function updateProveedor(
  id: number,
  payload: Partial<Proveedor>,
  motivo?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await createAdminClient();
  const usuario = await getCurrentUsuarioId();

  // Fetch current row for diffing
  const { data: current, error: fetchErr } = await admin
    .from("proveedores")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !current) {
    return { success: false, error: "Proveedor no encontrado" };
  }

  // Compute diff
  const camposModificados: Record<string, { anterior: unknown; nuevo: unknown }> = {};
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const fieldsToCheck: (keyof Proveedor)[] = [
    "nombre_razon_social",
    "rif_proveedor",
    "producto_servicio_admin",
    "impacto_nivel",
    "estado_operativo",
    "persona_contacto",
    "cedula_contacto",
    "telefono",
    "email",
    "direccion_fiscal",
    "direccion_referencia",
    "id_estado_geografico",
    "id_ciudad",
    "condicion_pago",
    "dias_credito",
    "moneda_habitual",
    "retencion_iva",
    "retencion_islr",
    "fecha_vencimiento_rif",
    "id_facilitador_vinculado",
    "notas_observaciones",
  ];

  for (const field of fieldsToCheck) {
    if (field in payload) {
      const oldVal = current[field];
      const newVal = payload[field];
      if (oldVal !== newVal) {
        camposModificados[String(field)] = { anterior: oldVal ?? null, nuevo: newVal ?? null };
        updateData[String(field)] = newVal;
      }
    }
  }

  // Synchronize legacy tipo_impacto if impacto_nivel changed
  if (payload.impacto_nivel) {
    updateData.tipo_impacto = payload.impacto_nivel === "alto" ? "A" : "C";
  }

  // If nothing changed, return early
  if (Object.keys(camposModificados).length === 0) {
    return { success: true };
  }

  const { error: updateError } = await admin
    .from("proveedores")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    console.error("[actions/proveedores] updateProveedor error:", updateError);
    return { success: false, error: updateError.message };
  }

  // Record audit log
  await recordAudit(admin, {
    proveedor_id: id,
    realizado_por: usuario?.id || null,
    accion: payload.estado_operativo && payload.estado_operativo !== current.estado_operativo ? "cambio_estatus" : "edicion",
    campos_modificados: camposModificados,
    motivo: motivo || null,
    created_at: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Save (create or update) a bank account for a proveedor
 */
export async function saveProveedorBanco(payload: {
  id?: number;
  id_proveedor: number;
  banco: string;
  nro_cuenta: string;
  cedula_titular?: string | null;
  nombre_titular?: string | null;
  telefono_pago_movil?: string | null;
  tipo_cuenta?: string | null;
  es_principal?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const admin = await createAdminClient();
  const usuario = await getCurrentUsuarioId();

  if (!payload.banco || !payload.nro_cuenta) {
    return { success: false, error: "Banco y número de cuenta son obligatorios" };
  }

  const cleanCuenta = payload.nro_cuenta.replace(/\s+/g, "");

  // If marked principal, demote any other principal accounts for this vendor
  if (payload.es_principal) {
    await admin
      .from("datos_bancarios")
      .update({ es_principal: false })
      .eq("id_proveedor", payload.id_proveedor);
  }

  if (payload.id) {
    // Update existing
    const { error } = await admin
      .from("datos_bancarios")
      .update({
        banco: payload.banco.trim(),
        nro_cuenta: cleanCuenta,
        cedula_titular: payload.cedula_titular?.trim() || null,
        nombre_titular: payload.nombre_titular?.trim() || null,
        telefono_pago_movil: payload.telefono_pago_movil?.trim() || null,
        tipo_cuenta: payload.tipo_cuenta || null,
        es_principal: payload.es_principal ?? false,
      })
      .eq("id", payload.id);

    if (error) return { success: false, error: error.message };

    await recordAudit(admin, {
      proveedor_id: payload.id_proveedor,
      realizado_por: usuario?.id || null,
      accion: "cuenta_bancaria_editada",
      campos_modificados: {
        banco: { anterior: null, nuevo: `${payload.banco} - ${cleanCuenta.slice(-4)}` },
      },
      motivo: "Actualización de cuenta bancaria",
      created_at: new Date().toISOString(),
    });
  } else {
    // Insert new
    const { error } = await admin.from("datos_bancarios").insert({
      id_proveedor: payload.id_proveedor,
      banco: payload.banco.trim(),
      nro_cuenta: cleanCuenta,
      cedula_titular: payload.cedula_titular?.trim() || null,
      nombre_titular: payload.nombre_titular?.trim() || null,
      telefono_pago_movil: payload.telefono_pago_movil?.trim() || null,
      tipo_cuenta: payload.tipo_cuenta || "corriente",
      es_principal: payload.es_principal ?? false,
    });

    if (error) return { success: false, error: error.message };

    await recordAudit(admin, {
      proveedor_id: payload.id_proveedor,
      realizado_por: usuario?.id || null,
      accion: "cuenta_bancaria_creada",
      campos_modificados: {
        banco: { anterior: null, nuevo: `${payload.banco} - ${cleanCuenta.slice(-4)}` },
      },
      motivo: "Nueva cuenta bancaria agregada",
      created_at: new Date().toISOString(),
    });
  }

  return { success: true };
}

/**
 * Delete a bank account
 */
export async function deleteProveedorBanco(
  bancoId: number,
  id_proveedor: number
): Promise<{ success: boolean; error?: string }> {
  const admin = await createAdminClient();
  const usuario = await getCurrentUsuarioId();

  const { error } = await admin.from("datos_bancarios").delete().eq("id", bancoId);
  if (error) return { success: false, error: error.message };

  await recordAudit(admin, {
    proveedor_id: id_proveedor,
    realizado_por: usuario?.id || null,
    accion: "cuenta_bancaria_eliminada",
    campos_modificados: { banco_eliminado_id: { anterior: bancoId, nuevo: null } },
    motivo: "Eliminación de cuenta bancaria",
    created_at: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Add an operational note to a proveedor
 */
export async function addProveedorNota(
  id_proveedor: number,
  nota: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await createAdminClient();
  const usuario = await getCurrentUsuarioId();

  if (!nota || nota.trim() === "") {
    return { success: false, error: "La nota no puede estar vacía" };
  }

  const { error } = await admin.from("admin_proveedor_notas").insert({
    proveedor_id: id_proveedor,
    autor_id: usuario?.id || null,
    nota: nota.trim(),
    created_at: new Date().toISOString(),
  });

  if (error) {
    const fallbackRes = await admin.from("rh_proveedor_notas").insert({
      proveedor_id: id_proveedor,
      autor_id: usuario?.id || null,
      nota: nota.trim(),
      created_at: new Date().toISOString(),
    });
    if (fallbackRes.error) return { success: false, error: fallbackRes.error.message };
  }

  await recordAudit(admin, {
    proveedor_id: id_proveedor,
    realizado_por: usuario?.id || null,
    accion: "nota_agregada",
    campos_modificados: { nota: { anterior: null, nuevo: nota.trim().slice(0, 80) } },
    motivo: "Registro de nota operativa",
    created_at: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Catalogs
 */
export async function fetchCatalogoEstados(): Promise<EstadoVenezuela[]> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("cat_estados_venezuela")
    .select("id, nombre_estado, capital_estado")
    .order("nombre_estado", { ascending: true });

  if (error) {
    console.error("[actions/proveedores] fetchCatalogoEstados error:", error);
    return [];
  }
  return data || [];
}

export async function fetchCatalogoCiudades(id_estado?: number): Promise<CiudadVenezuela[]> {
  const admin = await createAdminClient();
  let query = admin
    .from("cat_ciudades")
    .select("id, id_estado, nombre_ciudad")
    .order("nombre_ciudad", { ascending: true });

  if (id_estado) {
    query = query.eq("id_estado", id_estado);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[actions/proveedores] fetchCatalogoCiudades error:", error);
    return [];
  }
  return data || [];
}

export async function fetchCatalogoFacilitadores(): Promise<{ id: number; nombre_apellido: string; cedula: string | null }[]> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("facilitadores")
    .select("id, nombre_apellido, cedula")
    .eq("is_active", true)
    .order("nombre_apellido", { ascending: true });

  if (error) {
    console.error("[actions/proveedores] fetchCatalogoFacilitadores error:", error);
    return [];
  }
  return data || [];
}
