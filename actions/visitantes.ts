"use server";

import os from "os";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getClaims, getUserRolesByApp } from "@/actions/apps";
import {
  DEFAULT_VISITANTES_CONFIG,
  type VisitantesConfig,
} from "@/features/visitantes/lib/visitantes-defaults";
import {
  buildExitUpdatePayload,
  canEditVisitantesConfig,
  computeVisitantesKpis,
  getCaracasDateString,
  mergeVisitantesConfig,
  validateVisitorRegistration,
} from "@/lib/visitantes/service";

export interface VisitanteRegistro {
  id: number;
  nombre_apellido: string;
  nacionalidad: "V" | "E" | "P" | "J";
  cedula: string;
  telefono: string;
  empresa_procedencia: string | null;
  motivo_visita: string | null;
  departamento_destino: string | null;
  persona_a_visitar: string | null;
  nro_pase: string | null;
  fecha: string;
  hora_entrada: string;
  acepto_descargo: boolean;
  texto_descargo_aceptado: string | null;
  firma_entrada: string | null;
  responsable_usuario_id: number | null;
  responsable_nombre: string | null;
  responsable_departamento: string | null;
  asignado_por_nombre: string | null;
  asignado_at: string | null;
  estado: "en_visita" | "finalizada" | "cancelada";
  hora_salida: string | null;
  firma_salida: string | null;
  salida_registrada_por_id: number | null;
  salida_registrada_por_nombre: string | null;
  observaciones: string | null;
  metodo_registro: "qr" | "manual";
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitantesKpis {
  en_planta_ahora: number;
  visitas_hoy: number;
  sin_responsable_activo: number;
  finalizadas_hoy: number;
  total_registros: number;
}

export interface StaffOption {
  id: number;
  id_auth?: string | null;
  nombre_apellido: string;
  cargo: string | null;
  departamento_id: number | null;
  departamento_nombre: string | null;
}

export interface RegisterVisitorInput {
  nombre_apellido: string;
  nacionalidad?: "V" | "E" | "P" | "J";
  cedula: string;
  telefono?: string | null;
  empresa_procedencia?: string | null;
  motivo_visita?: string | null;
  departamento_destino?: string | null;
  persona_a_visitar?: string | null;
  nro_pase?: string | null;
  acepto_descargo: boolean;
  firma_entrada?: string | null;
  responsable_usuario_id?: number | null;
  responsable_nombre?: string | null;
  responsable_departamento?: string | null;
  observaciones?: string | null;
}

const DEFAULT_DEPARTAMENTOS = [
  "Administración",
  "Calidad",
  "Capacitación",
  "Dirección",
  "Marketing",
  "Negocios",
  "Recursos Humanos",
  "Servicios Técnicos",
  "TED",
];

// In-memory cache to minimize concurrent Supabase connections and avoid ConnectTimeoutError
let cachedStaffCatalog: {
  staffList: StaffOption[];
  departamentos: string[];
  timestamp: number;
} | null = null;

let cachedConfigEntry: {
  config: VisitantesConfig;
  updated_by_nombre?: string | null;
  updated_at?: string | null;
  timestamp: number;
} | null = null;

const CATALOG_TTL_MS = 5 * 60 * 1000; // 5 minutes

function detectLanIp(): string | null {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function withRetry<T extends { error?: { message?: string } | null }>(
  fn: () => PromiseLike<T>,
  retries = 2,
): Promise<T> {
  let lastRes = await fn();
  for (let i = 0; i < retries; i++) {
    const msg = lastRes?.error?.message || "";
    if (!msg.includes("fetch failed") && !msg.includes("ConnectTimeoutError")) {
      return lastRes;
    }
    await new Promise((r) => setTimeout(r, 250));
    lastRes = await fn();
  }
  return lastRes;
}

async function loadStaffAndDeptos(): Promise<{
  staffList: StaffOption[];
  departamentos: string[];
}> {
  if (
    cachedStaffCatalog &&
    Date.now() - cachedStaffCatalog.timestamp < CATALOG_TTL_MS
  ) {
    return {
      staffList: cachedStaffCatalog.staffList,
      departamentos: cachedStaffCatalog.departamentos,
    };
  }

  try {
    const admin = await createAdminClient();
    const usuariosRes = await withRetry(() =>
      admin
        .from("usuarios")
        .select(
          "id, id_auth, nombre_apellido, cargo, departamento, esta_activo, departamentos!usuarios_departamento_fkey(nombre)",
        )
        .order("nombre_apellido"),
    );

    if (usuariosRes.error || !usuariosRes.data) {
      return {
        staffList: cachedStaffCatalog?.staffList ?? [],
        departamentos:
          cachedStaffCatalog?.departamentos ?? DEFAULT_DEPARTAMENTOS,
      };
    }

    const staffList: StaffOption[] = (usuariosRes.data || [])
      .filter((u: any) => u.esta_activo !== false && u.nombre_apellido)
      .map((u: any) => ({
        id: u.id,
        id_auth: u.id_auth ?? null,
        nombre_apellido: u.nombre_apellido,
        cargo: u.cargo ?? null,
        departamento_id: u.departamento ?? null,
        departamento_nombre: u.departamentos?.nombre ?? null,
      }));

    const deptSet = new Set<string>(DEFAULT_DEPARTAMENTOS);
    for (const s of staffList) {
      if (s.departamento_nombre) {
        deptSet.add(s.departamento_nombre);
      }
    }
    const departamentos = [...deptSet].sort((a, b) => a.localeCompare(b, "es"));

    cachedStaffCatalog = {
      staffList,
      departamentos,
      timestamp: Date.now(),
    };

    return { staffList, departamentos };
  } catch {
    return {
      staffList: cachedStaffCatalog?.staffList ?? [],
      departamentos: cachedStaffCatalog?.departamentos ?? DEFAULT_DEPARTAMENTOS,
    };
  }
}

async function getCurrentStaffIdentity(): Promise<{
  usuarioId: number | null;
  authUserId: string | null;
  nombre: string;
  departamento: string | null;
  canManageConfig: boolean;
} | null> {
  try {
    const { data, error } = await getClaims();
    if (error || !data?.claims) return null;

    const claims = data.claims as Record<string, unknown>;
    const authUserId = (claims.sub as string) || null;
    const email = (claims.email as string) || "";
    const claimsRole =
      (claims.user_role as string) ??
      (claims.app_metadata as Record<string, string> | undefined)?.role ??
      null;

    const { staffList } = await loadStaffAndDeptos();
    const matched = authUserId
      ? staffList.find((s) => s.id_auth === authUserId)
      : undefined;

    const departamento = matched?.departamento_nombre ?? null;
    let canManageConfig = canEditVisitantesConfig({
      globalRole: claimsRole,
      departamento,
    });

    if (!canManageConfig) {
      const appRoles = await getUserRolesByApp();
      canManageConfig = canEditVisitantesConfig({
        globalRole: claimsRole,
        departamento,
        userRolesByApp: appRoles,
      });
    }

    return {
      usuarioId: matched?.id ?? null,
      authUserId,
      nombre:
        matched?.nombre_apellido ||
        (email ? email.split("@")[0] : "Usuario PRISMA"),
      departamento,
      canManageConfig,
    };
  } catch {
    return null;
  }
}

export async function getVisitantesConfig(): Promise<{
  config: VisitantesConfig;
  updated_by_nombre?: string | null;
  updated_at?: string | null;
}> {
  if (
    cachedConfigEntry &&
    Date.now() - cachedConfigEntry.timestamp < CATALOG_TTL_MS
  ) {
    return {
      config: cachedConfigEntry.config,
      updated_by_nombre: cachedConfigEntry.updated_by_nombre,
      updated_at: cachedConfigEntry.updated_at,
    };
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await withRetry(() =>
      admin
        .from("visitantes_config")
        .select("config, updated_by_nombre, updated_at")
        .eq("slug", "default")
        .maybeSingle(),
    );

    if (error || !data?.config) {
      return { config: DEFAULT_VISITANTES_CONFIG };
    }

    const merged = mergeVisitantesConfig(
      data.config as Partial<VisitantesConfig>,
    );

    cachedConfigEntry = {
      config: merged,
      updated_by_nombre: data.updated_by_nombre,
      updated_at: data.updated_at,
      timestamp: Date.now(),
    };

    return {
      config: merged,
      updated_by_nombre: data.updated_by_nombre,
      updated_at: data.updated_at,
    };
  } catch {
    return { config: cachedConfigEntry?.config ?? DEFAULT_VISITANTES_CONFIG };
  }
}

export async function saveVisitantesConfig(
  partialConfig: Partial<VisitantesConfig>,
): Promise<{ ok: boolean; error?: string; config?: VisitantesConfig }> {
  try {
    const staff = await getCurrentStaffIdentity();
    if (!staff) {
      return { ok: false, error: "Sesión no válida. Por favor inicie sesión." };
    }
    if (!staff.canManageConfig) {
      return {
        ok: false,
        error:
          "Solo usuarios Admin, Superadmin o del departamento TED pueden modificar la configuración del descargo.",
      };
    }

    const current = await getVisitantesConfig();
    const merged: VisitantesConfig = {
      ...current.config,
      ...partialConfig,
    };

    const nowIso = new Date().toISOString();
    const admin = await createAdminClient();
    const { error } = await withRetry(() =>
      admin.from("visitantes_config").upsert(
        {
          slug: "default",
          config: merged,
          updated_by: staff.authUserId,
          updated_by_nombre: staff.nombre,
          updated_at: nowIso,
        },
        { onConflict: "slug" },
      ),
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    cachedConfigEntry = {
      config: merged,
      updated_by_nombre: staff.nombre,
      updated_at: nowIso,
      timestamp: Date.now(),
    };

    revalidatePath("/visitantes");
    revalidatePath("/registro-visitante");
    return { ok: true, config: merged };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error inesperado al guardar la configuración.",
    };
  }
}

export async function registerVisitorPublic(
  input: RegisterVisitorInput,
): Promise<{
  ok: boolean;
  error?: string;
  registro?: VisitanteRegistro;
}> {
  try {
    const validation = validateVisitorRegistration(input, false);
    if (!validation.ok || !validation.sanitized) {
      return { ok: false, error: validation.error };
    }
    const {
      nombre_apellido: nombre,
      nacionalidad: nac,
      cedula: cedulaDigits,
      telefono,
      empresa_procedencia,
      motivo_visita,
      departamento_destino,
      persona_a_visitar,
    } = validation.sanitized;

    const hdrs = await headers();
    const forwardedFor = hdrs.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : hdrs.get("x-real-ip") || null;
    const userAgent = hdrs.get("user-agent") || null;

    const config = cachedConfigEntry?.config ?? DEFAULT_VISITANTES_CONFIG;
    const now = new Date();
    const fechaCaracas = getCaracasDateString(now);

    const admin = await createAdminClient();
    const { data, error } = await withRetry(() =>
      admin
        .from("visitantes_registros")
        .insert({
          nombre_apellido: nombre,
          nacionalidad: nac,
          cedula: cedulaDigits,
          telefono,
          empresa_procedencia,
          motivo_visita,
          departamento_destino,
          persona_a_visitar,
          fecha: fechaCaracas,
          hora_entrada: now.toISOString(),
          acepto_descargo: true,
          texto_descargo_aceptado: config.texto_descargo,
          firma_entrada: input.firma_entrada || null,
          estado: "en_visita",
          metodo_registro: "qr",
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .select("*")
        .single(),
    );

    if (error || !data) {
      console.error("[registerVisitorPublic] Error inserting:", error);
      return {
        ok: false,
        error:
          error?.message ||
          "No se pudo completar el registro. Por favor avise en recepción.",
      };
    }

    revalidatePath("/visitantes");
    return {
      ok: true,
      registro: data as VisitanteRegistro,
    };
  } catch (err) {
    console.error("[registerVisitorPublic] Unexpected error:", err);
    return {
      ok: false,
      error: "Ocurrió un error inesperado al registrar su visita.",
    };
  }
}

export async function registerVisitorManual(
  input: RegisterVisitorInput,
): Promise<{
  ok: boolean;
  error?: string;
  registro?: VisitanteRegistro;
}> {
  try {
    const staff = await getCurrentStaffIdentity();
    if (!staff) {
      return { ok: false, error: "Sesión no válida. Por favor inicie sesión." };
    }

    const validation = validateVisitorRegistration(
      { ...input, acepto_descargo: input.acepto_descargo ?? true },
      false,
    );
    if (!validation.ok || !validation.sanitized) {
      return { ok: false, error: validation.error };
    }
    const {
      nombre_apellido: nombre,
      nacionalidad: nac,
      cedula: cedulaDigits,
      telefono,
      empresa_procedencia,
      motivo_visita,
      departamento_destino,
      persona_a_visitar,
      nro_pase,
    } = validation.sanitized;

    const config = cachedConfigEntry?.config ?? DEFAULT_VISITANTES_CONFIG;
    const now = new Date();
    const fechaCaracas = getCaracasDateString(now);

    const hasResponsable = Boolean(
      input.responsable_nombre?.trim() || input.responsable_usuario_id,
    );

    const admin = await createAdminClient();
    const { data, error } = await withRetry(() =>
      admin
        .from("visitantes_registros")
        .insert({
          nombre_apellido: nombre,
          nacionalidad: nac,
          cedula: cedulaDigits,
          telefono,
          empresa_procedencia,
          motivo_visita,
          departamento_destino,
          persona_a_visitar,
          nro_pase,
          fecha: fechaCaracas,
          hora_entrada: now.toISOString(),
          acepto_descargo: input.acepto_descargo ?? true,
          texto_descargo_aceptado: config.texto_descargo,
          firma_entrada: input.firma_entrada || null,
          responsable_usuario_id: input.responsable_usuario_id ?? null,
          responsable_nombre: input.responsable_nombre?.trim() || null,
          responsable_departamento:
            input.responsable_departamento?.trim() || null,
          asignado_por_nombre: hasResponsable ? staff.nombre : null,
          asignado_at: hasResponsable ? now.toISOString() : null,
          observaciones: input.observaciones?.trim() || null,
          estado: "en_visita",
          metodo_registro: "manual",
        })
        .select("*")
        .single(),
    );

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "No se pudo registrar el visitante.",
      };
    }

    revalidatePath("/visitantes");
    return {
      ok: true,
      registro: data as VisitanteRegistro,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error inesperado al registrar visitante.",
    };
  }
}

export async function assignVisitorResponsible(
  visitanteId: number,
  payload: {
    responsable_usuario_id?: number | null;
    responsable_nombre: string;
    responsable_departamento?: string | null;
    nro_pase?: string | null;
    observaciones?: string | null;
  },
): Promise<{
  ok: boolean;
  error?: string;
  registro?: VisitanteRegistro;
}> {
  try {
    const staff = await getCurrentStaffIdentity();
    if (!staff) {
      return { ok: false, error: "Sesión no válida. Por favor inicie sesión." };
    }

    const respNombre = (payload.responsable_nombre || "").trim();
    if (!respNombre) {
      return {
        ok: false,
        error: "Debe indicar el nombre del responsable asignado.",
      };
    }

    const nowIso = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      responsable_usuario_id: payload.responsable_usuario_id ?? null,
      responsable_nombre: respNombre,
      responsable_departamento:
        payload.responsable_departamento?.trim() || null,
      asignado_por_nombre: staff.nombre,
      asignado_at: nowIso,
      updated_at: nowIso,
    };

    if (payload.nro_pase !== undefined) {
      updateData.nro_pase = payload.nro_pase?.trim() || null;
    }
    if (payload.observaciones !== undefined) {
      updateData.observaciones = payload.observaciones?.trim() || null;
    }

    const admin = await createAdminClient();
    const { data, error } = await withRetry(() =>
      admin
        .from("visitantes_registros")
        .update(updateData)
        .eq("id", visitanteId)
        .select("*")
        .single(),
    );

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "No se pudo asignar el responsable.",
      };
    }

