"use client";

import { formatCalendarDayEsVe, formatTimeAmPmEsVe } from "./utils/calendar-date";
import {
  OSI_FECHA_POR_PLANIFICAR_LABEL,
  pad_osi_session_slots,
  type OsiSessionSlotRow,
} from "./osi-session-slots";

export type OsiFechaPlanificadaV2Row = {
  diaLabel: string;
  horaLabel: string;
  participantes: number | null;
};

function format_horas_dia(horas: number | null | undefined): string | null {
  if (horas == null || !Number.isFinite(horas) || horas < 0) return null;
  const n = Math.trunc(horas);
  return `${n} ${n === 1 ? "hora" : "horas"}`;
}

export function map_sesiones_planificadas_v2(params: {
  sessions: OsiSessionSlotRow[] | undefined;
  target_count?: number;
}): OsiFechaPlanificadaV2Row[] {
  const padded =
    params.target_count != null && params.target_count > 0
      ? pad_osi_session_slots(params.sessions ?? [], params.target_count)
      : (params.sessions ?? []);

  return padded.map((session, index) => {
    const fecha_raw =
      typeof session?.fecha === "string" ? session.fecha.trim() : "";
    const fecha_label = fecha_raw
      ? formatCalendarDayEsVe(fecha_raw)
      : OSI_FECHA_POR_PLANIFICAR_LABEL;
    const hora_txt = formatTimeAmPmEsVe(
      session.hora_inicio || session.hora_fin || null,
    );
    const horas_txt = format_horas_dia(session.horas ?? null);
    const hora_part = hora_txt !== "—" ? hora_txt : null;
    const horaLabel =
      hora_part && horas_txt
        ? `${hora_part} | ${horas_txt}`
        : hora_part ?? horas_txt ?? "—";
    return {
      diaLabel: `Día ${index + 1} · ${fecha_label}`,
      horaLabel,
      participantes:
        session.participantes != null && Number.isFinite(session.participantes)
          ? Math.trunc(session.participantes)
          : null,
    };
  });
}

export function same_group_participantes_footnote(params: {
  participantes: number | null | undefined;
  dias: number | null | undefined;
}): string {
  const n = Math.max(0, Math.trunc(Number(params.participantes ?? 0)));
  const d = Math.max(0, Math.trunc(Number(params.dias ?? 0)));
  const n_txt = n > 0 ? String(n) : "N";
  const d_txt = d > 0 ? String(d) : "N";
  const dia_word = d === 1 ? "día" : "días";
  return `Los mismos ${n_txt} participantes asistirán los ${d_txt} ${dia_word}.`;
}

export function OsiCapFechaPlanificadaV2Table({
  sessions,
  showParticipantesColumn,
  sameGroupFootnote,
  emptyFallback = "N/A",
}: {
  sessions: OsiFechaPlanificadaV2Row[];
  showParticipantesColumn: boolean;
  sameGroupFootnote?: string | null;
  emptyFallback?: string;
}) {
  const col_count = showParticipantesColumn ? 3 : 2;
  return (
    <table className="w-full table-fixed border-collapse">
      <tbody>
        <tr>
          <th className="border-b border-black px-1 py-0.5 text-left text-[12px]">
            DÍA
          </th>
          <th className="border-b border-black px-1 py-0.5 text-right text-[12px]">
            HORA
          </th>
          {showParticipantesColumn ? (
            <th className="border-b border-black px-1 py-0.5 text-right text-[12px]">
              N PARTICIPANTES
            </th>
          ) : null}
        </tr>
        {sessions.length > 0 ? (
          sessions.map((session, idx) => (
            <tr key={`${session.diaLabel}-${idx}`}>
              <td className="border-b border-black px-1 py-0.5 text-left text-[12px]">
                {session.diaLabel}
              </td>
              <td className="border-b border-black px-1 py-0.5 text-right text-[12px]">
                {session.horaLabel}
              </td>
              {showParticipantesColumn ? (
                <td className="border-b border-black px-1 py-0.5 text-right text-[12px] font-bold">
                  {session.participantes != null
                    ? String(session.participantes)
                    : "—"}
                </td>
              ) : null}
            </tr>
          ))
        ) : (
          <tr>
            <td
              colSpan={col_count}
              className="px-1 py-0.5 text-left text-[12px]"
            >
              {emptyFallback}
            </td>
          </tr>
        )}
        {!showParticipantesColumn && sameGroupFootnote ? (
          <tr>
            <td
              colSpan={col_count}
              className="px-1 py-1 text-left text-[11px] leading-snug"
            >
              {sameGroupFootnote}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
