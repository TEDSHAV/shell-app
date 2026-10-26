"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { notifySolicitanteOfFinalizacion } from "@/actions/diseno-servicio-notifications";
import {
  isCapacitacionDept,
  isServiciosTecnicosDept,
  isNegociosDept,
} from "@/lib/requisiciones-gerencia";
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

// Get current logged in user details
export async function getCurrentUserForDiseno() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*, departamentos!usuarios_departamento_fkey(nombre)")
    .eq("id_auth", user.id)
    .single();

  if (error) {
    console.error("Error fetching user details:", error);
    return null;
  }

  const deptName = (data.departamentos as any)?.nombre ?? null;
  const isCap = isCapacitacionDept(deptName);
  const isSt = isServiciosTecnicosDept(deptName);
  const isNeg = isNegociosDept(deptName);

  return {
    ...data,
    departamento_nombre: deptName,
    isCapacitacion: isCap,
    isServiciosTecnicos: isSt,
    isNegocios: isNeg,
  };
}

// Get all solicitudes for list view (accessible by Negocios, CAP, ST, TED, Admin)
export async function getDisenoServicioList(): Promise<DisenoServicioListItem[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
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

  if (error) {
    console.error("Error fetching solicitudes_diseno_servicio:", JSON.stringify(error, null, 2));
    return [];
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
    const { data: osis } = await supabase
      .from("v_osi_formato_completo")
      .select("id_osi, nro_osi, id_servicio")
      .in("id_servicio", servicioIds)
      .not("nro_osi", "ilike", "%PEN-%");

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
    };
  });
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

// Update suggested title
export async function updateNombreSugerido(id: number, nombreSugerido: string) {
  const trimmed = nombreSugerido.trim();
  if (!trimmed) {
    throw new Error("El título sugerido no puede estar vacío.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ nombre_sugerido: trimmed })
    .eq("id", id);

  if (error) {
    console.error(`Error updating nombre_sugerido for solicitud #${id}:`, error);
    throw error;
  }

  revalidatePath(`/nuevo-servicio/${id}`);
  revalidatePath("/nuevo-servicio");
  return { success: true, nombre_sugerido: trimmed };
}

// Helper: Ensure request transitions to "en_proceso"
async function ensureEnProceso(supabase: any, id: number) {
  const { data } = await supabase
    .from("solicitudes_diseno_servicio")
    .select("id_estatus")
    .eq("id", id)
    .single();

  if (data?.id_estatus === ESTATUS_PENDIENTE) {
    await supabase
      .from("solicitudes_diseno_servicio")
      .update({ id_estatus: ESTATUS_EN_PROCESO })
      .eq("id", id);
  }
}

// Partial save: Bloque Recursos y Requisitos
export async function saveBloqueRecursos(id: number, data: BloqueRecursosRequisitos) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_recursos_requisitos: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Partial save: Bloque Higiene, Seguridad y Ambiente
export async function saveBloqueHigiene(id: number, data: BloqueHigieneSeguridadAmbiente) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_higiene_seguridad_ambiente: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Partial save: Bloque Factibilidad y Planificación
export async function saveBloquePlanificacion(id: number, data: BloquePlanificacionFactibilidad) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_planificacion_factibilidad: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Partial save: Bloque Controles del Diseño
export async function saveBloqueControles(id: number, data: BloqueControlesDiseno) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_controles_diseno: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Partial save: Bloque Salidas del Diseño
export async function saveBloqueSalidas(id: number, data: BloqueSalidasDiseno) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_salidas_diseno: data })
    .eq("id", id);

  if (error) throw error;
  await ensureEnProceso(supabase, id);
  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);
  return { success: true };
}

