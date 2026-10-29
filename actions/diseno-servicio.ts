"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { notifySolicitanteOfFinalizacion } from "@/actions/diseno-servicio-notifications";
import {
  isCapacitacionDept,
  isServiciosTecnicosDept,
  isNegociosDept,
} from "@/lib/requisiciones-gerencia";
import { getUserRolesByApp, getUserRole } from "@/actions/apps";
import { isTedMember } from "@/actions/ted";
import { canUserEditDiseno } from "@/lib/diseno-servicio-auth";
import type {
  BloqueRecursosRequisitos,
  BloqueHigieneSeguridadAmbiente,
  BloquePlanificacionFactibilidad,
  BloqueControlesDiseno,
  BloqueSalidasDiseno,
  DisenoServicioFullData,
  DisenoServicioListItem,
  DisenoServicioNota,
  OfertaTecnicaData,
  FichaTecnicaData,
} from "@/types/diseno-servicio";

const ESTATUS_PENDIENTE = 35;
const ESTATUS_EN_PROCESO = 36;
const ESTATUS_COMPLETADO = 38;

const DEPT_CAPACITACION = 3;
const DEPT_SERVICIOS_TECNICOS = 4;

// Get current logged in user details with comprehensive role & permissions breakdown
export async function getCurrentUserForDiseno() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("usuarios")
    .select("*, departamentos!usuarios_departamento_fkey(nombre, coordinador)")
    .eq("id_auth", user.id)
    .single();

  if (error || !data) {
    console.error("Error fetching user details:", error);
    return null;
  }

  const deptName = (data.departamentos as any)?.nombre ?? null;
  const isCap = isCapacitacionDept(deptName);
  const isSt = isServiciosTecnicosDept(deptName);
  const isNeg = isNegociosDept(deptName);

  // App roles from authprisma
  const rolesByApp = await getUserRolesByApp();

  // TED member check
  let ted = false;
  try {
    ted = await isTedMember();
  } catch (err) {
    console.warn("Error checking isTedMember:", err);
  }

  const isTed =
    ted ||
    data.departamento === 6 ||
    deptName?.trim().toUpperCase() === "TED" ||
    Boolean(rolesByApp.ted);

  // Global role & Admin check
  let globalRole = "";
  try {
    globalRole = (await getUserRole()).toLowerCase();
  } catch {}

  const isAdmin =
    (data as any)?.rol === "admin" ||
    (data as any)?.rol === "superadmin" ||
    globalRole === "admin" ||
    globalRole === "superadmin" ||
    isTed;

  // Cargo string check
  const cargoNormalized = (data.cargo || "").toLowerCase();
  const isCargoCoordinador =
    cargoNormalized.includes("coordinador") || cargoNormalized.includes("coordinadora");
  const isCargoLider =
    cargoNormalized.includes("lider") || cargoNormalized.includes("líder");

  // Organigram checks
  const [{ data: coordDepts }, { data: ledGerencias }] = await Promise.all([
    admin.from("departamentos").select("id, nombre").eq("coordinador", data.id),
    admin.from("gerencias").select("id, nombre").eq("lider", data.id),
  ]);

  const coordinatedDeptNames = (coordDepts || []).map((d: any) => d.nombre || "");
  const ledGerenciaNames = (ledGerencias || []).map((g: any) => g.nombre || "");

  const isOrganigramCoordinador = coordinatedDeptNames.length > 0;
  const isOrganigramLider = ledGerenciaNames.length > 0;

  // Capacitación specific leader or coordinator
  const isCapCoordinador =
    rolesByApp.scapacitacion === "coordinador" ||
    coordinatedDeptNames.some((d: string) => isCapacitacionDept(d)) ||
    (isCap && isCargoCoordinador);

  const isCapLider =
    rolesByApp.scapacitacion === "lider" ||
    ledGerenciaNames.some((g: string) => g.toLowerCase().includes("capacitacion") && !isSt) ||
    (isCap && isCargoLider);

  // ST specific leader or coordinator
  const isStCoordinador =
    rolesByApp.st === "coordinador" ||
    coordinatedDeptNames.some((d: string) => isServiciosTecnicosDept(d)) ||
    (isSt && isCargoCoordinador);

  const isStLider =
    rolesByApp.st === "lider" ||
    ledGerenciaNames.some(
      (g: string) => (isServiciosTecnicosDept(g) || g.trim().toLowerCase() === "servicios") && !isCap
    ) ||
    (isSt && isCargoLider);

  // General coordinator or leader (any app, organigram, or cargo)
  const isCoordinador =
    isCargoCoordinador ||
    isOrganigramCoordinador ||
    Object.values(rolesByApp).some((r) => r.toLowerCase().includes("coordinador"));

  const isLider =
    isCargoLider ||
    isOrganigramLider ||
    globalRole === "lider" ||
    Object.values(rolesByApp).some((r) => r.toLowerCase().includes("lider"));

  return {
    ...data,
    departamento_nombre: deptName,
    rolesByApp,
    isCapacitacion: isCap,
    isServiciosTecnicos: isSt,
    isNegocios: isNeg,
    isTed,
    isAdmin,
    isCoordinador,
    isLider,
    isCapCoordinador,
    isCapLider,
    isStCoordinador,
    isStLider,
  };
}

