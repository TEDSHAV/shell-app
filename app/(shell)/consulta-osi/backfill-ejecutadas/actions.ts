"use server";

import { createAdminClient } from "@/lib/supabase/server";

// ─── Dev-only guard ───────────────────────────────────────────────────────────
// This route is a temporary administrative tool. Server actions are
// independently addressable endpoints, so gating the page alone is not
// enough — every action re-checks NODE_ENV.
function assertDevOnly(): { error: string } | null {
  if (process.env.NODE_ENV === "production") {
    return { error: "Herramienta no disponible en producción" };
  }
  return null;
}

// ─── Status IDs (conf_estatus) ────────────────────────────────────────────────
const EJECUTADO_ID = 12;

// ─── Step keys (mirrors capacitacion app's lib/proceso-steps.ts) ────────────────
const PLANIFICACION_STEP_KEYS = ["requisicion_enviada_admin", "material_enviado_facilitador"];
const EJECUCION_STEP_KEYS = [
  "en_proceso",
  "lista_asistencia",
  "calificacion",
  "material_fotografico",
  "encuestas_satisfaccion_tabulacion",
  "elaboracion_certificados",
  "material_recibido_fisico",
  "certificados_impresos",
  "sobre_espera_autorizacion",
  "sobre_enviado_zoom",
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BackfillCandidate {
  nroOsi: number;
  osiId: number;
  empresa: string | null;
  servicio: string | null;
  fechaPlanificada: string | null;
  sesionesTotal: number;
  sesionesEjecutadas: number;
  diasAntiguedad: number;
  estatus: string;
  hasSessionData: boolean;
}

export interface BackfillReport {
  processed: { nroOsi: number; osiId: number; sesiones: number }[];
  noSessions: { nroOsi: number; osiId: number; fechaInicioReal: string | null }[];
  notFound: number[];
  errors: { nroOsi: number; osiId: number | null; error: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Supabase caps un-ranged selects at 1000 rows; the OSI view exceeds that.
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const IN_CHUNK_SIZE = 300;

type PagedResult<T> = { data: T[] | null; error: { message: string; code?: string } | null };

async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<PagedResult<T>>,
  label: string,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[backfill] Error fetching ${label} page ${page}:`, error);
      break;
    }
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

async function fetchChunkedIn<T>(
  ids: number[],
  build: (chunk: number[], from: number, to: number) => PromiseLike<PagedResult<T>>,
  label: string,
): Promise<T[]> {
  const all: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + IN_CHUNK_SIZE);
    const rows = await fetchAllPages<T>((from, to) => build(chunk, from, to), label);
    all.push(...rows);
  }
  return all;
}

function is_missing_column_error(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  return (
    msg.includes("fecha_ejecutada") ||
    msg.includes("hora_ejecutada") ||
    msg.includes("ejecutada_en_fecha_planificada") ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

type SesionRow = {
  id: number;
  nro_sesion: number;
  fecha: string | null;
  hora_inicio: string | null;
};

type OsiViewRow = {
  id_osi: number;
  nro_osi: string | null;
  nombre_empresa: string | null;
  servicio: string | null;
  fecha_inicio_real: string | null;
  id_estatus: number | null;
};

const ESTATUS_LABELS: Record<number, string> = {
  10: "Pendiente",
  11: "En proceso",
  12: "Ejecutado",
  39: "No ejecutada",
};

/** Parse a date-only or timestamp string into a Date (NaN if unusable). */
function parseDate(s: string | null | undefined): Date {
  if (!s) return new Date(NaN);
  // Date-only strings "YYYY-MM-DD" are parsed as UTC midnight by `new Date`,
  // which is fine for day-level comparisons.
  return new Date(s);
}

function dayDiff(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Materialize osi_sesion rows from ejecucion_osi.sesiones_programadas if the
 * table has no rows yet. Mirrors the shell's ensure_osi_sesiones_from_programadas.
 */
async function ensureSesionesFromProgramadas(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  osiId: number,
): Promise<void> {
  const { data: osiRow } = await admin
    .from("ejecucion_osi")
    .select("sesiones_programadas")
    .eq("id", osiId)
    .maybeSingle();

  const programmed = Array.isArray(osiRow?.sesiones_programadas)
    ? (osiRow!.sesiones_programadas as Array<Record<string, unknown>>)
    : [];
  if (programmed.length === 0) return;

  const rows = programmed
    .map((item, index) => {
      const fecha = typeof item.fecha === "string" ? item.fecha.trim() : "";
      if (!fecha) return null;
      return {
        id_osi: osiId,
        nro_sesion: index + 1,
        fecha,
        hora_inicio: typeof item.hora_inicio === "string" ? item.hora_inicio : null,
        hora_fin: typeof item.hora_fin === "string" ? item.hora_fin : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) return;

  const { error } = await admin.from("osi_sesion").upsert(rows, {
    onConflict: "id_osi,nro_sesion",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error("[backfill] Error materializing sesiones from programadas:", error);
  }
}

/**
 * Fetch the osi_sesion rows for an OSI. Falls back to the base select if the
 * execution columns aren't present yet.
 */
async function fetchSesiones(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  osiId: number,
): Promise<SesionRow[]> {
  const withExec = await admin
    .from("osi_sesion")
    .select("id, nro_sesion, fecha, hora_inicio, fecha_ejecutada")
    .eq("id_osi", osiId)
    .order("nro_sesion", { ascending: true });

  if (!withExec.error) {
    return (withExec.data ?? []) as unknown as SesionRow[];
  }
  if (!is_missing_column_error(withExec.error)) {
    console.error("[backfill] Error fetching sesiones:", withExec.error);
    return [];
  }
  const base = await admin
    .from("osi_sesion")
    .select("id, nro_sesion, fecha, hora_inicio")
    .eq("id_osi", osiId)
    .order("nro_sesion", { ascending: true });
  if (base.error) {
    console.error("[backfill] Error fetching sesiones (base):", base.error);
    return [];
  }
  return (base.data ?? []) as unknown as SesionRow[];
}

/**
 * Mark all sessions of an OSI as executed (fecha_ejecutada = fecha_planificada),
 * insert status history, update the OSI-level status, and seed/mark the
 * capacitacion_proceso_steps en_proceso step.
 */
async function markOsiEjecutada(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  osiId: number,
  sesiones: SesionRow[],
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Update each osi_sesion row: fecha_ejecutada = fecha, hora_ejecutada = hora_inicio
  for (const s of sesiones) {
    const fechaEjecutada = s.fecha ? s.fecha.split("T")[0] : null;
    const { error: sesionError } = await admin
      .from("osi_sesion")
      .update({
        fecha_ejecutada: fechaEjecutada,
        hora_ejecutada: s.hora_inicio ?? null,
        ejecutada_en_fecha_planificada: true,
      })
      .eq("id", s.id);

    if (sesionError && !is_missing_column_error(sesionError)) {
      throw new Error(`osi_sesion update failed (sesion ${s.id}): ${sesionError.message}`);
    }
  }

  // 2. Insert historial_cambios_estado for each session (EJECUTADO = 12)
  const historyRows = sesiones.map((s) => ({
    tabla_afectada: "osi_sesion",
    id_registro: s.id,
    id_estatus_anterior: null, // best-effort; legacy OSIs may have no prior history
    id_estatus_nuevo: EJECUTADO_ID,
    fecha_cambio: now,
    id_usuario_cambio: null,
  }));
  if (historyRows.length > 0) {
    const { error: historyError } = await admin
      .from("historial_cambios_estado")
      .insert(historyRows);
    if (historyError) {
      console.error("[backfill] Error inserting historial_cambios_estado:", historyError);
      // non-fatal — fecha_ejecutada is what the indicadores actually read
    }
  }

  // 3. Update ejecucion_osi.id_estatus = 12 (EJECUTADO)
  const { error: osiStatusError } = await admin
    .from("ejecucion_osi")
    .update({ id_estatus: EJECUTADO_ID, status_changed_at: now })
    .eq("id", osiId);
  if (osiStatusError) {
    console.error("[backfill] Error updating ejecucion_osi.id_estatus:", osiStatusError);
  }

  // 4. Seed + mark capacitacion_proceso_steps en_proceso as completed
  await seedAndMarkCapacitacionSteps(admin, osiId, sesiones);
}

/**
 * Seed all capacitacion_proceso_steps rows (both phases) for each session and
 * mark the en_proceso step as completed. Idempotent: seeding uses
 * ignoreDuplicates, the en_proceso mark uses a plain upsert so it overwrites.
 */
async function seedAndMarkCapacitacionSteps(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  osiId: number,
  sesiones: SesionRow[],
): Promise<void> {
  const now = new Date().toISOString();

  const seedRows: {
    osi_id: number;
    nro_sesion: number;
    phase: string;
    step_key: string;
    completed: boolean;
  }[] = [];
  for (const s of sesiones) {
    for (const key of PLANIFICACION_STEP_KEYS) {
      seedRows.push({
        osi_id: osiId,
        nro_sesion: s.nro_sesion,
        phase: "planificacion",
        step_key: key,
        completed: false,
      });
    }
    for (const key of EJECUCION_STEP_KEYS) {
      seedRows.push({
        osi_id: osiId,
        nro_sesion: s.nro_sesion,
        phase: "ejecucion",
        step_key: key,
        completed: false,
      });
    }
  }
  if (seedRows.length > 0) {
    const { error: seedError } = await admin
      .from("capacitacion_proceso_steps")
      .upsert(seedRows, {
        onConflict: "osi_id,nro_sesion,phase,step_key",
        ignoreDuplicates: true,
      });
    if (seedError) {
      console.error("[backfill] Error seeding capacitacion_proceso_steps:", seedError);
    }
  }

  const markRows = sesiones.map((s) => ({
    osi_id: osiId,
    nro_sesion: s.nro_sesion,
    phase: "ejecucion",
    step_key: "en_proceso",
    completed: true,
    completed_at: now,
  }));
  if (markRows.length > 0) {
    const { error: markError } = await admin
      .from("capacitacion_proceso_steps")
      .upsert(markRows, { onConflict: "osi_id,nro_sesion,phase,step_key" });
    if (markError) {
      console.error("[backfill] Error marking en_proceso step:", markError);
    }
  }
}

// ─── Search action ────────────────────────────────────────────────────────────

/**
 * Find capacitacion OSIs that are (a) not fully executed and (b) older than
 * `daysOld` days, where "older" means the latest planned session date (or
 * fecha_inicio_real when there are no sessions) is at least `daysOld` days
 * before today. Returns candidates oldest-first.
 */
export async function findBackfillCandidates(
  daysOld: number,
): Promise<{ data: BackfillCandidate[] | null; error: string | null }> {
  const guard = assertDevOnly();
  if (guard) return { data: null, error: guard.error };

  if (!Number.isFinite(daysOld) || daysOld <= 0) {
    return { data: null, error: "La antigüedad debe ser un número de días mayor a 0" };
  }
  // Cap to a sane upper bound so a typo doesn't scan the whole history.
  if (daysOld > 3650) {
    return { data: null, error: "La antigüedad máxima es 3650 días (10 años)" };
  }

  try {
    const admin = await createAdminClient();
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 1. Fetch all capacitacion OSIs (paged — the view exceeds 1000 rows).
    const osis = await fetchAllPages<OsiViewRow>((from, to) => {
      let q = admin
        .from("v_osi_formato_completo")
        .select(
          "id_osi, nro_osi, nombre_empresa, servicio, fecha_inicio_real, id_estatus",
        )
        .ilike("tipo_servicio", "%capacitacion%")
        .not("nro_osi", "ilike", "%PEN-%");
      return q.order("id_osi", { ascending: true }).range(from, to);
    }, "v_osi_formato_completo");

    const osiIds = osis.map((o) => o.id_osi);

    // 2. Fetch all osi_sesion rows (chunked .in()).
    const sesiones = await fetchChunkedIn<{
      id_osi: number;
      fecha: string | null;
      fecha_ejecutada: string | null;
    }>(
      osiIds,
      (chunk, from, to) =>
        admin
          .from("osi_sesion")
          .select("id_osi, fecha, fecha_ejecutada")
          .in("id_osi", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      "osi_sesion",
    );

    // 3. Aggregate per OSI: min/max fecha, total, ejecutadas.
    const aggByOsi = new Map<
      number,
      { maxFecha: string | null; total: number; ejecutadas: number }
    >();
    for (const s of sesiones) {
      let agg = aggByOsi.get(s.id_osi);
      if (!agg) {
        agg = { maxFecha: null, total: 0, ejecutadas: 0 };
        aggByOsi.set(s.id_osi, agg);
      }
      agg.total += 1;
      if (s.fecha) {
        if (!agg.maxFecha || s.fecha > agg.maxFecha) agg.maxFecha = s.fecha;
      }
      if (s.fecha_ejecutada) agg.ejecutadas += 1;
    }

    // 4. Build candidate list.
    const candidates: BackfillCandidate[] = [];
    for (const o of osis) {
      const agg = aggByOsi.get(o.id_osi);
      const total = agg?.total ?? 0;
      const ejecutadas = agg?.ejecutadas ?? 0;

      // Skip OSIs already fully executed.
      if (total > 0 && ejecutadas >= total) continue;

      // Reference date: latest planned session, else fecha_inicio_real.
      const refDateStr = agg?.maxFecha ?? o.fecha_inicio_real;
      if (!refDateStr) continue;

      const refDate = parseDate(refDateStr);
      if (isNaN(refDate.getTime())) continue;

      const dias = dayDiff(todayMidnight, refDate);
      if (dias < daysOld) continue;

      const nroOsi = parseInt(String(o.nro_osi ?? ""), 10);
      if (!Number.isFinite(nroOsi)) continue;

      candidates.push({
        nroOsi,
        osiId: o.id_osi,
        empresa: o.nombre_empresa?.trim() || null,
        servicio: o.servicio?.trim() || null,
        fechaPlanificada: refDateStr.split("T")[0],
        sesionesTotal: total,
        sesionesEjecutadas: ejecutadas,
        diasAntiguedad: dias,
        estatus:
          o.id_estatus != null
            ? ESTATUS_LABELS[o.id_estatus] ?? String(o.id_estatus)
            : "—",
        hasSessionData: total > 0,
      });
    }

    // Oldest first.
    candidates.sort((a, b) => b.diasAntiguedad - a.diasAntiguedad);

    return { data: candidates, error: null };
  } catch (err) {
    console.error("[backfill] findBackfillCandidates error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}

// ─── Main backfill action ────────────────────────────────────────────────────

/**
 * Mark the given OSIs (by internal ejecucion_osi.id) as Ejecutadas with
 * fecha_ejecutada = fecha_planificada, so they stop appearing as pending /
 * dragged-from-previous-months in the capacitacion app's indicadores.
 *
 * Takes the explicit ids the user just reviewed in the candidate list, so
 * the action operates on exactly that set (no re-query drift).
 *
 * Idempotent — safe to re-run (upserts + ignoreDuplicates).
 */
export async function backfillEjecutadas(
  osiIds: number[],
): Promise<BackfillReport> {
  const report: BackfillReport = {
    processed: [],
    noSessions: [],
    notFound: [],
    errors: [],
  };

  const guard = assertDevOnly();
  if (guard) {
    report.errors.push({ nroOsi: 0, osiId: null, error: guard.error });
    return report;
  }

  if (!Array.isArray(osiIds) || osiIds.length === 0) {
    report.errors.push({ nroOsi: 0, osiId: null, error: "Lista de OSIs vacía" });
    return report;
  }
  // Defensive cap — this is an admin tool, but don't let a runaway request
  // mark thousands of OSIs in one shot.
  if (osiIds.length > 500) {
    report.errors.push({
      nroOsi: 0,
      osiId: null,
      error: "Máximo 500 OSIs por ejecución",
    });
    return report;
  }

  try {
    const admin = await createAdminClient();

    // Resolve internal ids → nro_osi + fecha_inicio_real for the report.
    const { data: osiRows, error: osiError } = await admin
      .from("ejecucion_osi")
      .select("id, nro_osi_secuencial, fecha_inicio_real")
      .in("id", osiIds);

    if (osiError) {
      throw new Error(`No se pudieron resolver los ids de OSI: ${osiError.message}`);
    }

    const byId = new Map<
      number,
      { nroOsi: number; fechaInicioReal: string | null }
    >();
    for (const row of osiRows ?? []) {
      const n = parseInt(String(row.nro_osi_secuencial ?? ""), 10);
      if (Number.isFinite(n)) {
        byId.set(row.id as number, {
          nroOsi: n,
          fechaInicioReal: (row.fecha_inicio_real as string | null) ?? null,
        });
      }
    }

    for (const osiId of osiIds) {
      const meta = byId.get(osiId);
      if (!meta) {
        report.notFound.push(osiId);
        continue;
      }
      const { nroOsi, fechaInicioReal } = meta;
      try {
        // 1. Fetch existing osi_sesion rows
        let sesiones = await fetchSesiones(admin, osiId);

        // 2. If none, materialize from sesiones_programadas
        if (sesiones.length === 0) {
          await ensureSesionesFromProgramadas(admin, osiId);
          sesiones = await fetchSesiones(admin, osiId);
        }

        // 3. If still none → report so the user can create a single session
        if (sesiones.length === 0) {
          report.noSessions.push({ nroOsi, osiId, fechaInicioReal });
          continue;
        }

        // 4. Mark all sessions as executed
        await markOsiEjecutada(admin, osiId, sesiones);
        report.processed.push({ nroOsi, osiId, sesiones: sesiones.length });
      } catch (err) {
        console.error(`[backfill] Error processing OSI ${nroOsi} (id ${osiId}):`, err);
        report.errors.push({
          nroOsi,
          osiId,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }

    return report;
  } catch (err) {
    console.error("[backfill] Unexpected error:", err);
    report.errors.push({
      nroOsi: 0,
      osiId: null,
      error: err instanceof Error ? err.message : "Error inesperado",
    });
    return report;
  }
}

// ─── Single-session creation for OSIs with no session data ────────────────────

/**
 * For an OSI with no osi_sesion rows and no sesiones_programadas, create a
 * single session from fecha_inicio_real and mark it as executed.
 *
 * @param osiId Internal ejecucion_osi.id (the candidate rows already carry it).
 */
export async function createSingleSessionAndMarkEjecutada(
  osiId: number,
): Promise<{ success: boolean; error?: string }> {
  const guard = assertDevOnly();
  if (guard) return { success: false, error: guard.error };

  if (!Number.isFinite(osiId) || osiId <= 0) {
    return { success: false, error: "Id de OSI inválido" };
  }

  try {
    const admin = await createAdminClient();

    const { data: osiRow, error: osiError } = await admin
      .from("ejecucion_osi")
      .select("id, nro_osi_secuencial, fecha_inicio_real")
      .eq("id", osiId)
      .maybeSingle();

    if (osiError) {
      return { success: false, error: "Error al leer la OSI" };
    }
    if (!osiRow) {
      return { success: false, error: `OSI id ${osiId} no encontrada` };
    }

    const fechaInicioReal = (osiRow.fecha_inicio_real as string | null) ?? null;
    if (!fechaInicioReal) {
      return {
        success: false,
        error: "La OSI no tiene fecha_inicio_real — no se puede crear la sesión",
      };
    }

    // Insert a single osi_sesion row (nro_sesion = 1)
    const { error: insertError } = await admin.from("osi_sesion").upsert(
      {
        id_osi: osiId,
        nro_sesion: 1,
        fecha: fechaInicioReal.split("T")[0],
        hora_inicio: null,
        hora_fin: null,
      },
      { onConflict: "id_osi,nro_sesion", ignoreDuplicates: true },
    );

    if (insertError) {
      console.error("[backfill] Error creating single session:", insertError);
      return { success: false, error: "Error al crear la sesión" };
    }

    // Re-read so we get the real row id (upsert with ignoreDuplicates may not return it)
    const sesiones = await fetchSesiones(admin, osiId);
    if (sesiones.length === 0) {
      return { success: false, error: "No se pudo crear ni leer la sesión" };
    }

    await markOsiEjecutada(admin, osiId, sesiones);
    return { success: true };
  } catch (err) {
    console.error("[backfill] Unexpected error in createSingleSessionAndMarkEjecutada:", err);
    return { success: false, error: "Error inesperado" };
  }
}