    revalidatePath("/visitantes");
    return {
      ok: true,
      registro: data as VisitanteRegistro,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error inesperado al asignar responsable.",
    };
  }
}

export async function markVisitorExit(
  visitanteId: number,
  payload?: {
    hora_salida?: string | null;
    observaciones?: string | null;
    nro_pase?: string | null;
    responsable_usuario_id?: number | null;
    responsable_nombre?: string | null;
    responsable_departamento?: string | null;
  },
): Promise<{
  ok: boolean;
  error?: string;
  registro?: VisitanteRegistro;
}> {
  try {
    const staff = await getCurrentStaffIdentity();
    if (!staff) {
      return { ok: false, error: "Sesión no válida. Por favor inicie sesión." };
    }

    const admin = await createAdminClient();
    const { data: existing } = await withRetry(() =>
      admin
        .from("visitantes_registros")
        .select(
          "id, responsable_usuario_id, responsable_nombre, responsable_departamento, observaciones, nro_pase",
        )
        .eq("id", visitanteId)
        .maybeSingle(),
    );

    const updateData = buildExitUpdatePayload({
      existing,
      staff,
      payload,
    });

    const { data, error } = await withRetry(() =>
      admin
        .from("visitantes_registros")
        .update(updateData)
        .eq("id", visitanteId)
        .select("*")
        .single(),
    );

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "No se pudo registrar la salida.",
      };
    }

    revalidatePath("/visitantes");
    return {
      ok: true,
      registro: data as VisitanteRegistro,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error inesperado al registrar la salida.",
    };
  }
}