// Get all solicitudes for list view (accessible by Negocios, CAP, ST, TED, Admin)
export async function getDisenoServicioList(): Promise<DisenoServicioListItem[]> {
  const supabase = await createAdminClient();

  // Attempt to select is_hidden; fallback gracefully if column does not exist yet in Supabase
  let data: Array<Record<string, unknown>> | null = null;
  const primaryResult = await supabase
    .from("solicitudes_diseno_servicio")
    .select(`
      id,
      nombre_sugerido,
      tipo_solicitud,
      id_estatus,
      fecha_solicitud,
      id_solicitante,
      id_servicio_relacionado,
      bloque_recursos_requisitos,
      is_hidden,
      conf_estatus!solicitudes_diseno_servicio_id_estatus_fkey(nombre_estado),
      usuarios!solicitudes_diseno_servicio_id_solicitante_fkey(nombre_apellido, departamento),
      catalogo_servicios!solicitudes_diseno_servicio_id_servicio_relacionado_fkey(nombre, id_departamento_ejecutante)
    `)
    .order("id", { ascending: false });

  if (primaryResult.error) {
    if (primaryResult.error.message.includes("is_hidden")) {
      const fallbackResult = await supabase
        .from("solicitudes_diseno_servicio")
        .select(`
          id,
          nombre_sugerido,
          tipo_solicitud,
          id_estatus,
          fecha_solicitud,
          id_solicitante,
          id_servicio_relacionado,
          bloque_recursos_requisitos,
          conf_estatus!solicitudes_diseno_servicio_id_estatus_fkey(nombre_estado),
          usuarios!solicitudes_diseno_servicio_id_solicitante_fkey(nombre_apellido, departamento),
          catalogo_servicios!solicitudes_diseno_servicio_id_servicio_relacionado_fkey(nombre, id_departamento_ejecutante)
        `)
        .order("id", { ascending: false });

      if (fallbackResult.error) {
        console.error("Error fetching solicitudes_diseno_servicio:", JSON.stringify(fallbackResult.error, null, 2));
        return [];
      }
      data = fallbackResult.data;
    } else {
      console.error("Error fetching solicitudes_diseno_servicio:", JSON.stringify(primaryResult.error, null, 2));
      return [];
    }
  } else {
    data = primaryResult.data;
  }

  // Batch-fetch department names
  const departamentoIds = Array.from(
    new Set(
      (data || [])
        .map((row: any) => (row.usuarios as any)?.departamento as number | null)
        .filter((id: number | null): id is number => id !== null && id !== undefined),
    ),
  );

  let departamentoMap = new Map<number, string>();
  if (departamentoIds.length > 0) {
    const { data: deptos } = await supabase
      .from("departamentos")
      .select("id, nombre")
      .in("id", departamentoIds);

    if (deptos) {
      departamentoMap = new Map((deptos || []).map((d: any) => [d.id, d.nombre]));
    }
  }

  // Batch-fetch notes counts for all solicitudes
  const solicitudIds = (data || []).map((r: any) => r.id);
  const notesCountMap = new Map<number, number>();
  if (solicitudIds.length > 0) {
    const { data: notas } = await supabase
      .from("solicitudes_diseno_servicio_notas")
      .select("solicitud_id");

    if (notas) {
      for (const n of notas) {
        notesCountMap.set(n.solicitud_id, (notesCountMap.get(n.solicitud_id) || 0) + 1);
      }
    }
  }

  // Batch-fetch linked OSIs by id_servicio_relacionado
  const servicioIds = Array.from(
    new Set(
      (data || [])
        .map((row: any) => row.id_servicio_relacionado as number | null)
        .filter((id: number | null): id is number => id !== null && id !== undefined),
    ),
  );

  const osiMap = new Map<number, string[]>();
  if (servicioIds.length > 0) {
    const [{ data: osis }, { data: consolidatedEccs }] = await Promise.all([
      supabase
        .from("v_osi_formato_completo")
        .select("id_osi, nro_osi, id_servicio")
        .in("id_servicio", servicioIds)
        .not("nro_osi", "ilike", "%PEN-%"),
      supabase
        .from("ecc_encabezado")
        .select("id_servicio, id_ecc_consolidada")
        .in("id_servicio", servicioIds)
        .not("id_ecc_consolidada", "is", null),
    ]);

    if (osis) {
      for (const o of osis) {
        if (o.id_servicio == null) continue;
        const nro = (o.nro_osi || "").trim();
        if (!nro || nro.toUpperCase().includes("PEN-")) continue;
        const list = osiMap.get(o.id_servicio) || [];
        if (!list.includes(nro)) {
          list.push(nro);
        }
        osiMap.set(o.id_servicio, list);
      }
    }

    // Also link OSIs emitted under a parent consolidated ECC (id_ecc_consolidada)
    if (consolidatedEccs && consolidatedEccs.length > 0) {
      const parentEccIds = Array.from(
        new Set(
          consolidatedEccs
            .map((e: any) => e.id_ecc_consolidada as number | null)
            .filter((id: number | null): id is number => id !== null && id !== undefined),
        ),
      );

      if (parentEccIds.length > 0) {
        const { data: parentOsis } = await supabase
          .from("v_osi_formato_completo")
          .select("id_osi, nro_osi, id_ecc_actual")
          .in("id_ecc_actual", parentEccIds)
          .not("nro_osi", "ilike", "%PEN-%");

        if (parentOsis && parentOsis.length > 0) {
          const eccToOsis = new Map<number, string[]>();
          for (const po of parentOsis) {
            if (po.id_ecc_actual == null) continue;
            const nro = (po.nro_osi || "").trim();
            if (!nro || nro.toUpperCase().includes("PEN-")) continue;
            const list = eccToOsis.get(po.id_ecc_actual) || [];
            if (!list.includes(nro)) {
              list.push(nro);
            }
            eccToOsis.set(po.id_ecc_actual, list);
          }

          for (const ce of consolidatedEccs) {
            if (ce.id_servicio == null || ce.id_ecc_consolidada == null) continue;
            const parentNros = eccToOsis.get(ce.id_ecc_consolidada) || [];
            if (parentNros.length === 0) continue;
            const list = osiMap.get(ce.id_servicio) || [];
            for (const nro of parentNros) {
              if (!list.includes(nro)) {
                list.push(nro);
              }
            }
            osiMap.set(ce.id_servicio, list);
          }
        }
      }
    }
  }

  return (data || []).map((row: any) => {
    const rawNaturaleza = (row.bloque_recursos_requisitos as any)?.tipo_naturaleza_servicio;
    const catDept = (row.catalogo_servicios as any)?.id_departamento_ejecutante;

    const tipoNaturaleza: "cap" | "st" =
      rawNaturaleza === "st"
        ? "st"
        : rawNaturaleza === "cap"
        ? "cap"
        : catDept === 4
        ? "st"
        : "cap";

    const tipoServicioLabel =
      tipoNaturaleza === "cap"
        ? "Capacitación (CAP)"
        : "Servicio Técnico (ST)";

    const linkedOsis = row.id_servicio_relacionado
      ? osiMap.get(row.id_servicio_relacionado) || []
      : [];

    return {
      id: row.id,
      nombre_sugerido: row.nombre_sugerido,
      tipo_solicitud: row.tipo_solicitud,
      tipo_servicio: tipoServicioLabel,
      tipo_naturaleza: tipoNaturaleza,
      id_departamento_ejecutante: catDept ?? (tipoNaturaleza === "cap" ? 3 : 4),
      id_estatus: row.id_estatus,
      estatus_nombre: row.conf_estatus?.nombre_estado || "",
      solicitante_nombre: row.usuarios?.nombre_apellido || "",
      solicitante_departamento:
        departamentoMap.get((row.usuarios as any)?.departamento) || "",
      fecha_solicitud: row.fecha_solicitud,
      notas_count: notesCountMap.get(row.id) || 0,
      osi_count: linkedOsis.length,
      osi_numeros: linkedOsis,
      is_hidden: Boolean((row as Record<string, unknown>).is_hidden),
    };
  });

  const isDev = process.env.NODE_ENV === "development";
  // In production, strictly omit hidden records so they are never sent to the client or counted in metrics
  if (!isDev) {
    return allItems.filter((item) => !item.is_hidden);
  }

  return allItems;
}

