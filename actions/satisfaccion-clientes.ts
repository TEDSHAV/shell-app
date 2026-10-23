"use server";

import { cache } from "react";
import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getUserRole, getUserRolesByApp, getUsuarioDepartamento } from "@/actions/apps";

export interface EncuestaCliente {
  id: number;
  token: string;
  id_osi: number | null;
  nro_osi: string;
  id_empresa: number | null;
  nombre_empresa: string;
  servicio: string;
  tipo_servicio: string | null;
  ejecutivo_negocios: string | null;
  id_ciudad: number | null;
  id_estado: number | null;
  fecha_servicio: string | null;
  cliente_contacto_nombre: string | null;
  cliente_contacto_email: string | null;
  cliente_contacto_telefono: string | null;
  cliente_contacto_cargo: string | null;
  estado: "pendiente" | "respondida" | "expirada" | "cancelada";
  created_by: string | null;
  created_at: string;
  sent_at: string | null;
  responded_at: string | null;
}

export interface RespuestaCliente {
  id: number;
  encuesta_id: number;
  calidad_servicio: number; // 1 to 5
  atencion_soporte: number; // 1 to 5
  fidelidad_nps: number; // 0 to 10
  comentarios: string | null;
  respondente_nombre: string | null;
  respondente_cargo: string | null;
  submitted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface EncuestaConRespuesta extends EncuestaCliente {
  respuesta?: RespuestaCliente | null;
  ciudad_nombre?: string | null;
}

export interface SatisfaccionKpis {
  total_encuestas: number;
  total_respondidas: number;
  tasa_respuesta_pct: number;
  csat_promedio: number; // 1.0 - 5.0
  csat_pct: number; // 0 - 100%
  avg_calidad: number; // 1.0 - 5.0
  avg_atencion: number; // 1.0 - 5.0
  nps_score: number; // -100 to +100
  nps_promoters: number;
  nps_passives: number;
  nps_detractors: number;
}

export interface SatisfaccionFiltros {
  tipo_servicio?: string;
  empresa?: string;
  servicio?: string;
  ejecutivo?: string;
  ciudad?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: string;
}

export interface GenerateEncuestaInput {
  id_osi?: number | null;
  nro_osi?: string | null;
  id_empresa?: number | null;
  nombre_empresa: string;
  servicio: string;
  tipo_servicio?: string | null;
  ejecutivo_negocios?: string | null;
  id_ciudad?: number | null;
  id_estado?: number | null;
  fecha_servicio?: string | null;
  cliente_contacto_nombre?: string | null;
  cliente_contacto_email?: string | null;
  cliente_contacto_telefono?: string | null;
  cliente_contacto_cargo?: string | null;
}

export interface SubmitRespuestaInput {
  calidad_servicio: number; // 1 - 5
  atencion_soporte: number; // 1 - 5
  fidelidad_nps: number; // 0 - 10
  comentarios?: string | null;
  respondente_nombre?: string | null;
  respondente_cargo?: string | null;
}

/**
 * Access control for Satisfacción de Clientes:
 * Negocios, Calidad, TED, and Superadmin can access.
 */
export const canAccessSatisfaccionClientes = cache(async (): Promise<boolean> => {
  try {
    const globalRole = (await getUserRole())?.toLowerCase();
    if (globalRole === "superadmin" || globalRole === "admin") return true;

    const deptName = (await getUsuarioDepartamento())?.toUpperCase() || "";
    if (
      deptName.includes("NEGOCIOS") ||
      deptName.includes("GESTION") ||
      deptName.includes("CALIDAD") ||
      deptName.includes("TED")
    ) {
      return true;
    }

    const rolesByApp = await getUserRolesByApp();
    if (rolesByApp.sgestion || rolesByApp.scalidad || rolesByApp.ted) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking access to satisfaccion clientes:", error);
    return false;
  }
});

/**
 * Fetch dashboard data: surveys, responses, and computed KPIs.
 */
export async function getSatisfaccionDashboard(filtros?: SatisfaccionFiltros): Promise<{
  encuestas: EncuestaConRespuesta[];
  kpis: SatisfaccionKpis;
  filterOptions: {
    empresas: string[];
    servicios: string[];
    ejecutivos: string[];
    tipos_servicio: string[];
  };
}> {
  const allowed = await canAccessSatisfaccionClientes();
  if (!allowed) {
    throw new Error("No autorizado para acceder al módulo de satisfacción de clientes");
  }

  const admin = await createAdminClient();

  // Fetch all surveys with their linked responses
  let query = admin
    .from("encuestas_satisfaccion_clientes")
    .select(`
      *,
      respuestas_satisfaccion_clientes (*)
    `)
    .order("created_at", { ascending: false });

  if (filtros?.estado && filtros.estado !== "todos") {
    query = query.eq("estado", filtros.estado);
  }
  if (filtros?.tipo_servicio && filtros.tipo_servicio !== "todos") {
    query = query.ilike("tipo_servicio", `%${filtros.tipo_servicio}%`);
  }
  if (filtros?.empresa) {
    query = query.ilike("nombre_empresa", `%${filtros.empresa}%`);
  }
  if (filtros?.servicio) {
    query = query.ilike("servicio", `%${filtros.servicio}%`);
  }
  if (filtros?.ejecutivo) {
    query = query.ilike("ejecutivo_negocios", `%${filtros.ejecutivo}%`);
  }
  if (filtros?.fecha_desde) {
    query = query.gte("created_at", `${filtros.fecha_desde}T00:00:00Z`);
  }
  if (filtros?.fecha_hasta) {
    query = query.lte("created_at", `${filtros.fecha_hasta}T23:59:59Z`);
  }

  const { data: rawEncuestas, error } = await query;
  if (error) {
    console.error("Error fetching encuestas satisfaccion clientes:", error);
    return {
      encuestas: [],
      kpis: getEmptyKpis(),
      filterOptions: { empresas: [], servicios: [], ejecutivos: [], tipos_servicio: [] },
    };
  }

  // Fetch city names for mapping
  const cityIds = [
    ...new Set(
      (rawEncuestas || [])
        .map((e: any) => e.id_ciudad)
        .filter((id: number | null): id is number => typeof id === "number" && id > 0),
    ),
  ];
  const cityMap = new Map<number, string>();
  if (cityIds.length > 0) {
    const { data: cities } = await admin
      .from("cat_ciudades")
      .select("id, nombre_ciudad")
      .in("id", cityIds);
    for (const c of cities || []) {
      cityMap.set(c.id, c.nombre_ciudad);
    }
  }

  const encuestas: EncuestaConRespuesta[] = (rawEncuestas || []).map((row: any) => {
    const respuestaRaw = Array.isArray(row.respuestas_satisfaccion_clientes)
      ? row.respuestas_satisfaccion_clientes[0]
      : row.respuestas_satisfaccion_clientes;

    return {
      id: row.id,
      token: row.token,
      id_osi: row.id_osi,
      nro_osi: row.nro_osi || "S/N",
      id_empresa: row.id_empresa,
      nombre_empresa: row.nombre_empresa,
      servicio: row.servicio,
      tipo_servicio: row.tipo_servicio,
      ejecutivo_negocios: row.ejecutivo_negocios,
      id_ciudad: row.id_ciudad,
      id_estado: row.id_estado,
      fecha_servicio: row.fecha_servicio,
      cliente_contacto_nombre: row.cliente_contacto_nombre,
      cliente_contacto_email: row.cliente_contacto_email,
      cliente_contacto_telefono: row.cliente_contacto_telefono,
      cliente_contacto_cargo: row.cliente_contacto_cargo,
      estado: row.estado,
      created_by: row.created_by,
      created_at: row.created_at,
      sent_at: row.sent_at,
      responded_at: row.responded_at,
      ciudad_nombre: row.id_ciudad ? cityMap.get(row.id_ciudad) ?? null : null,
      respuesta: respuestaRaw || null,
    };
  });

  // Calculate KPIs
  const kpis = calculateKpis(encuestas);

  // Compute filter options for dropdowns
  const empresasSet = new Set<string>();
  const serviciosSet = new Set<string>();
  const ejecutivosSet = new Set<string>();
  const tiposServicioSet = new Set<string>();

  for (const e of encuestas) {
    if (e.nombre_empresa) empresasSet.add(e.nombre_empresa.trim());
    if (e.servicio) serviciosSet.add(e.servicio.trim());
    if (e.ejecutivo_negocios) ejecutivosSet.add(e.ejecutivo_negocios.trim());
    if (e.tipo_servicio) tiposServicioSet.add(e.tipo_servicio.trim());
  }

  return {
    encuestas,
    kpis,
    filterOptions: {
      empresas: Array.from(empresasSet).sort(),
      servicios: Array.from(serviciosSet).sort(),
      ejecutivos: Array.from(ejecutivosSet).sort(),
      tipos_servicio: Array.from(tiposServicioSet).sort(),
    },
  };
}

function getEmptyKpis(): SatisfaccionKpis {
  return {
    total_encuestas: 0,
    total_respondidas: 0,
    tasa_respuesta_pct: 0,
    csat_promedio: 0,
    csat_pct: 0,
    avg_calidad: 0,
    avg_atencion: 0,
    nps_score: 0,
    nps_promoters: 0,
    nps_passives: 0,
    nps_detractors: 0,
  };
}

function calculateKpis(encuestas: EncuestaConRespuesta[]): SatisfaccionKpis {
  const total_encuestas = encuestas.length;
  const respondidas = encuestas.filter((e) => e.estado === "respondida" && e.respuesta);
  const total_respondidas = respondidas.length;

  if (total_respondidas === 0) {
    return {
      ...getEmptyKpis(),
      total_encuestas,
    };
  }

  const tasa_respuesta_pct = Math.round((total_respondidas / total_encuestas) * 100);

  let sumCalidad = 0;
  let sumAtencion = 0;
  let totalCsatSum = 0;
  let totalCsatQuestionsCount = 0;

  let nps_promoters = 0;
  let nps_passives = 0;
  let nps_detractors = 0;

  for (const item of respondidas) {
    const r = item.respuesta!;
    sumCalidad += r.calidad_servicio;
    sumAtencion += r.atencion_soporte;

    totalCsatSum += r.calidad_servicio + r.atencion_soporte;
    totalCsatQuestionsCount += 2;

    // Fidelidad / NPS standard ranges: 9-10 Promoters, 7-8 Passives, 0-6 Detractors
    if (r.fidelidad_nps >= 9) {
      nps_promoters++;
    } else if (r.fidelidad_nps >= 7) {
      nps_passives++;
    } else {
      nps_detractors++;
    }
  }

  const avg_calidad = Number((sumCalidad / total_respondidas).toFixed(2));
  const avg_atencion = Number((sumAtencion / total_respondidas).toFixed(2));

  const csat_promedio = Number((totalCsatSum / totalCsatQuestionsCount).toFixed(2));
  const csat_pct = Math.round((csat_promedio / 5) * 100);

  // NPS = % Promoters - % Detractors
  const pctPromoters = (nps_promoters / total_respondidas) * 100;
  const pctDetractors = (nps_detractors / total_respondidas) * 100;
  const nps_score = Math.round(pctPromoters - pctDetractors);

  return {
    total_encuestas,
    total_respondidas,
    tasa_respuesta_pct,
    csat_promedio,
    csat_pct,
    avg_calidad,
    avg_atencion,
    nps_score,
    nps_promoters,
    nps_passives,
    nps_detractors,
  };
}

/**
 * Public action: get survey info by token to display to the client.
 */
export async function getEncuestaByToken(token: string): Promise<{
  ok: boolean;
  encuesta?: EncuestaCliente;
  error?: string;
  alreadyResponded?: boolean;
}> {
  if (!token) {
    return { ok: false, error: "Token de encuesta no proporcionado" };
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("encuestas_satisfaccion_clientes")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "La encuesta solicitada no existe o el enlace es inválido." };
  }

