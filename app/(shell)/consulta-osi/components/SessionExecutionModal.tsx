"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCalendarDayEsVe, formatTimeAmPmEsVe } from "@sha/osi-formato";
import type { OSISession } from "@/types/osi";

export type SessionExecutionPayload = {
  fecha_ejecutada: string;
  hora_ejecutada: string;
  ejecutada_en_fecha_planificada: boolean;
};

export type SessionExecutionConfirmItem = SessionExecutionPayload & {
  sessionId: number;
};

interface SessionExecutionModalProps {
  open: boolean;
  sessions: OSISession[];
  /** Shown in title when confirming OSI-level execution. */
  osiLabel?: string | null;
  /** edit = adjusting existing executed date; execute = first-time confirmation. */
  mode?: "execute" | "edit";
  onConfirm: (items: SessionExecutionConfirmItem[]) => Promise<void> | void;
  onClose: () => void;
}

type DraftRow = {
  sessionId: number;
  nro_sesion: number;
  plannedFecha: string;
  plannedHora: string;
  fechaReal: string;
  horaReal: string;
};

function to_time_input_value(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function draft_from_sessions(sessions: OSISession[]): DraftRow[] {
  return sessions.map((session) => {
    const plannedHora = to_time_input_value(session.hora_inicio) || "00:00";
    const executedHora = to_time_input_value(session.hora_ejecutada);
    return {
      sessionId: session.id,
      nro_sesion: session.nro_sesion,
      plannedFecha: session.fecha ?? "",
      plannedHora,
      fechaReal: session.fecha_ejecutada ?? session.fecha ?? "",
      horaReal: executedHora || plannedHora,
    };
  });
}

function to_confirm_items(rows: DraftRow[]): SessionExecutionConfirmItem[] {
  return rows.map((row) => {
    const sameDate = row.fechaReal === row.plannedFecha;
    const sameTime = row.horaReal === row.plannedHora;
    return {
      sessionId: row.sessionId,
      fecha_ejecutada: row.fechaReal,
      hora_ejecutada: row.horaReal,
      ejecutada_en_fecha_planificada: sameDate && sameTime,
    };
  });
}

export default function SessionExecutionModal({
  open,
  sessions,
  osiLabel,
  mode = "execute",
  onConfirm,
  onClose,
}: SessionExecutionModalProps) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || sessions.length === 0) return;
    setRows(draft_from_sessions(sessions));
    setIsSubmitting(false);
  }, [open, sessions]);

  if (!open || sessions.length === 0) return null;

  const isBulk = sessions.length > 1;
  const isEdit = mode === "edit";

  const updateRow = (
    sessionId: number,
    patch: Partial<Pick<DraftRow, "fechaReal" | "horaReal">>,
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.sessionId === sessionId ? { ...row, ...patch } : row)),
    );
  };

  const runConfirm = async (items: SessionExecutionConfirmItem[]) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(items);
      onClose();
    } catch (e) {
      console.error("[SessionExecutionModal] confirm:", e);
      alert(e instanceof Error ? e.message : "Error al guardar la ejecución");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPlanned = async () => {
    const items = rows.map((row) => ({
      sessionId: row.sessionId,
      fecha_ejecutada: row.plannedFecha,
      hora_ejecutada: row.plannedHora || "00:00",
      ejecutada_en_fecha_planificada: true,
    }));
    await runConfirm(items);
  };

  const handleConfirmCustom = async () => {
    if (rows.some((row) => !row.fechaReal.trim() || !row.horaReal.trim())) return;
    await runConfirm(to_confirm_items(rows));
  };

  const canSaveCustom = rows.every(
    (row) => row.fechaReal.trim() && row.horaReal.trim(),
  );

  const title = isEdit
    ? isBulk
      ? "Editar fechas de ejecución"
      : "Editar fecha ejecutada"
    : isBulk
      ? "Confirmar ejecución de sesiones"
      : "Fecha planificada";

  const plannedButtonLabel = isEdit
    ? isBulk
      ? "Usar fechas planificadas"
      : "Usar fecha planificada"
    : isBulk
      ? "Se ejecutaron en las fechas planificadas"
      : "Se ejecutó en la fecha planificada";

  const saveButtonLabel = isEdit
    ? "Guardar cambios"
    : isBulk
      ? "Guardar fechas y ejecutar"
      : "Guardar fecha real";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 bg-white shadow-2xl border-none max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
          {osiLabel ? (
            <p className="text-xs text-gray-500 mb-3">OSI {osiLabel}</p>
          ) : null}

          <div className="space-y-3 mb-4">
            {rows.map((row) => {
              const plannedLabel = `${formatCalendarDayEsVe(row.plannedFecha)} · ${formatTimeAmPmEsVe(
                row.plannedHora,
              )}`;
              return (
                <div
                  key={row.sessionId}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Sesión #{row.nro_sesion}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Planificada: {plannedLabel}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-gray-600">
                      Fecha ejecutada
                      <input
                        type="date"
                        value={row.fechaReal}
                        onChange={(e) =>
                          updateRow(row.sessionId, { fechaReal: e.target.value })
                        }
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Hora ejecutada
                      <input
                        type="time"
                        value={row.horaReal}
                        onChange={(e) =>
                          updateRow(row.sessionId, { horaReal: e.target.value })
                        }
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            className="w-full mb-4"
            disabled={isSubmitting}
            onClick={() => void handleConfirmPlanned()}
          >
            {plannedButtonLabel}
          </Button>

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || !canSaveCustom}
              onClick={() => void handleConfirmCustom()}
            >
              {saveButtonLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
