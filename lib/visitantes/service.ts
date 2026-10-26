import {
  DEFAULT_VISITANTES_CONFIG,
  type VisitantesConfig,
} from "@/features/visitantes/lib/visitantes-defaults";
import type {
  RegisterVisitorInput,
  VisitanteRegistro,
  VisitantesKpis,
} from "@/actions/visitantes";

export function getCaracasDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function validateVisitorRegistration(
  input: RegisterVisitorInput,
  requireSignature = false,
): {
  ok: boolean;
  error?: string;
  sanitized?: {
    nombre_apellido: string;
    nacionalidad: "V" | "E" | "P" | "J";
    cedula: string;
    telefono: string;
    empresa_procedencia: string;
    motivo_visita: string | null;
    departamento_destino: string | null;
    persona_a_visitar: string | null;
    nro_pase: string | null;
  };
} {
  const nombre = (input.nombre_apellido || "").trim();
  const rawNac = (input.nacionalidad || "V").toUpperCase();
  const nacionalidad: "V" | "E" | "P" | "J" = ["V", "E", "P", "J"].includes(
    rawNac,
  )
    ? (rawNac as "V" | "E" | "P" | "J")
    : "V";
  const cedula = (input.cedula || "").replace(/\D/g, "");
  const telefono = (input.telefono || "").trim();

  if (!nombre || nombre.length < 3) {
    return {
      ok: false,
      error: "Por favor ingrese su nombre y apellido completo.",
    };
  }

  if (!cedula || cedula.length < 5 || cedula.length > 10) {
    return {
      ok: false,
      error: "Por favor ingrese un número de cédula o documento válido.",
    };
  }

  if (!input.acepto_descargo) {
    return {
      ok: false,
      error:
        "Debe leer y aceptar las normas de visita y el descargo de responsabilidad para continuar.",
    };
  }

  if (requireSignature && !input.firma_entrada) {
    return {
      ok: false,
      error: "Por favor coloque su firma digital en el recuadro de entrada.",
    };
  }

  return {
    ok: true,
    sanitized: {
      nombre_apellido: nombre,
      nacionalidad,
      cedula,
      // Empty string fallback satisfies NOT NULL if column wasn't altered yet
      telefono: telefono || "",
      empresa_procedencia: input.empresa_procedencia?.trim() || "Particular",
      motivo_visita: input.motivo_visita?.trim() || null,
      departamento_destino: input.departamento_destino?.trim() || null,
      persona_a_visitar: input.persona_a_visitar?.trim() || null,
      nro_pase: input.nro_pase?.trim() || null,
    },
  };
}

export function computeVisitantesKpis(
  registros: VisitanteRegistro[],
  todayCaracas: string = getCaracasDateString(),
): VisitantesKpis {
  const activeList = registros.filter((r) => r.estado !== "cancelada");
  return {
    en_planta_ahora: activeList.filter((r) => r.estado === "en_visita").length,
    visitas_hoy: activeList.filter((r) => r.fecha === todayCaracas).length,
    sin_responsable_activo: activeList.filter(
      (r) => r.estado === "en_visita" && !r.responsable_nombre,
    ).length,
    finalizadas_hoy: activeList.filter(
      (r) => r.fecha === todayCaracas && r.estado === "finalizada",
    ).length,
    total_registros: activeList.length,
  };
}

export function mergeVisitantesConfig(
  stored?: Partial<VisitantesConfig> | null,
): VisitantesConfig {
  if (!stored) return { ...DEFAULT_VISITANTES_CONFIG };
  return {
    ...DEFAULT_VISITANTES_CONFIG,
    ...stored,
  };
}

export function canEditVisitantesConfig(params: {
  globalRole?: string | null;
  departamento?: string | null;
  userRolesByApp?: Record<string, string>;
}): boolean {
  const role = (params.globalRole || "").toLowerCase();
  if (role === "admin" || role === "superadmin") return true;

  const dept = (params.departamento || "").toUpperCase();
  if (dept.includes("TED")) return true;

  const appRoles = params.userRolesByApp || {};
  if (appRoles.ted) return true;
  for (const r of Object.values(appRoles)) {
    const lower = (r || "").toLowerCase();
    if (lower === "admin" || lower === "superadmin") return true;
  }

  return false;
}

export function buildExitUpdatePayload(params: {
  existing?: {
    responsable_usuario_id?: number | null;
    responsable_nombre?: string | null;
    responsable_departamento?: string | null;
    observaciones?: string | null;
    nro_pase?: string | null;
  } | null;
  staff: {
    usuarioId: number | null;
    nombre: string;
    departamento: string | null;
  };
  payload?: {
    hora_salida?: string | null;
    observaciones?: string | null;
    nro_pase?: string | null;
    responsable_usuario_id?: number | null;
    responsable_nombre?: string | null;
    responsable_departamento?: string | null;
  };
  nowIso?: string;
}): Record<string, unknown> {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const horaSalida = params.payload?.hora_salida || nowIso;

  const finalResponsableNombre =
    params.payload?.responsable_nombre?.trim() ||
    params.existing?.responsable_nombre ||
    params.staff.nombre;

  const finalResponsableId =
    params.payload?.responsable_usuario_id !== undefined
      ? params.payload.responsable_usuario_id
      : (params.existing?.responsable_usuario_id ?? params.staff.usuarioId);

  const finalResponsableDept =
    params.payload?.responsable_departamento?.trim() ||
    params.existing?.responsable_departamento ||
    params.staff.departamento;

  const updateData: Record<string, unknown> = {
    estado: "finalizada",
    hora_salida: horaSalida,
    salida_registrada_por_id: params.staff.usuarioId,
    salida_registrada_por_nombre: params.staff.nombre,
    firma_salida: `Salida confirmada por ${params.staff.nombre}`,
    responsable_usuario_id: finalResponsableId,
    responsable_nombre: finalResponsableNombre,
    responsable_departamento: finalResponsableDept,
    updated_at: nowIso,
  };

  if (!params.existing?.responsable_nombre) {
    updateData.asignado_por_nombre = staffNameOrDefault(params.staff.nombre);
    updateData.asignado_at = nowIso;
  }

  if (params.payload?.observaciones !== undefined) {
    updateData.observaciones = params.payload.observaciones?.trim() || null;
  }
  if (params.payload?.nro_pase !== undefined) {
    updateData.nro_pase = params.payload.nro_pase?.trim() || null;
  }

  return updateData;
}

function staffNameOrDefault(name: string): string {
  return name || "Usuario PRISMA";
}