// Dev-only action: toggle is_hidden flag for a record
export async function toggleDisenoServicioHidden(
  id: number,
  hidden: boolean,
): Promise<{ success: boolean; error?: string }> {
  // Security constraint: only callable in development server
  if (process.env.NODE_ENV !== "development") {
    return {
      success: false,
      error: "Esta acción solo está permitida desde el servidor de desarrollo.",
    };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ is_hidden: hidden })
    .eq("id", id);

  if (error) {
    console.error("Error updating is_hidden in solicitudes_diseno_servicio:", error);
    return {
      success: false,
      error: error.message.includes("is_hidden")
        ? "La columna 'is_hidden' no existe aún en Supabase. Ejecuta la migración en el SQL Editor de Supabase."
        : error.message,
    };
  }

  revalidatePath("/nuevo-servicio");
  return { success: true };
}

// Dev-only action: restore all hidden records
export async function restoreAllHiddenDisenoServicio(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  if (process.env.NODE_ENV !== "development") {
    return {
      success: false,
      error: "Esta acción solo está permitida desde el servidor de desarrollo.",
    };
  }

  const supabase = await createAdminClient();
  const { error, count } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ is_hidden: false })
    .eq("is_hidden", true);

  if (error) {
    return {
      success: false,
      error: error.message.includes("is_hidden")
        ? "La columna 'is_hidden' no existe aún en Supabase."
        : error.message,
    };
  }

  revalidatePath("/nuevo-servicio");
  return { success: true, count: count ?? 0 };
}