// Save Oferta Técnica directly into bloque_salidas_diseno
export async function saveOfertaTecnicaAction(
  solicitudId: number,
  ofertaData: OfertaTecnicaData,
) {
  const supabase = await createClient();

  const { data: sol, error: fetchErr } = await supabase
    .from("solicitudes_diseno_servicio")
    .select("bloque_salidas_diseno")
    .eq("id", solicitudId)
    .single();

  if (fetchErr) throw fetchErr;

  const currentSalidas: BloqueSalidasDiseno = (sol?.bloque_salidas_diseno || {
    checklist: [],
    checklist_cap: [],
    declaracion_cumplimiento: null,
    observaciones: "",
  }) as BloqueSalidasDiseno;

  const updatedSalidas: BloqueSalidasDiseno = {
    ...currentSalidas,
    oferta_tecnica: ofertaData,
  };

  const { error: updateErr } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_salidas_diseno: updatedSalidas })
    .eq("id", solicitudId);

  if (updateErr) throw updateErr;

  await ensureEnProceso(supabase, solicitudId);
  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${solicitudId}`);
  return { success: true };
}

// Save Ficha Técnica directly into bloque_salidas_diseno
export async function saveFichaTecnicaAction(
  solicitudId: number,
  fichaData: FichaTecnicaData,
) {
  const supabase = await createClient();

  const { data: sol, error: fetchErr } = await supabase
    .from("solicitudes_diseno_servicio")
    .select("bloque_salidas_diseno")
    .eq("id", solicitudId)
    .single();

  if (fetchErr) throw fetchErr;

  const currentSalidas: BloqueSalidasDiseno = (sol?.bloque_salidas_diseno || {
    checklist: [],
    checklist_cap: [],
    declaracion_cumplimiento: null,
    observaciones: "",
  }) as BloqueSalidasDiseno;

  const updatedSalidas: BloqueSalidasDiseno = {
    ...currentSalidas,
    ficha_tecnica: fichaData,
  };

  const { error: updateErr } = await supabase
    .from("solicitudes_diseno_servicio")
    .update({ bloque_salidas_diseno: updatedSalidas })
    .eq("id", solicitudId);

  if (updateErr) throw updateErr;

  await ensureEnProceso(supabase, solicitudId);
  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${solicitudId}`);
  return { success: true };
}

// Finalize solicitud: marks completed + SYNC TO catalogo_servicios
export async function finalizarSolicitud(id: number) {
  const supabase = await createClient();
  const admin = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId: number | null = null;
  if (user) {
    const { data: userData } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id_auth", user.id)
      .single();
    userId = userData?.id || null;
  }

  // 1. Fetch current full solicitud to get output blocks
  const { data: solicitud, error: fetchErr } = await admin
    .from("solicitudes_diseno_servicio")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !solicitud) {
    throw new Error(`No se encontró la solicitud de diseño #${id}`);
  }

  const rawNaturaleza = (solicitud.bloque_recursos_requisitos as any)?.tipo_naturaleza_servicio;
  const isCap = rawNaturaleza === "cap";
  const salidas = (solicitud.bloque_salidas_diseno || {}) as BloqueSalidasDiseno;
  const recursos = (solicitud.bloque_recursos_requisitos || {}) as BloqueRecursosRequisitos;

  let linkedServicioId = solicitud.id_servicio_relacionado;

  // 2. AUTOMATIC CATALOG SYNC
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
        // Non-blocking if table or conflict constraint isn't set
      }
    }
  } catch (syncErr) {
    console.error("Error syncing to catalogo_servicios during finalize:", syncErr);
  }

  // 3. Mark solicitud completed
  const { error } = await admin
    .from("solicitudes_diseno_servicio")
    .update({
      id_estatus: ESTATUS_COMPLETADO,
      fecha_aprobacion: new Date().toISOString(),
      id_usuario_aprobador: userId,
      id_servicio_relacionado: linkedServicioId || solicitud.id_servicio_relacionado,
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/nuevo-servicio");
  revalidatePath(`/nuevo-servicio/${id}`);

  // Notify the original solicitante that their request has been finalized
  await notifySolicitanteOfFinalizacion(id);

  return { success: true, linkedServicioId };
}
