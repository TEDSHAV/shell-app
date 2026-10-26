"use server";

import { revalidatePath } from "next/cache";
import { isTedMember } from "@/actions/ted";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  buildAsistenciaSnapshot,
  getAsistenciaConfig,
  listAsistenciaDestinatarios,
  listAsistenciaReportLogs,
  sendDailyAsistenciaReport,
  type AsistenciaConfigRow,
  type AsistenciaDestinatario,
  type AsistenciaReporteLogRow,
} from "@/lib/asistencia/report-service";
import type { AsistenciaSnapshot } from "@/lib/asistencia/email-template";
import {
  getCaracasDateString,
  normalizeCutoffTime,
} from "@/lib/asistencia/time";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function assertTedAccess(): Promise<{ authId: string | null }> {
  const allowed = await isTedMember();
  if (!allowed) {
    throw new Error("No tienes permisos para acceder al control de asistencia.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { authId: user?.id ?? null };
}

export async function getAsistenciaDashboardData(fecha?: string): Promise<{
  snapshot: AsistenciaSnapshot;
  snapshotCorte2: AsistenciaSnapshot;
  config: AsistenciaConfigRow;
  destinatarios: AsistenciaDestinatario[];
  logs: AsistenciaReporteLogRow[];
  allUsers: Array<{
    id: number;
    nombre_apellido: string;
    email_corporativo: string | null;
    departamento_id: number | null;
    departamento_nombre: string;
  }>;
  allDepartments: Array<{ id: number; nombre: string }>;
}> {
  await assertTedAccess();
  const admin = await createAdminClient();
  const targetDate = fecha?.trim() || getCaracasDateString();

  const [snapshot, snapshotCorte2, config, destinatarios, logs, usuariosRes, deptsRes] =
    await Promise.all([
      buildAsistenciaSnapshot(targetDate, admin, 1),
      buildAsistenciaSnapshot(targetDate, admin, 2),
      getAsistenciaConfig(admin),
      listAsistenciaDestinatarios(admin),
      listAsistenciaReportLogs(25, admin),
      admin
        .from("usuarios")
        .select(
          "id, nombre_apellido, email_corporativo, departamento, esta_activo, id_auth",
        )
        .not("id_auth", "is", null)
        .or("esta_activo.is.null,esta_activo.eq.true")
        .order("nombre_apellido", { ascending: true }),
      admin
        .from("departamentos")
        .select("id, nombre")
        .order("nombre", { ascending: true }),
    ]);

  const allDepartments = ((deptsRes.data ?? []) as Array<Record<string, unknown>>)
    .map((d) => ({
      id: Number(d.id ?? 0),
      nombre: String(d.nombre ?? "").trim(),
    }))
    .filter((d) => d.id > 0 && d.nombre);

  const deptMap = new Map(allDepartments.map((d) => [d.id, d.nombre]));

  const allUsers = ((usuariosRes.data ?? []) as Array<Record<string, unknown>>)
    .map((u) => {
      const id = Number(u.id ?? 0);
      const deptId = Number(u.departamento ?? 0);
      return {
        id,
        nombre_apellido: String(u.nombre_apellido ?? "").trim(),
        email_corporativo: String(u.email_corporativo ?? "").trim() || null,
        departamento_id: deptId > 0 ? deptId : null,
        departamento_nombre:
          (deptId > 0 ? deptMap.get(deptId) : null) || "Sin departamento",
      };
    })
    .filter((u) => u.id > 0 && u.nombre_apellido);

  return {
    snapshot,
    snapshotCorte2,
    config,
    destinatarios,
    logs,
    allUsers,
    allDepartments,
  };
}

export async function updateAsistenciaConfigAction(input: {
  activo: boolean;
  hora_corte: string;
  activo_corte_2: boolean;
  hora_corte_2: string;
  hora_reset_mediodia?: string;
  omitir_feriados: boolean;
  usuarios_excluidos: number[];
  departamentos_excluidos: number[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { authId } = await assertTedAccess();
    const admin = await createAdminClient();
    const hora_corte = normalizeCutoffTime(input.hora_corte);
    const hora_corte_2 = normalizeCutoffTime(input.hora_corte_2);
    const hora_reset_mediodia = normalizeCutoffTime(input.hora_reset_mediodia || "12:30:00");

    const { error } = await admin.from("asistencia_config").upsert(
      {
        id: 1,
        activo: Boolean(input.activo),
        hora_corte,
        activo_corte_2: Boolean(input.activo_corte_2),
        hora_corte_2,
        hora_reset_mediodia,
        timezone: "America/Caracas",
        omitir_feriados: Boolean(input.omitir_feriados),
        usuarios_excluidos: (input.usuarios_excluidos ?? []).filter(
          (id) => Number.isInteger(id) && id > 0,
        ),
        departamentos_excluidos: (input.departamentos_excluidos ?? []).filter(
          (id) => Number.isInteger(id) && id > 0,
        ),
        updated_at: new Date().toISOString(),
        updated_by: authId,
      },
      { onConflict: "id" },
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/ted/asistencia");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}

export async function addAsistenciaDestinatarioAction(input: {
  email: string;
  nombre?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertTedAccess();
    const email = (input.email || "").trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return { ok: false, error: "Correo electrónico inválido." };
    }

    const admin = await createAdminClient();
    const { error } = await admin.from("asistencia_destinatarios").insert({
      email,
      nombre: input.nombre?.trim() || null,
      activo: true,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Ese correo ya está en la lista." };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath("/ted/asistencia");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}

export async function removeAsistenciaDestinatarioAction(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertTedAccess();
    const admin = await createAdminClient();
    const { error } = await admin
      .from("asistencia_destinatarios")
      .delete()
      .eq("id", id);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/ted/asistencia");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}

export async function sendManualAsistenciaReportAction(input: {
  fecha: string;
  corte?: 1 | 2;
  testEmail?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const { authId } = await assertTedAccess();
    const override = input.testEmail?.trim()
      ? [input.testEmail.trim().toLowerCase()]
      : undefined;

    if (override && !EMAIL_REGEX.test(override[0])) {
      return { ok: false, message: "El correo de prueba no es válido." };
    }

    const res = await sendDailyAsistenciaReport({
      fecha: input.fecha || getCaracasDateString(),
      tipo: "manual",
      corte: input.corte === 2 ? 2 : 1,
      overrideRecipients: override,
      sentByAuthId: authId,
    });

    revalidatePath("/ted/asistencia");
    return { ok: res.ok, message: res.message };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Error inesperado al enviar.",
    };
  }
}

export async function markManualAttendanceAction(input: {
  usuario_id: number;
  fecha: string;
  corte?: 1 | 2;
  presente: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertTedAccess();
    const admin = await createAdminClient();
    const corte: 1 | 2 = input.corte === 2 ? 2 : 1;

    if (input.presente) {
      // Set hora_registro at 08:00:00 (12:00:00 UTC) for corte 1, or 13:00:00 (17:00:00 UTC) for corte 2
      const defaultOnTimeIso =
        corte === 2
          ? `${input.fecha}T17:00:00.000Z`
          : `${input.fecha}T12:00:00.000Z`;
      const { error } = await admin.from("asistencia_diaria").upsert(
        {
          usuario_id: input.usuario_id,
          fecha: input.fecha,
          corte,
          hora_registro: defaultOnTimeIso,
          metodo: "manual",
        },
        { onConflict: "usuario_id,fecha,corte" },
      );
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await admin
        .from("asistencia_diaria")
        .delete()
        .eq("usuario_id", input.usuario_id)
        .eq("fecha", input.fecha)
        .eq("corte", corte);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/ted/asistencia");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}