// Get single record by ID with all JSONB blocks
export async function getDisenoServicioById(id: number): Promise<DisenoServicioFullData | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("solicitudes_diseno_servicio")
    .select(`
      *,
      conf_estatus!solicitudes_diseno_servicio_id_estatus_fkey(nombre_estado),
      usuarios!solicitudes_diseno_servicio_id_solicitante_fkey(nombre_apellido, departamento),
      catalogo_servicios!solicitudes_diseno_servicio_id_servicio_relacionado_fkey(nombre, id_departamento_ejecutante)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching solicitud:", JSON.stringify(error, null, 2));
    return null;
  }

  if (!data) return null;

  let aprobador_nombre = "";
  if (data.id_usuario_aprobador) {
    const { data: aprobador } = await supabase
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id", data.id_usuario_aprobador)
      .single();
    aprobador_nombre = aprobador?.nombre_apellido || "";
  }

  let solicitante_departamento = "";
  if (data.usuarios?.departamento) {
    const { data: depto } = await supabase
      .from("departamentos")
      .select("nombre")
      .eq("id", data.usuarios.departamento)
      .single();
    solicitante_departamento = depto?.nombre || "";
  }

  const rawNaturaleza = (data.bloque_recursos_requisitos as any)?.tipo_naturaleza_servicio;
  const catDept = (data.catalogo_servicios as any)?.id_departamento_ejecutante;
  const isCAP = rawNaturaleza === "cap" || (!rawNaturaleza && catDept === 3);

  return {
    id: data.id,
    id_servicio_relacionado: data.id_servicio_relacionado,
    id_solicitante: data.id_solicitante,
    cargo_solicitante: data.cargo_solicitante,
    fecha_solicitud: data.fecha_solicitud,
    tipo_solicitud: data.tipo_solicitud,
    id_estatus: data.id_estatus,
    nombre_sugerido: data.nombre_sugerido,
    objetivo_proposito: data.objetivo_proposito,
    tipo_servicio: isCAP ? "Capacitación (CAP)" : "Servicio Técnico (ST)",
    id_departamento_ejecutante: catDept ?? (isCAP ? 3 : 4),
    fecha_aprobacion: data.fecha_aprobacion,
    id_usuario_aprobador: data.id_usuario_aprobador,
    observaciones_cierre: data.observaciones_cierre,
    solicitante_nombre: data.usuarios?.nombre_apellido || "",
    solicitante_departamento,
    estatus_nombre: data.conf_estatus?.nombre_estado || "",
    servicio_nombre: data.catalogo_servicios?.nombre || "",
    aprobador_nombre,
    bloque_recursos_requisitos: data.bloque_recursos_requisitos,
    bloque_higiene_seguridad_ambiente: data.bloque_higiene_seguridad_ambiente,
    bloque_planificacion_factibilidad: data.bloque_planificacion_factibilidad,
    bloque_controles_diseno: data.bloque_controles_diseno,
    bloque_salidas_diseno: data.bloque_salidas_diseno,
  };
}

// Notes management
export async function getUsuariosParaMenciones(): Promise<
  Array<{
    id: number;
    id_auth: string | null;
    nombre_apellido: string;
    departamento_nombre: string | null;
  }>
> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("usuarios")
      .select("id, id_auth, nombre_apellido, departamentos!usuarios_departamento_fkey(nombre)")
      .eq("esta_activo", true)
      .order("nombre_apellido");

    if (error) {
      console.error("Error fetching usuarios para menciones:", error);
      return [];
    }

    return (data || []).map((u: any) => ({
      id: u.id,
      id_auth: u.id_auth ?? null,
      nombre_apellido: u.nombre_apellido || "Sin nombre",
      departamento_nombre: u.departamentos?.nombre ?? null,
    }));
  } catch (err) {
    console.error("Unexpected error in getUsuariosParaMenciones:", err);
    return [];
  }
}

export async function getDisenoNotas(solicitudId: number): Promise<DisenoServicioNota[]> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("solicitudes_diseno_servicio_notas")
      .select("id, solicitud_id, nota, created_at, created_by, autor_nombre, autor_departamento")
      .eq("solicitud_id", solicitudId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching diseno notas:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Unexpected error in getDisenoNotas:", err);
    return [];
  }
}

export async function addDisenoNota(
  solicitudId: number,
  notaText: string,
  mentionedUserIds: number[] = [],
) {
  const trimmed = notaText.trim();
  if (!trimmed) {
    throw new Error("La nota no puede estar vacía.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let autorNombre = "Usuario";
  let autorDepartamento = "";

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre_apellido, departamentos!usuarios_departamento_fkey(nombre)")
      .eq("id_auth", user.id)
      .single();

    if (usuario) {
      autorNombre = usuario.nombre_apellido || "Usuario";
      autorDepartamento = (usuario.departamentos as any)?.nombre || "";
    }
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("solicitudes_diseno_servicio_notas")
    .insert({
      solicitud_id: solicitudId,
      nota: trimmed,
      created_by: user?.id || null,
      autor_nombre: autorNombre,
      autor_departamento: autorDepartamento,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting diseno nota:", error);
    throw error;
  }

  // Dispatch notifications for mentioned/tagged users
  if (mentionedUserIds.length > 0) {
    try {
      const { data: taggedUsers } = await admin
        .from("usuarios")
        .select("id, id_auth, nombre_apellido")
        .in("id", mentionedUserIds);

      const { data: sol } = await admin
        .from("solicitudes_diseno_servicio")
        .select("nombre_sugerido")
        .eq("id", solicitudId)
        .single();

      const solicitudNombre = sol?.nombre_sugerido || `Solicitud #${solicitudId}`;

      const validRecipients = (taggedUsers || []).filter(
        (u) => u.id_auth && u.id_auth !== user?.id,
      );

      if (validRecipients.length > 0) {
        const notifRows = validRecipients.map((u) => ({
          app_slug: "sgestion",
          event_key: "diseno_servicio_mencion",
          recipient_id_auth: u.id_auth,
          title: "Te mencionaron en un Nuevo Servicio",
          body: `${autorNombre} te mencionó en "${solicitudNombre}": "${trimmed.length > 90 ? trimmed.slice(0, 90) + "..." : trimmed}"`,
          link_path: `/nuevo-servicio/${solicitudId}`,
          metadata: {
            solicitud_id: solicitudId,
            nota_id: data.id,
          },
          dedupe_key: `diseno_nota:${data.id}:${u.id_auth}`,
          priority: 2,
        }));

        const { error: notifErr } = await admin
          .schema("notify")
          .from("inbox")
          .insert(notifRows);

        if (notifErr) {
          console.warn("[addDisenoNota] Warning inserting notify.inbox mention row:", notifErr);
        }
      }
    } catch (notifEx) {
      console.warn("[addDisenoNota] Exception during mention notification dispatch:", notifEx);
    }
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${solicitudId}`);
  return { success: true, data };
}

export async function deleteDisenoNota(notaId: number, solicitudId: number) {
  const admin = await createAdminClient();
  const { error } = await admin
    .from("solicitudes_diseno_servicio_notas")
    .delete()
    .eq("id", notaId);

  if (error) {
    console.error("Error deleting diseno nota:", error);
    throw error;
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${solicitudId}`);
  return { success: true };
}

