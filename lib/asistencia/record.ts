import { createAdminClient } from "@/lib/supabase/server";
import {
  DEFAULT_CUTOFF_TIME,
  formatCaracasTime12h,
  getCaracasDateString,
  isAfterMorningReset,
  isOnOrBeforeCutoff,
  normalizeCutoffTime,
} from "./time";

export type AttendanceBadgeStatus = {
  fecha: string;
  hora_registro: string;
  hora_formateada: string;
  a_tiempo: boolean;
  hora_corte_formateada: string;
};

/**
 * Records the user's attendance for today in America/Caracas if not already recorded.
 * Preserves the earliest check-in time of the day (idempotent via unique constraint).
 * Logins before 06:00 AM (e.g., 3:00 AM) are NOT automatically recorded as office attendance.
 */
export async function recordDailyAttendanceForUsuario(
  usuarioId: number,
  metodo: "login" | "sesion" | "manual" = "login",
  now: Date = new Date(),
): Promise<{
  recorded: boolean;
  fecha: string;
  hora_registro: string | null;
}> {
  const fecha = getCaracasDateString(now);

  // Do not auto-record office attendance for pre-8:00 AM logins (e.g. 3:00 AM).
  if (metodo !== "manual" && !isAfterMorningReset(now)) {
    return {
      recorded: false,
      fecha,
      hora_registro: null,
    };
  }

  try {
    const admin = await createAdminClient();

    // Check existing first so we return the original first-login timestamp
    const { data: existing } = await admin
      .from("asistencia_diaria")
      .select("hora_registro")
      .eq("usuario_id", usuarioId)
      .eq("fecha", fecha)
      .maybeSingle();

    if (existing?.hora_registro) {
      return {
        recorded: false,
        fecha,
        hora_registro: String(existing.hora_registro),
      };
    }

    const isoNow = now.toISOString();
    const { data: inserted, error } = await admin
      .from("asistencia_diaria")
      .upsert(
        {
          usuario_id: usuarioId,
          fecha,
          hora_registro: isoNow,
          metodo,
        },
        { onConflict: "usuario_id,fecha", ignoreDuplicates: true },
      )
      .select("hora_registro")
      .maybeSingle();

    if (error) {
      // Gracefully handle if migration hasn't been applied yet
      console.warn("[asistencia] No se pudo registrar asistencia diaria:", error.message);
      return { recorded: false, fecha, hora_registro: isoNow };
    }

    if (inserted?.hora_registro) {
      return {
        recorded: true,
        fecha,
        hora_registro: String(inserted.hora_registro),
      };
    }

    // In case ignoreDuplicates returned null, fetch the existing row
    const { data: refetched } = await admin
      .from("asistencia_diaria")
      .select("hora_registro")
      .eq("usuario_id", usuarioId)
      .eq("fecha", fecha)
      .maybeSingle();

    return {
      recorded: false,
      fecha,
      hora_registro: refetched?.hora_registro ? String(refetched.hora_registro) : isoNow,
    };
  } catch (err) {
    console.warn("[asistencia] Error inesperado al registrar asistencia:", err);
    return { recorded: false, fecha, hora_registro: now.toISOString() };
  }
}

/**
 * Ensures today's attendance row exists for the active user and returns badge display info.
 */
export async function ensureAndGetTodayAttendanceBadge(
  usuarioId: number,
): Promise<AttendanceBadgeStatus | null> {
  try {
    const now = new Date();
    const result = await recordDailyAttendanceForUsuario(usuarioId, "sesion", now);
    if (!result.hora_registro) {
      return null;
    }
    const hora_registro = result.hora_registro;

    let cutoff = DEFAULT_CUTOFF_TIME;
    try {
      const admin = await createAdminClient();
      const { data: cfg } = await admin
        .from("asistencia_config")
        .select("hora_corte")
        .eq("id", 1)
        .maybeSingle();
      if (cfg?.hora_corte) {
        cutoff = normalizeCutoffTime(String(cfg.hora_corte));
      }
    } catch {
      // Fallback to default cutoff
    }

    const a_tiempo = isOnOrBeforeCutoff(hora_registro, cutoff);
    const [hStr, mStr] = cutoff.split(":");
    const h24 = parseInt(hStr, 10);
    const suffix = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const hora_corte_formateada = `${String(h12).padStart(2, "0")}:${mStr} ${suffix}`;

    return {
      fecha: result.fecha,
      hora_registro,
      hora_formateada: formatCaracasTime12h(hora_registro),
      a_tiempo,
      hora_corte_formateada,
    };
  } catch {
    return null;
  }
}