export async function reopenVisitorEntry(visitanteId: number): Promise<{
  ok: boolean;
  error?: string;
  registro?: VisitanteRegistro;
}> {
  try {
    const staff = await getCurrentStaffIdentity();
    if (!staff) {
      return { ok: false, error: "Sesión no válida. Por favor inicie sesión." };
    }

    const admin = await createAdminClient();
    const { data, error } = await withRetry(() =>
      admin
        .from("visitantes_registros")
        .update({
          estado: "en_visita",
          hora_salida: null,
          firma_salida: null,
          salida_registrada_por_id: null,
          salida_registrada_por_nombre: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", visitanteId)
        .select("*")
        .single(),
    );

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "No se pudo reabrir la visita.",
      };
    }

    revalidatePath("/visitantes");
    return {
      ok: true,
      registro: data as VisitanteRegistro,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error inesperado al reabrir la visita.",
    };
  }
}

export async function getPublicVisitantesInitData(): Promise<{
  config: VisitantesConfig;
  departamentos: string[];
}> {
  try {
    const configRes = await getVisitantesConfig();
    const departamentos =
      cachedStaffCatalog?.departamentos ?? DEFAULT_DEPARTAMENTOS;
    return { config: configRes.config, departamentos };
  } catch {
    return {
      config: DEFAULT_VISITANTES_CONFIG,
      departamentos: DEFAULT_DEPARTAMENTOS,
    };
  }
}