// Helper: Validate that current user is authorized to edit this solicitud
async function assertCanEditSolicitud(solicitudId: number) {
  const admin = await createAdminClient();
  const { data: sol, error } = await admin
    .from("solicitudes_diseno_servicio")
    .select("id, id_estatus, id_departamento_ejecutante, bloque_recursos_requisitos, tipo_servicio, id_servicio_relacionado, nombre_sugerido, objetivo_proposito, bloque_salidas_diseno")
    .eq("id", solicitudId)
    .single();

  if (error || !sol) {
    throw new Error(`No se encontró la solicitud de diseño #${solicitudId}`);
  }

  const currentUser = await getCurrentUserForDiseno();
  if (!currentUser || !canUserEditDiseno(currentUser, sol)) {
    throw new Error(
      sol.id_estatus === ESTATUS_COMPLETADO
        ? "No tienes permisos para editar un diseño de servicio ya finalizado. Solo el coordinador o líder del departamento ejecutor y usuarios TED/Admin pueden realizar modificaciones."
        : "No tienes permisos para editar este diseño de servicio."
    );
  }

  return { sol, currentUser, admin };
}

// Synchronize outputs of a solicitud to catalogo_servicios and plantillas
export async function syncDisenoToCatalogo(id: number): Promise<{ linkedServicioId: number | null }> {
  const admin = await createAdminClient();
  const { data: solicitud, error: fetchErr } = await admin
    .from("solicitudes_diseno_servicio")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !solicitud) {
    throw new Error(`No se encontró la solicitud de diseño #${id}`);
  }

  const rawNaturaleza = (solicitud.bloque_recursos_requisitos as any)?.tipo_naturaleza_servicio;
  const isCap = rawNaturaleza === "cap" || solicitud.id_departamento_ejecutante === DEPT_CAPACITACION;
  const salidas = (solicitud.bloque_salidas_diseno || {}) as BloqueSalidasDiseno;
  const recursos = (solicitud.bloque_recursos_requisitos || {}) as BloqueRecursosRequisitos;

  let linkedServicioId = solicitud.id_servicio_relacionado;

  try {
    if (isCap) {
      // Capacitación: Course catalog
      const ficha = salidas.ficha_tecnica;
      const courseName = (ficha?.nombre || solicitud.nombre_sugerido || "CURSO").trim().toUpperCase();
      const coursePayload: Record<string, any> = {
        nombre: courseName,
        subtitulo: ficha?.subtitulo?.trim() ? ficha.subtitulo.trim().toUpperCase() : null,
        contenido_curso: ficha?.contenido_curso?.trim() || "",
        carga_horaria_std: ficha?.carga_horaria_std ? Number(ficha.carga_horaria_std) : null,
        para_quien: ficha?.para_quien?.trim() || null,
        modalidad: ficha?.modalidad || "Presencial",
        objetivo_general: ficha?.objetivo_general?.trim() || recursos.objetivo?.trim() || solicitud.objetivo_proposito || null,
        objetivo_especifico: ficha?.objetivo_especifico?.trim() || recursos.objetivo_especifico?.trim() || null,
        categoria: ficha?.categoria?.trim() || null,
        nota_aprobatoria: ficha?.nota_aprobatoria != null ? Number(ficha.nota_aprobatoria) : 14,
        emite_carnet: ficha?.emite_carnet === true,
        id_departamento_ejecutante: DEPT_CAPACITACION, // 3
        tipo_servicio: 1, // Curso
        esta_activo: true,
        mostrar_en_catalogo: true,
        estatus: "estandar",
      };

      if (linkedServicioId) {
        // Update existing linked service
        await admin
          .from("catalogo_servicios")
          .update(coursePayload)
          .eq("id", linkedServicioId);
      } else {
        // Check if an existing course in Capacitación already has this exact name
        const { data: existingCourse } = await admin
          .from("catalogo_servicios")
          .select("id")
          .eq("id_departamento_ejecutante", DEPT_CAPACITACION)
          .ilike("nombre", courseName)
          .maybeSingle();

        if (existingCourse) {
          linkedServicioId = existingCourse.id;
          await admin
            .from("catalogo_servicios")
            .update(coursePayload)
            .eq("id", linkedServicioId);
        } else {
          // Insert new course
          coursePayload.created_at = new Date().toISOString().split("T")[0];
          const { data: insertedCourse, error: insertCourseErr } = await admin
            .from("catalogo_servicios")
            .insert(coursePayload)
            .select("id")
            .single();

          if (!insertCourseErr && insertedCourse) {
            linkedServicioId = insertedCourse.id;
          } else {
            console.error("Error inserting course into catalogo_servicios:", insertCourseErr);
          }
        }
      }
    } else {
      // Servicios Técnicos: Technical service catalog
      const oferta = salidas.oferta_tecnica;
      const serviceName = (oferta?.titulo_servicio || solicitud.nombre_sugerido || "SERVICIO TÉCNICO").trim();
      const stPayload: Record<string, any> = {
        nombre: serviceName,
        id_departamento_ejecutante: DEPT_SERVICIOS_TECNICOS, // 4
        tipo_servicio: 2, // Servicio Técnico
        esta_activo: true,
        mostrar_en_catalogo: true,
        estatus: "estandar",
        objetivo_general:
          oferta?.proposito ||
          recursos.objetivo ||
          solicitud.objetivo_proposito ||
          null,
        objetivo_especifico:
          (oferta?.objetivos_especificos && oferta.objetivos_especificos.length > 0
            ? oferta.objetivos_especificos.join("\n")
            : null) ||
          recursos.objetivo_especifico ||
          null,
      };

      if (linkedServicioId) {
        await admin
          .from("catalogo_servicios")
          .update(stPayload)
          .eq("id", linkedServicioId);
      } else {
        const { data: existingSt } = await admin
          .from("catalogo_servicios")
          .select("id")
          .eq("id_departamento_ejecutante", DEPT_SERVICIOS_TECNICOS)
          .ilike("nombre", serviceName)
          .maybeSingle();

        if (existingSt) {
          linkedServicioId = existingSt.id;
          await admin
            .from("catalogo_servicios")
            .update(stPayload)
            .eq("id", linkedServicioId);
        } else {
          stPayload.created_at = new Date().toISOString().split("T")[0];
          const { data: insertedSt, error: insertStErr } = await admin
            .from("catalogo_servicios")
            .insert(stPayload)
            .select("id")
            .single();

          if (!insertStErr && insertedSt) {
            linkedServicioId = insertedSt.id;
          } else {
            console.error("Error inserting ST into catalogo_servicios:", insertStErr);
          }
        }
      }

      // Also register or update in st_plantillas_servicios if available
      try {
        await admin.from("st_plantillas_servicios").upsert({
          id_servicio_origen: linkedServicioId || null,
          id_solicitud_origen: id,
          nombre_plantilla: serviceName,
          tipo_plantilla: "original",
          oferta_tecnica: oferta || null,
          bloque_recursos: recursos,
          bloque_salidas: salidas,
          is_active: true,
        }, { onConflict: "id_solicitud_origen" });
      } catch {
        // Non-blocking
      }
    }

    if (linkedServicioId && linkedServicioId !== solicitud.id_servicio_relacionado) {
      await admin
        .from("solicitudes_diseno_servicio")
        .update({ id_servicio_relacionado: linkedServicioId })
        .eq("id", id);
    }
  } catch (syncErr) {
    console.error("Error syncing to catalogo_servicios:", syncErr);
  }

  return { linkedServicioId };
}

