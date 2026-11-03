import { formatTimeAmPmEsVe } from "./utils/calendar-date";

export type OsiSessionSlotRow = {
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  horas?: number | null;
  participantes?: number | null;
};

export type OsiExecutionDayQuantity = {
  dia?: number | null;
  horas: number | null;
  participantes: number | null;
};

function to_slot_int(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export const OSI_FECHA_POR_PLANIFICAR_LABEL = "Por planificar";

/** Lee todas las filas de sesión del JSON, conservando fechas vacías. */
export function parse_osi_session_slots(value: unknown): OsiSessionSlotRow[] {
  if (!Array.isArray(value)) return [];
  const result: OsiSessionSlotRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    result.push({
      fecha: typeof row.fecha === "string" ? row.fecha : "",
      hora_inicio:
        row.hora_inicio == null || row.hora_inicio === ""
          ? null
          : String(row.hora_inicio).trim() || null,
      hora_fin:
        row.hora_fin == null || row.hora_fin === ""
          ? null
          : String(row.hora_fin).trim() || null,
      horas: to_slot_int(row.horas),
      participantes: to_slot_int(row.participantes),
    });
  }
  return result;
}

export function count_osi_session_slots(value: unknown): number {
  return parse_osi_session_slots(value).length;
}

/** Lee día/horas/participantes de la distribución de ejecución (JSON ECC/OSI). */
export function parse_execution_day_quantities(
  value: unknown,
): OsiExecutionDayQuantity[] {
  if (!Array.isArray(value)) return [];
  const days: OsiExecutionDayQuantity[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    days.push({
      dia: to_slot_int(row.dia),
      horas: to_slot_int(row.horas),
      participantes: to_slot_int(row.participantes),
    });
  }
  return days;
}

/** Copia horas (y participantes si se distribuyen) de cada día al slot de sesión. */
export function merge_session_slot_day_quantities<
  T extends OsiSessionSlotRow,
>(
  slots: T[],
  days: OsiExecutionDayQuantity[],
  distribuir_participantes: boolean,
): Array<T & { horas: number | null; participantes: number | null }> {
  return slots.map((slot, index) => {
    const day = days[index];
    return {
      ...slot,
      horas: day?.horas ?? slot.horas ?? null,
      participantes: distribuir_participantes
        ? (day?.participantes ?? slot.participantes ?? null)
        : (slot.participantes ?? null),
    };
  });
}

/** Rellena hasta `target_count` con filas vacías (sin inventar fechas). */
export function pad_osi_session_slots(
  slots: OsiSessionSlotRow[],
  target_count: number,
): OsiSessionSlotRow[] {
  const safe_target = Math.max(0, Math.floor(target_count));
  const result: OsiSessionSlotRow[] = [];
  for (let index = 0; index < safe_target; index += 1) {
    const row = slots[index];
    result.push(
      row ?? {
        fecha: "",
        hora_inicio: null,
        hora_fin: null,
        horas: null,
        participantes: null,
      },
    );
  }
  return result;
}

export function resolve_osi_sesiones_documento_count(params: {
  sesiones_solped: number | null | undefined;
  sesiones_programadas: unknown;
  sesiones_ejecucion?: unknown;
}): number | null {
  const solped = Number(params.sesiones_solped ?? 0);
  const slots = count_osi_session_slots(params.sesiones_programadas);
  const with_fecha = parse_osi_session_slots(params.sesiones_programadas).filter(
    (row) => String(row.fecha ?? "").trim().length > 0,
  ).length;
  const ejecucion = Number(params.sesiones_ejecucion ?? 0);
  const total = Math.max(
    solped > 0 ? solped : 0,
    slots,
    with_fecha,
    ejecucion > 0 ? ejecucion : 0,
  );
  return total > 0 ? total : null;
}

/** Filas DÍA/HORA para FECHA PLANIFICADA (incluye «Por planificar»). */
export function map_sesiones_planificadas_dia_hora(
  sessions: OsiSessionSlotRow[] | undefined,
  target_count?: number,
): Array<{ fecha: string; hora: string }> {
  const padded =
    target_count != null && target_count > 0
      ? pad_osi_session_slots(sessions ?? [], target_count)
      : (sessions ?? []);

  return padded.map((session) => {
    const fecha =
      typeof session?.fecha === "string" ? session.fecha.trim() : "";
    const hora_txt = formatTimeAmPmEsVe(
      session.hora_inicio || session.hora_fin || null,
    );
    if (!fecha) {
      return {
        fecha: OSI_FECHA_POR_PLANIFICAR_LABEL,
        hora: hora_txt !== "—" ? hora_txt : "—",
      };
    }
    return {
      fecha,
      hora: hora_txt,
    };
  });
}
