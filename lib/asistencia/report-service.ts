import { createServerClient } from "@supabase/ssr";
import { send_mail, ted_request_to } from "@/lib/email/send";
import {
  buildAsistenciaReportEmail,
  type AsistenciaDepartmentGroup,
  type AsistenciaSnapshot,
  type AsistenciaStatus,
  type AsistenciaUserRow,
} from "./email-template";
import {
  DEFAULT_CUTOFF_TIME,
  DEFAULT_SECOND_CUTOFF_TIME,
  formatCaracasTime12h,
  getCaracasDateString,
  getCaracasTimeString,
  isOnOrBeforeCutoff,
  isWeekdayCaracas,
  normalizeCutoffTime,
} from "./time";

export type AsistenciaConfigRow = {
  id: number;
  activo: boolean;
  hora_corte: string;
  activo_corte_2: boolean;
  hora_corte_2: string;
  timezone: string;
  omitir_feriados: boolean;
  usuarios_excluidos: number[];
  departamentos_excluidos: number[];
};

export type AsistenciaDestinatario = {
  id: number;
  email: string;
  nombre: string | null;
  activo: boolean;
  created_at: string;
};

export type AsistenciaReporteLogRow = {
  id: number;
  fecha: string;
  tipo: "scheduled" | "manual";
  corte: 1 | 2;
  total_esperados: number;
  total_presentes: number;
  total_tardios: number;
  total_ausentes: number;
  destinatarios: string;
  status: string;
  error_message: string | null;
  sent_at: string;
};

/**
 * Creates a standalone service-role Supabase client that does not depend on Next.js request cookies().
 * Safe to use inside background schedulers, API routes, and server actions.
 */
export function createServiceRoleClient() {
  const url = (
    process.env.DEV_SUPABASE_STAGING_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    process.env.DEV_SUPABASE_STAGING_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();

  if (!url || !key) {
    throw new Error("Supabase URL or Service Role Key is not configured.");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}

export async function getAsistenciaConfig(
  supabase = createServiceRoleClient(),
): Promise<AsistenciaConfigRow> {
  const { data } = await supabase
    .from("asistencia_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return {
    id: 1,
    activo: data?.activo !== undefined ? Boolean(data.activo) : true,
    hora_corte: normalizeCutoffTime(
      data?.hora_corte ? String(data.hora_corte) : DEFAULT_CUTOFF_TIME,
    ),
    activo_corte_2:
      data?.activo_corte_2 !== undefined ? Boolean(data.activo_corte_2) : true,
    hora_corte_2: normalizeCutoffTime(
      data?.hora_corte_2 ? String(data.hora_corte_2) : DEFAULT_SECOND_CUTOFF_TIME,
    ),
    timezone: String(data?.timezone || "America/Caracas"),
    omitir_feriados:
      data?.omitir_feriados !== undefined ? Boolean(data.omitir_feriados) : true,
    usuarios_excluidos: Array.isArray(data?.usuarios_excluidos)
      ? data.usuarios_excluidos.map((n: unknown) => Number(n)).filter((n: number) => n > 0)
      : [],
    departamentos_excluidos: Array.isArray(data?.departamentos_excluidos)
      ? data.departamentos_excluidos
          .map((n: unknown) => Number(n))
          .filter((n: number) => n > 0)
      : [],
  };
}

export async function listAsistenciaDestinatarios(
  supabase = createServiceRoleClient(),
): Promise<AsistenciaDestinatario[]> {
  const { data, error } = await supabase
    .from("asistencia_destinatarios")
    .select("id, email, nombre, activo, created_at")
    .order("created_at", { ascending: true });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: Record<string, unknown>) => ({
    id: Number(row.id ?? 0),
    email: String(row.email ?? ""),
    nombre: row.nombre ? String(row.nombre) : null,
    activo: Boolean(row.activo ?? true),
    created_at: String(row.created_at ?? ""),
  }));
}