  if (data.estado === "respondida") {
    return {
      ok: false,
      alreadyResponded: true,
      error: "Esta encuesta ya ha sido completada previamente. ¡Muchas gracias por su valiosa retroalimentación!",
    };
  }

  if (data.estado === "cancelada" || data.estado === "expirada") {
    return {
      ok: false,
      error: "Este enlace de encuesta se encuentra inactivo o ha expirado.",
    };
  }

  return {
    ok: true,
    encuesta: data as EncuestaCliente,
  };
}

/**
 * Public action: submit client answers for a tokenized survey with the 3 official questions.
 */
export async function submitRespuestaCliente(
  token: string,
  answers: SubmitRespuestaInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!token) return { ok: false, error: "Token inválido" };

    const admin = await createAdminClient();

    // Verify survey is still pending
    const { data: encuesta, error: fetchErr } = await admin
      .from("encuestas_satisfaccion_clientes")
      .select("id, estado")
      .eq("token", token)
      .single();

    if (fetchErr || !encuesta) {
      return { ok: false, error: "Encuesta no encontrada o enlace inválido." };
    }

    if (encuesta.estado === "respondida") {
      return { ok: false, error: "Esta encuesta ya fue completada." };
    }

    // Capture client headers
    let ip_address = "desconocido";
    let user_agent = "desconocido";
    try {
      const headersList = await headers();
      ip_address = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocido";
      user_agent = headersList.get("user-agent") || "desconocido";
    } catch {
      // headers() might not be available in all edge cases
    }

    // Insert response with the 3 official questions
    const { error: insertErr } = await admin
      .from("respuestas_satisfaccion_clientes")
      .insert({
        encuesta_id: encuesta.id,
        calidad_servicio: answers.calidad_servicio,
        atencion_soporte: answers.atencion_soporte,
        fidelidad_nps: answers.fidelidad_nps,
        comentarios: answers.comentarios?.trim() || null,
        respondente_nombre: answers.respondente_nombre?.trim() || null,
        respondente_cargo: answers.respondente_cargo?.trim() || null,
        ip_address,
        user_agent,
      });

    if (insertErr) {
      console.error("Error inserting respuesta satisfaccion:", insertErr);
      return { ok: false, error: "Error al registrar la respuesta. Por favor intente de nuevo." };
    }

    // Update survey status
    const { error: updateErr } = await admin
      .from("encuestas_satisfaccion_clientes")
      .update({
        estado: "respondida",
        responded_at: new Date().toISOString(),
      })
      .eq("id", encuesta.id);

    if (updateErr) {
      console.error("Error updating encuesta status:", updateErr);
    }

    return { ok: true };
  } catch (err: any) {
    console.error("Exception in submitRespuestaCliente:", err);
    return { ok: false, error: err.message || "Ocurrió un error inesperado al enviar la encuesta." };
  }
}