// Update suggested title
export async function updateNombreSugerido(id: number, nombreSugerido: string) {
  const trimmed = nombreSugerido.trim();
  if (!trimmed) {
    throw new Error("El título sugerido no puede estar vacío.");
  }

  const { sol, admin } = await assertCanEditSolicitud(id);

  const { error } = await admin
    .from("solicitudes_diseno_servicio")
    .update({ nombre_sugerido: trimmed })
    .eq("id", id);

  if (error) {
    console.error(`Error updating nombre_sugerido for solicitud #${id}:`, error);
    throw error;
  }

  if (sol.id_estatus === ESTATUS_COMPLETADO) {
    await syncDisenoToCatalogo(id);
  }

  revalidatePath(`/nuevo-servicio/${id}`);
  revalidatePath("/nuevo-servicio");
  return { success: true, nombre_sugerido: trimmed };
}

// Helper: Ensure request transitions to "en_proceso"
async function ensureEnProceso(client: any, id: number) {
  const { data } = await client
    .from("solicitudes_diseno_servicio")
    .select("id_estatus")
    .eq("id", id)
    .single();

  if (data?.id_estatus === ESTATUS_PENDIENTE) {
    await client
      .from("solicitudes_diseno_servicio")
      .update({ id_estatus: ESTATUS_EN_PROCESO })
      .eq("id", id);
  }
}