export async function listAsistenciaReportLogs(
  limit = 25,
  supabase = createServiceRoleClient(),
): Promise<AsistenciaReporteLogRow[]> {
  const { data, error } = await supabase
    .from("asistencia_reportes_log")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: Record<string, unknown>) => ({
    id: Number(row.id ?? 0),
    fecha: String(row.fecha ?? ""),
    tipo: row.tipo === "manual" ? "manual" : "scheduled",
    corte: Number(row.corte ?? 1) === 2 ? 2 : 1,
    total_esperados: Number(row.total_esperados ?? 0),
    total_presentes: Number(row.total_presentes ?? 0),
    total_tardios: Number(row.total_tardios ?? 0),
    total_ausentes: Number(row.total_ausentes ?? 0),
    destinatarios: String(row.destinatarios ?? ""),
    status: String(row.status ?? ""),
    error_message: row.error_message ? String(row.error_message) : null,
    sent_at: String(row.sent_at ?? ""),
  }));
}

/**
 * Builds the complete attendance snapshot for a given YYYY-MM-DD date in America/Caracas.
 */
export async function buildAsistenciaSnapshot(
  fecha: string = getCaracasDateString(),
  supabase = createServiceRoleClient(),
  corte: 1 | 2 = 1,
  overrideCutoff?: string,
): Promise<AsistenciaSnapshot> {
  const [
    config,
    usuariosRes,
    departamentosRes,
    puestosRes,
    asistenciaRes,
    feriadoRes,
  ] = await Promise.all([
    getAsistenciaConfig(supabase),
    supabase
      .from("usuarios")
      .select(
        "id, nombre_apellido, email_corporativo, cargo, departamento, esta_activo, id_auth",
      )
      .not("id_auth", "is", null)
      .or("esta_activo.is.null,esta_activo.eq.true")
      .order("nombre_apellido", { ascending: true }),
    supabase
      .from("departamentos")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
    supabase.from("puestos_empleados").select("id_empleado, cargo"),
    supabase
      .from("asistencia_diaria")
      .select("usuario_id, hora_registro, metodo")
      .eq("fecha", fecha),
    supabase
      .from("cat_feriados_venezuela")
      .select("fecha, nombre")
      .eq("fecha", fecha)
      .maybeSingle(),
  ]);

  const deptNameById = new Map<number, string>();
  for (const d of (departamentosRes.data ?? []) as Array<Record<string, unknown>>) {
    const id = Number(d.id ?? 0);
    const nombre = String(d.nombre ?? "").trim();
    if (id > 0 && nombre) deptNameById.set(id, nombre);
  }

  const cargoByUserId = new Map<number, string>();
  for (const p of (puestosRes.data ?? []) as Array<Record<string, unknown>>) {
    const id = Number(p.id_empleado ?? 0);
    const cargo = String(p.cargo ?? "").trim();
    if (id > 0 && cargo) cargoByUserId.set(id, cargo);
  }

  const attendanceByUserId = new Map<
    number,
    { hora_registro: string; metodo: string }
  >();
  for (const a of (asistenciaRes.data ?? []) as Array<Record<string, unknown>>) {
    const uid = Number(a.usuario_id ?? 0);
    if (uid > 0 && a.hora_registro) {
      attendanceByUserId.set(uid, {
        hora_registro: String(a.hora_registro),
        metodo: String(a.metodo ?? "login"),
      });
    }
  }

  const excludedUsersSet = new Set(config.usuarios_excluidos);
  const excludedDeptsSet = new Set(config.departamentos_excluidos);

  const cutoffTime = overrideCutoff
    ? normalizeCutoffTime(overrideCutoff)
    : corte === 2
      ? config.hora_corte_2
      : config.hora_corte;

  const includedRows: AsistenciaUserRow[] = [];
  const excludedRows: AsistenciaUserRow[] = [];

  for (const u of (usuariosRes.data ?? []) as Array<Record<string, unknown>>) {
    const id = Number(u.id ?? 0);
    const nombre = String(u.nombre_apellido ?? "").trim();
    if (id <= 0 || !nombre) continue;

    const deptIdRaw = Number(u.departamento ?? 0);
    const deptId = Number.isFinite(deptIdRaw) && deptIdRaw > 0 ? deptIdRaw : null;
    const deptNombre =
      (deptId ? deptNameById.get(deptId) : null) || "Sin departamento asignado";

    const cargoDirect = String(u.cargo ?? "").trim();
    const cargo = cargoDirect || cargoByUserId.get(id) || null;
    const email = String(u.email_corporativo ?? "").trim() || null;

    const att = attendanceByUserId.get(id);
    const hora_registro = att?.hora_registro ?? null;
    const hora_formateada = hora_registro
      ? formatCaracasTime12h(hora_registro)
      : null;

    const isExcluded =
      excludedUsersSet.has(id) || (deptId !== null && excludedDeptsSet.has(deptId));

    let estado: AsistenciaStatus;
    let presente_en_corte = false;

    if (isExcluded) {
      estado = "excluido";
      presente_en_corte = Boolean(
        hora_registro && isOnOrBeforeCutoff(hora_registro, cutoffTime),
      );
    } else if (hora_registro) {
      if (isOnOrBeforeCutoff(hora_registro, cutoffTime)) {
        estado = "presente";
        presente_en_corte = true;
      } else {
        estado = "tardio";
        presente_en_corte = false;
      }
    } else {
      estado = "ausente";
      presente_en_corte = false;
    }

    const row: AsistenciaUserRow = {
      usuario_id: id,
      nombre_apellido: nombre,
      email_corporativo: email,
      cargo,
      departamento_id: deptId,
      departamento_nombre: deptNombre,
      hora_registro,
      hora_formateada,
      metodo: att?.metodo ?? null,
      estado,
      presente_en_corte,
    };

    if (isExcluded) {
      excludedRows.push(row);
    } else {
      includedRows.push(row);
    }
  }

  const groupsMap = new Map<string, AsistenciaDepartmentGroup>();
  for (const row of includedRows) {
    const key = `${row.departamento_id ?? 0}:${row.departamento_nombre}`;
    let group = groupsMap.get(key);
    if (!group) {
      group = {
        departamento_id: row.departamento_id,
        departamento_nombre: row.departamento_nombre,
        usuarios: [],
        total: 0,
        presentes: 0,
        ausentes: 0,
        tardios: 0,
      };
      groupsMap.set(key, group);
    }
    group.usuarios.push(row);
    group.total += 1;
    if (row.presente_en_corte) {
      group.presentes += 1;
    } else {
      group.ausentes += 1;
      if (row.estado === "tardio") {
        group.tardios += 1;
      }
    }
  }

  const departamentos = Array.from(groupsMap.values()).sort((a, b) => {
    if (a.departamento_id === null && b.departamento_id !== null) return 1;
    if (a.departamento_id !== null && b.departamento_id === null) return -1;
    return a.departamento_nombre.localeCompare(b.departamento_nombre, "es");
  });

  const total_esperados = includedRows.length;
  const total_presentes = includedRows.filter((r) => r.presente_en_corte).length;
  const total_tardios = includedRows.filter((r) => r.estado === "tardio").length;
  const total_ausentes = total_esperados - total_presentes;
  const porcentaje_asistencia =
    total_esperados > 0
      ? Math.round((total_presentes / total_esperados) * 100)
      : 0;

  const feriadoData = feriadoRes.data as { fecha?: string; nombre?: string } | null;

  return {
    fecha,
    hora_corte: cutoffTime,
    corte,
    es_feriado: Boolean(feriadoData?.fecha),
    nombre_feriado: feriadoData?.nombre ? String(feriadoData.nombre) : null,
    total_esperados,
    total_presentes,
    total_tardios,
    total_ausentes,
    total_excluidos: excludedRows.length,
    porcentaje_asistencia,
    departamentos,
    excluidos: excludedRows,
  };
}