/**
 * Generate a new satisfaction survey for an OSI or directly by company/service.
 */
export async function generateEncuestaCliente(
  payload: GenerateEncuestaInput,
): Promise<{ ok: boolean; encuesta?: EncuestaCliente; error?: string }> {
  try {
    const allowed = await canAccessSatisfaccionClientes();
    if (!allowed) {
      return { ok: false, error: "No tienes permiso para generar encuestas de satisfacción." };
    }

    if (!payload.nombre_empresa?.trim() || !payload.servicio?.trim()) {
      return { ok: false, error: "El nombre de la empresa y el servicio son obligatorios." };
    }

    const supabase = await createClient();
    const admin = await createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await admin
      .from("encuestas_satisfaccion_clientes")
      .insert({
        id_osi: payload.id_osi || null,
        nro_osi: payload.nro_osi?.trim() || "S/N",
        id_empresa: payload.id_empresa || null,
        nombre_empresa: payload.nombre_empresa.trim(),
        servicio: payload.servicio.trim(),
        tipo_servicio: payload.tipo_servicio?.trim() || null,
        ejecutivo_negocios: payload.ejecutivo_negocios?.trim() || null,
        id_ciudad: payload.id_ciudad || null,
        id_estado: payload.id_estado || null,
        fecha_servicio: payload.fecha_servicio || null,
        cliente_contacto_nombre: payload.cliente_contacto_nombre?.trim() || null,
        cliente_contacto_email: payload.cliente_contacto_email?.trim() || null,
        cliente_contacto_telefono: payload.cliente_contacto_telefono?.trim() || null,
        cliente_contacto_cargo: payload.cliente_contacto_cargo?.trim() || null,
        estado: "pendiente",
        created_by: user?.id || null,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating encuesta satisfaccion:", error);
      return { ok: false, error: error?.message || "Error al crear la encuesta." };
    }

    return { ok: true, encuesta: data as EncuestaCliente };
  } catch (err: any) {
    console.error("Exception generating encuesta:", err);
    return { ok: false, error: err.message || "Error inesperado al generar la encuesta." };
  }
}

export interface OsiSearchResult {
  id_osi: number;
  nro_osi: string;
  id_empresa?: number | null;
  nombre_empresa: string;
  servicio: string;
  tipo_servicio: string | null;
  ejecutivo_negocios: string | null;
  id_ciudad: number | null;
  id_estado: number | null;
  fecha_inicio_real: string | null;
  persona_contacto?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  contacto_cargo?: string | null;
}

export interface EmpresaSearchResult {
  id_empresa: number;
  nombre_empresa: string;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  contacto_cargo?: string | null;
}

/**
 * Search OSIs in v_osi_formato_completo with contact details for the survey combobox.
 */
export async function searchOsisForEncuesta(term: string): Promise<OsiSearchResult[]> {
  if (!term || term.trim().length < 2) return [];

  const admin = await createAdminClient();
  const q = term.trim();

  const { data, error } = await admin
    .from("v_osi_formato_completo")
    .select(`
      id_osi,
      nro_osi,
      id_empresa,
      nombre_empresa,
      servicio,
      tipo_servicio,
      ejecutivo_negocios,
      id_ciudad_direccion_ejecucion_efectiva,
      id_estado_direccion_ejecucion_efectiva,
      fecha_inicio_real,
      persona_contacto,
      contacto_telefono,
      contacto_email,
      id_trato
    `)
    .or(`nro_osi.ilike.%${q}%,nombre_empresa.ilike.%${q}%,servicio.ilike.%${q}%`)
    .not("nro_osi", "like", "PEN-%")
    .order("fecha_inicio_real", { ascending: false, nullsFirst: false })
    .limit(15);

  if (error || !data) {
    console.error("Error searching OSIs for encuesta:", error);
    return [];
  }

  // Fetch cargo from contactos for each trato
  const tratoIds = data.map((d: any) => d.id_trato).filter(Boolean);
  const cargoByTratoId = new Map<number, string>();
  if (tratoIds.length > 0) {
    try {
      const { data: tratosData } = await admin
        .from("tratos")
        .select("id, id_contacto, contactos(cargo)")
        .in("id", tratoIds);
      for (const t of tratosData || []) {
        const cargo = (t.contactos as any)?.cargo;
        if (cargo) cargoByTratoId.set(t.id, cargo);
      }
    } catch (e) {
      console.warn("Could not fetch contact cargo from tratos:", e);
    }
  }

  return data.map((d: any) => ({
    id_osi: d.id_osi,
    nro_osi: d.nro_osi,
    id_empresa: d.id_empresa,
    nombre_empresa: d.nombre_empresa,
    servicio: d.servicio,
    tipo_servicio: d.tipo_servicio,
    ejecutivo_negocios: d.ejecutivo_negocios,
    id_ciudad: d.id_ciudad_direccion_ejecucion_efectiva,
    id_estado: d.id_estado_direccion_ejecucion_efectiva,
    fecha_inicio_real: d.fecha_inicio_real,
    persona_contacto: d.persona_contacto?.trim() || null,
    contacto_telefono: d.contacto_telefono?.trim() || null,
    contacto_email: d.contacto_email?.trim() || null,
    contacto_cargo: (d.id_trato ? cargoByTratoId.get(d.id_trato) : null) || null,
  }));
}

/**
 * Fetch complete OSI details including contact person and phone for survey generation.
 */
export async function getOsiDetailsForEncuesta(idOsi: number): Promise<OsiSearchResult | null> {
  if (!idOsi) return null;
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("v_osi_formato_completo")
    .select(`
      id_osi,
      nro_osi,
      id_empresa,
      nombre_empresa,
      servicio,
      tipo_servicio,
      ejecutivo_negocios,
      id_ciudad_direccion_ejecucion_efectiva,
      id_estado_direccion_ejecucion_efectiva,
      fecha_inicio_real,
      persona_contacto,
      contacto_telefono,
      contacto_email,
      id_trato
    `)
    .eq("id_osi", idOsi)
    .maybeSingle();

  if (error || !data) return null;

  let cargo: string | null = null;
  if (data.id_trato) {
    try {
      const { data: trato } = await admin
        .from("tratos")
        .select("id, id_contacto, contactos(cargo)")
        .eq("id", data.id_trato)
        .maybeSingle();
      cargo = (trato?.contactos as any)?.cargo || null;
    } catch {
      // ignore
    }
  }

  let persona = data.persona_contacto?.trim() || null;
  let telefono = data.contacto_telefono?.trim() || null;
  let email = data.contacto_email?.trim() || null;

  // Fallback to empresa contact if trato has none
  if (!persona && data.id_empresa) {
    const { data: c } = await admin
      .from("contactos")
      .select("nombre, apellido, cargo, telefono, email")
      .eq("id_empresa", data.id_empresa)
      .limit(1)
      .maybeSingle();
    if (c) {
      persona = `${c.nombre} ${c.apellido || ""}`.trim();
      telefono = c.telefono || null;
      email = c.email || null;
      cargo = c.cargo || null;
    }
  }

  return {
    id_osi: data.id_osi,
    nro_osi: data.nro_osi,
    id_empresa: data.id_empresa,
    nombre_empresa: data.nombre_empresa,
    servicio: data.servicio,
    tipo_servicio: data.tipo_servicio,
    ejecutivo_negocios: data.ejecutivo_negocios,
    id_ciudad: data.id_ciudad_direccion_ejecucion_efectiva,
    id_estado: data.id_estado_direccion_ejecucion_efectiva,
    fecha_inicio_real: data.fecha_inicio_real,
    persona_contacto: persona,
    contacto_telefono: telefono,
    contacto_email: email,
    contacto_cargo: cargo,
  };
}

/**
 * Search registered companies in empresas with their default contact for manual combobox.
 */
export async function searchEmpresasForEncuesta(term: string): Promise<EmpresaSearchResult[]> {
  if (!term || term.trim().length < 2) return [];

  const admin = await createAdminClient();
  const q = term.trim();

  const { data: emps, error } = await admin
    .from("empresas")
    .select("id, razon_social")
    .ilike("razon_social", `%${q}%`)
    .limit(8);

  if (error || !emps || emps.length === 0) return [];

  const empIds = emps.map((e) => e.id);
  const { data: contacts } = await admin
    .from("contactos")
    .select("id_empresa, nombre, apellido, cargo, telefono, email")
    .in("id_empresa", empIds);

  const contactByEmp = new Map<number, any>();
  for (const c of contacts || []) {
    if (!contactByEmp.has(c.id_empresa)) {
      contactByEmp.set(c.id_empresa, c);
    }
  }

  return emps.map((e) => {
    const c = contactByEmp.get(e.id);
    return {
      id_empresa: e.id,
      nombre_empresa: e.razon_social,
      contacto_nombre: c ? `${c.nombre} ${c.apellido || ""}`.trim() : null,
      contacto_telefono: c?.telefono || null,
      contacto_email: c?.email || null,
      contacto_cargo: c?.cargo || null,
    };
  });
}