// Partial save: Bloque Recursos y Requisitos
export async function saveBloqueRecursos(id: number, data: BloqueRecursosRequisitos) {
  const { sol, admin } = await assertCanEditSolicitud(id);

  const { error } = await admin
    .from("solicitudes_diseno_servicio")
    .update({ bloque_recursos_requisitos: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(admin, id);

  if (sol.id_estatus === ESTATUS_COMPLETADO) {
    await syncDisenoToCatalogo(id);
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Partial save: Bloque Higiene, Seguridad y Ambiente
export async function saveBloqueHigiene(id: number, data: BloqueHigieneSeguridadAmbiente) {
  const { sol, admin } = await assertCanEditSolicitud(id);

  const { error } = await admin
    .from("solicitudes_diseno_servicio")
    .update({ bloque_higiene_seguridad_ambiente: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(admin, id);

  if (sol.id_estatus === ESTATUS_COMPLETADO) {
    await syncDisenoToCatalogo(id);
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Partial save: Bloque Factibilidad y Planificación
export async function saveBloquePlanificacion(id: number, data: BloquePlanificacionFactibilidad) {
  const { sol, admin } = await assertCanEditSolicitud(id);

  const { error } = await admin
    .from("solicitudes_diseno_servicio")
    .update({ bloque_planificacion_factibilidad: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(admin, id);

  if (sol.id_estatus === ESTATUS_COMPLETADO) {
    await syncDisenoToCatalogo(id);
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Partial save: Bloque Controles del Diseño
export async function saveBloqueControles(id: number, data: BloqueControlesDiseno) {
  const { sol, admin } = await assertCanEditSolicitud(id);

  const { error } = await admin
    .from("solicitudes_diseno_servicio")
    .update({ bloque_controles_diseno: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(admin, id);

  if (sol.id_estatus === ESTATUS_COMPLETADO) {
    await syncDisenoToCatalogo(id);
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Partial save: Bloque Salidas del Diseño
export async function saveBloqueSalidas(id: number, data: BloqueSalidasDiseno) {
  const { sol, admin } = await assertCanEditSolicitud(id);

  const { error } = await admin
    .from("solicitudes_diseno_servicio")
    .update({ bloque_salidas_diseno: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(admin, id);

  if (sol.id_estatus === ESTATUS_COMPLETADO) {
    await syncDisenoToCatalogo(id);
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Save Oferta Técnica directly into bloque_salidas_diseno
export async function saveOfertaTecnicaAction(
  solicitudId: number,
  ofertaData: OfertaTecnicaData,
) {
  const { sol, admin } = await assertCanEditSolicitud(solicitudId);

  const currentSalidas: BloqueSalidasDiseno = (sol.bloque_salidas_diseno || {
    checklist: [],
    checklist_cap: [],
    declaracion_cumplimiento: null,
    observaciones: "",
  }) as BloqueSalidasDiseno;

  const updatedSalidas: BloqueSalidasDiseno = {
    ...currentSalidas,
    oferta_tecnica: ofertaData,
  };

  const { error: updateErr } = await admin
    .from("solicitudes_diseno_servicio")
    .update({ bloque_salidas_diseno: updatedSalidas })
    .eq("id", solicitudId);

  if (updateErr) throw updateErr;

  await ensureEnProceso(admin, solicitudId);

  if (sol.id_estatus === ESTATUS_COMPLETADO) {
    await syncDisenoToCatalogo(solicitudId);
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${solicitudId}`);
  return { success: true };
}

// Save Ficha Técnica directly into bloque_salidas_diseno
export async function saveFichaTecnicaAction(
  solicitudId: number,
  fichaData: FichaTecnicaData,
) {
  const { sol, admin } = await assertCanEditSolicitud(solicitudId);

  const currentSalidas: BloqueSalidasDiseno = (sol.bloque_salidas_diseno || {
    checklist: [],
    checklist_cap: [],
    declaracion_cumplimiento: null,
    observaciones: "",
  }) as BloqueSalidasDiseno;

  const updatedSalidas: BloqueSalidasDiseno = {
    ...currentSalidas,
    ficha_tecnica: fichaData,
  };

  const { error: updateErr } = await admin
    .from("solicitudes_diseno_servicio")
    .update({ bloque_salidas_diseno: updatedSalidas })
    .eq("id", solicitudId);

  if (updateErr) throw updateErr;

  await ensureEnProceso(admin, solicitudId);

  if (sol.id_estatus === ESTATUS_COMPLETADO) {
    await syncDisenoToCatalogo(solicitudId);
  }

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${solicitudId}`);
  return { success: true };
}

// Finalize solicitud: marks completed + SYNC TO catalogo_servicios
export async function finalizarSolicitud(id: number) {
  const { sol, currentUser, admin } = await assertCanEditSolicitud(id);

  const userId = currentUser.id || null;

  // 1. Automatic catalog sync
  const { linkedServicioId } = await syncDisenoToCatalogo(id);

  // 2. Mark solicitud completed
  const { error } = await admin
    .from("solicitudes_diseno_servicio")
    .update({
      id_estatus: ESTATUS_COMPLETADO,
      fecha_aprobacion: new Date().toISOString(),
      id_usuario_aprobador: userId,
      id_servicio_relacionado: linkedServicioId || sol.id_servicio_relacionado,
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);

  // Notify the original solicitante that their request has been finalized
  await notifySolicitanteOfFinalizacion(id);

  return { success: true, linkedServicioId };
}