/**
 * Dispatches the attendance email report for a given date and corte (1 = morning, 2 = afternoon).
 * - For `tipo === "scheduled"`, enforces weekday/holiday checks and database idempotency so only 1 scheduled email is ever sent per date and corte.
 * - For `tipo === "manual"`, sends immediately (either to `overrideRecipients` or configured active recipients).
 */
export async function sendDailyAsistenciaReport(opts: {
  fecha?: string;
  tipo: "scheduled" | "manual";
  corte?: 1 | 2;
  overrideRecipients?: string[];
  sentByAuthId?: string | null;
}): Promise<{
  ok: boolean;
  status: "sent" | "skipped" | "skipped_holiday" | "not_configured" | "failed";
  message: string;
  snapshot?: AsistenciaSnapshot;
}> {
  const supabase = createServiceRoleClient();
  const fecha = opts.fecha || getCaracasDateString();
  const config = await getAsistenciaConfig(supabase);
  const corte: 1 | 2 = opts.corte === 2 ? 2 : 1;

  if (opts.tipo === "scheduled") {
    const isCorteActive = corte === 2 ? config.activo_corte_2 : config.activo;
    if (!isCorteActive) {
      return {
        ok: false,
        status: "skipped",
        message: `El envío automático para el corte ${corte} está desactivado.`,
      };
    }

    if (!isWeekdayCaracas(fecha)) {
      return {
        ok: false,
        status: "skipped",
        message: "Fin de semana: no se envía reporte programado.",
      };
    }

    // Check if already sent or in progress today for this specific corte
    const { data: existingLog } = await supabase
      .from("asistencia_reportes_log")
      .select("id, status")
      .eq("fecha", fecha)
      .eq("tipo", "scheduled")
      .eq("corte", corte)
      .in("status", ["sending", "sent", "skipped_holiday"])
      .maybeSingle();

    if (existingLog) {
      return {
        ok: true,
        status: "skipped",
        message: `El reporte programado (corte ${corte}) para ${fecha} ya fue procesado (${existingLog.status}).`,
      };
    }
  }

  const snapshot = await buildAsistenciaSnapshot(fecha, supabase, corte);

  if (
    opts.tipo === "scheduled" &&
    config.omitir_feriados &&
    snapshot.es_feriado
  ) {
    await supabase.from("asistencia_reportes_log").insert({
      fecha,
      tipo: "scheduled",
      corte,
      total_esperados: snapshot.total_esperados,
      total_presentes: snapshot.total_presentes,
      total_tardios: snapshot.total_tardios,
      total_ausentes: snapshot.total_ausentes,
      destinatarios: "",
      status: "skipped_holiday",
      error_message: `Feriado nacional: ${snapshot.nombre_feriado || fecha}`,
    });
    return {
      ok: true,
      status: "skipped_holiday",
      message: `Omitido por feriado: ${snapshot.nombre_feriado || fecha}`,
      snapshot,
    };
  }

  // Resolve recipients
  let recipients: string[] = [];
  if (opts.overrideRecipients && opts.overrideRecipients.length > 0) {
    recipients = opts.overrideRecipients
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
  } else {
    const dbRecipients = await listAsistenciaDestinatarios(supabase);
    recipients = dbRecipients
      .filter((r) => r.activo && r.email.includes("@"))
      .map((r) => r.email.trim().toLowerCase());

    if (recipients.length === 0) {
      const fallback = ted_request_to();
      if (fallback) recipients = [fallback];
    }
  }

  recipients = Array.from(new Set(recipients));

  if (recipients.length === 0) {
    return {
      ok: false,
      status: "not_configured",
      message:
        "No hay destinatarios de correo configurados para el reporte de asistencia.",
      snapshot,
    };
  }

  // Claim scheduled lock in DB before sending SMTP
  let logId: number | null = null;
  const { data: insertedLog, error: lockError } = await supabase
    .from("asistencia_reportes_log")
    .insert({
      fecha,
      tipo: opts.tipo,
      corte,
      total_esperados: snapshot.total_esperados,
      total_presentes: snapshot.total_presentes,
      total_tardios: snapshot.total_tardios,
      total_ausentes: snapshot.total_ausentes,
      destinatarios: recipients.join(", "),
      status: "sending",
      sent_by: opts.sentByAuthId ?? null,
    })
    .select("id")
    .maybeSingle();

  if (lockError) {
    if (opts.tipo === "scheduled") {
      return {
        ok: true,
        status: "skipped",
        message: `El reporte programado (corte ${corte}) ya está siendo enviado por otra instancia.`,
      };
    }
  } else if (insertedLog?.id) {
    logId = Number(insertedLog.id);
  }

  const emailContent = buildAsistenciaReportEmail(snapshot);
  const toList = recipients.join(", ");
  const sendRes = await send_mail({
    to: toList,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  if (sendRes.status === "sent") {
    if (logId) {
      await supabase
        .from("asistencia_reportes_log")
        .update({ status: "sent", error_message: null })
        .eq("id", logId);
    }
    return {
      ok: true,
      status: "sent",
      message: `Reporte enviado a ${toList}`,
      snapshot,
    };
  }

  const errMsg =
    sendRes.status === "not_configured"
      ? "SMTP MXroute no configurado en variables de entorno."
      : sendRes.error;

  if (logId) {
    await supabase
      .from("asistencia_reportes_log")
      .update({
        status: sendRes.status === "not_configured" ? "not_configured" : "failed",
        error_message: errMsg,
      })
      .eq("id", logId);
  }

  return {
    ok: false,
    status: sendRes.status === "not_configured" ? "not_configured" : "failed",
    message: errMsg,
    snapshot,
  };
}

/**
 * Evaluates whether any scheduled daily report should be dispatched right now.
 * Supports Corte 1 (morning, default 08:30 AM) and Corte 2 (afternoon, default 14:00:00 / 02:00 PM).
 * Called every 60 seconds by the in-process scheduler in instrumentation.ts.
 */
export async function checkAndRunScheduledAsistenciaReport(
  now: Date = new Date(),
): Promise<void> {
  try {
    if (!isWeekdayCaracas(now)) return;

    const supabase = createServiceRoleClient();
    const config = await getAsistenciaConfig(supabase);
    const currentCaracasTime = getCaracasTimeString(now);
    const todayCaracas = getCaracasDateString(now);

    // 1. Primer Corte (Mañana - default 08:30 AM)
    if (config.activo) {
      const cutoff1 = normalizeCutoffTime(config.hora_corte);
      // Window: at or after cutoff1 and before 12:00:00 (midday)
      if (currentCaracasTime >= cutoff1 && currentCaracasTime <= "12:00:00") {
        await sendDailyAsistenciaReport({
          fecha: todayCaracas,
          tipo: "scheduled",
          corte: 1,
        });
      }
    }

    // 2. Segundo Corte (Tarde - default 14:00:00 / 02:00 PM)
    if (config.activo_corte_2) {
      const cutoff2 = normalizeCutoffTime(config.hora_corte_2);
      // Window: at or after cutoff2 and before 18:00:00 (end of workday)
      if (currentCaracasTime >= cutoff2 && currentCaracasTime <= "18:00:00") {
        await sendDailyAsistenciaReport({
          fecha: todayCaracas,
          tipo: "scheduled",
          corte: 2,
        });
      }
    }
  } catch (err) {
    console.warn("[asistencia-scheduler] Error en verificación programada:", err);
  }
}
