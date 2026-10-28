import { createAdminClient } from "@/lib/supabase/server";
import {
  DEFAULT_CUTOFF_TIME,
  DEFAULT_SECOND_CUTOFF_TIME,
  formatCaracasTime12h,
  getCaracasDateString,
  getCaracasTimeString,
  getCorteForCaracasTime,
  isAfterMorningReset,
  isOnOrBeforeCutoff,
  normalizeCutoffTime,
} from "./time";

export type AttendanceBadgeStatus = {
  fecha: string;
  corte: 1 | 2;
  hora_registro: string;
  hora_formateada: string;
  a_tiempo: boolean;
  hora_corte_formateada: string;
};

export const EARLIEST_SCRIPT_ARRIVAL_TIME = "07:00:00";

/**
 * Records the user's attendance for today and the current operational shift (corte 1 or 2)
 * in America/Caracas if not already recorded.
 * Preserves the earliest check-in time of the respective shift (idempotent via unique constraint).
 * Logins before 08:00 AM (e.g., 3:00 AM) are NOT automatically recorded as office attendance,
 * unless bypassMorningReset is true (e.g., physical workstation arrival via script from 07:00 AM onwards).
 */
export async function recordDailyAttendanceForUsuario(
  usuarioId: number,
  metodo: "login" | "sesion" | "manual" = "login",
  now: Date = new Date(),
  targetCorte?: 1 | 2,
  bypassMorningReset: boolean = false,
): Promise<{
  recorded: boolean;
  fecha: string;
  corte: 1 | 2;
  hora_registro: string | null;
}> {
  const fecha = getCaracasDateString(now);
  const corte: 1 | 2 = targetCorte ?? getCorteForCaracasTime(now);

  // Do not auto-record office attendance for pre-8:00 AM logins (e.g. 3:00 AM) in morning shift,
  // unless bypassMorningReset is granted (e.g. workstation script check-in from 07:00 AM onwards).
  if (metodo !== "manual" && corte === 1) {
    if (bypassMorningReset) {
      if (getCaracasTimeString(now) < EARLIEST_SCRIPT_ARRIVAL_TIME) {
        return {
          recorded: false,
          fecha,
          corte: 1,
          hora_registro: null,
        };
      }
    } else if (!isAfterMorningReset(now)) {
      return {
        recorded: false,
        fecha,
        corte: 1,
        hora_registro: null,
      };
    }
  }

  try {
    const admin = await createAdminClient();

    // Check existing first so we return the original first-login timestamp for this corte
    const { data: existing } = await admin
      .from("asistencia_diaria")
      .select("hora_registro")
      .eq("usuario_id", usuarioId)
      .eq("fecha", fecha)
      .eq("corte", corte)
      .maybeSingle();

    if (existing?.hora_registro) {
      return {
        recorded: false,
        fecha,
        corte,
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
          corte,
          hora_registro: isoNow,
          metodo,
        },
        { onConflict: "usuario_id,fecha,corte", ignoreDuplicates: true },
      )
      .select("hora_registro")
      .maybeSingle();

    if (error) {
      // Gracefully handle if migration hasn't been applied yet
      console.warn("[asistencia] No se pudo registrar asistencia diaria:", error.message);
      return { recorded: false, fecha, corte, hora_registro: isoNow };
    }

    if (inserted?.hora_registro) {
      return {
        recorded: true,
        fecha,
        corte,
        hora_registro: String(inserted.hora_registro),
      };
    }

    // In case ignoreDuplicates returned null, fetch the existing row
    const { data: refetched } = await admin
      .from("asistencia_diaria")
      .select("hora_registro")
      .eq("usuario_id", usuarioId)
      .eq("fecha", fecha)
      .eq("corte", corte)
      .maybeSingle();

    return {
      recorded: false,
      fecha,
      corte,
      hora_registro: refetched?.hora_registro ? String(refetched.hora_registro) : isoNow,
    };
  } catch (err) {
    console.warn("[asistencia] Error inesperado al registrar asistencia:", err);
    return { recorded: false, fecha, corte, hora_registro: now.toISOString() };
  }
}

/**
 * Ensures today's attendance row exists for the active user and returns badge display info
 * for the current operational shift (corte 1 or corte 2).
 */
export async function ensureAndGetTodayAttendanceBadge(
  usuarioId: number,
): Promise<AttendanceBadgeStatus | null> {
  try {
    const now = new Date();
    const corte = getCorteForCaracasTime(now);
    const fecha = getCaracasDateString(now);
    const admin = await createAdminClient();

    const { data: existing } = await admin
      .from("asistencia_diaria")
      .select("hora_registro")
      .eq("usuario_id", usuarioId)
      .eq("fecha", fecha)
      .eq("corte", corte)
      .maybeSingle();

    if (!existing?.hora_registro) {
      return null;
    }
    const hora_registro = String(existing.hora_registro);

    let cutoff = corte === 2 ? DEFAULT_SECOND_CUTOFF_TIME : DEFAULT_CUTOFF_TIME;
    try {
      const { data: cfg } = await admin
        .from("asistencia_config")
        .select("hora_corte, hora_corte_2")
        .eq("id", 1)
        .maybeSingle();
      if (corte === 2 && cfg?.hora_corte_2) {
        cutoff = normalizeCutoffTime(String(cfg.hora_corte_2));
      } else if (corte === 1 && cfg?.hora_corte) {
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
      fecha,
      corte,
      hora_registro,
      hora_formateada: formatCaracasTime12h(hora_registro),
      a_tiempo,
      hora_corte_formateada,
    };
  } catch {
    return null;
  }
}