export async function getVisitantesDashboardData(): Promise<{
  registros: VisitanteRegistro[];
  kpis: VisitantesKpis;
  staffList: StaffOption[];
  departamentos: string[];
  currentUser: {
    usuarioId: number | null;
    nombre: string;
    departamento: string | null;
  };
  config: VisitantesConfig;
  configUpdatedBy?: string | null;
  configUpdatedAt?: string | null;
  canManageConfig: boolean;
  lanIp?: string | null;
}> {
  const todayCaracas = getCaracasDateString();
  const lanIp = detectLanIp();
  const emptyKpis: VisitantesKpis = {
    en_planta_ahora: 0,
    visitas_hoy: 0,
    sin_responsable_activo: 0,
    finalizadas_hoy: 0,
    total_registros: 0,
  };

  try {
    const admin = await createAdminClient();

    // Primary fast query: visitantes_registros
    const [registrosRes, claimsRes, catalog, configRes] = await Promise.all([
      withRetry(() =>
        admin
          .from("visitantes_registros")
          .select("*")
          .order("hora_entrada", { ascending: false })
          .limit(300),
      ),
      getClaims(),
      loadStaffAndDeptos(),
      getVisitantesConfig(),
    ]);

    const registros = ((registrosRes.data || []) as VisitanteRegistro[]).filter(
      (r) => r.estado !== "cancelada",
    );

    const kpis = computeVisitantesKpis(registros, todayCaracas);

    const claims = (claimsRes?.data?.claims ?? {}) as Record<string, unknown>;
    const authUserId = (claims.sub as string) || null;
    const emailClaim = (claims.email as string) || "";
    const claimsRole =
      (claims.user_role as string) ??
      (claims.app_metadata as Record<string, string> | undefined)?.role ??
      null;

    const matchedStaff = authUserId
      ? catalog.staffList.find((s) => s.id_auth === authUserId)
      : undefined;

    const departamento = matchedStaff?.departamento_nombre ?? null;
    let canManageConfig = canEditVisitantesConfig({
      globalRole: claimsRole,
      departamento,
    });

    if (!canManageConfig && authUserId) {
      const appRoles = await getUserRolesByApp();
      canManageConfig = canEditVisitantesConfig({
        globalRole: claimsRole,
        departamento,
        userRolesByApp: appRoles,
      });
    }

    const currentUser = {
      usuarioId: matchedStaff?.id ?? null,
      nombre:
        matchedStaff?.nombre_apellido ||
        (emailClaim ? emailClaim.split("@")[0] : "Usuario PRISMA"),
      departamento,
    };

    return {
      registros,
      kpis,
      staffList: catalog.staffList,
      departamentos: catalog.departamentos,
      currentUser,
      config: configRes.config,
      configUpdatedBy: configRes.updated_by_nombre,
      configUpdatedAt: configRes.updated_at,
      canManageConfig,
      lanIp,
    };
  } catch (err) {
    console.error("[getVisitantesDashboardData] Error:", err);
    return {
      registros: [],
      kpis: emptyKpis,
      staffList: cachedStaffCatalog?.staffList ?? [],
      departamentos:
        cachedStaffCatalog?.departamentos ?? DEFAULT_DEPARTAMENTOS,
      currentUser: {
        usuarioId: null,
        nombre: "Usuario PRISMA",
        departamento: null,
      },
      config: cachedConfigEntry?.config ?? DEFAULT_VISITANTES_CONFIG,
      canManageConfig: false,
      lanIp,
    };
  }
}
