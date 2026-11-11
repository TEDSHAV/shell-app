"use client";

import { useEffect } from "react";
import {
  X,
  CheckCircle2,
  CalendarClock,
  XCircle,
  RotateCcw,
  Activity,
  Milestone,
  Info,
  Calendar,
} from "lucide-react";
import type { OSIListItem, OsiNota } from "@/types/osi";

interface OSINotasModalProps {
  osi: OSIListItem | null;
  open: boolean;
  onClose: () => void;
  onNotasUpdated?: (osiId: number, updatedNotas: OsiNota[]) => void;
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "hace unos segundos";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} sem`;

  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString("es-VE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

interface ParsedStatusEvent {
  kind: "ejecutado" | "reagendado" | "no_ejecutado" | "reactivado" | "general";
  label: string;
  badgeClass: string;
  dotClass: string;
  IconComponent: typeof CheckCircle2;
  sesion: string | null;
  body: string;
  tag?: string;
}

function parseStatusNota(raw: string): ParsedStatusEvent {
  const text = (raw || "").trim();

  // Extract session if mentioned
  const sesionMatch = text.match(/sesi[oó]n\s*(\d+)/i);
  const sesion = sesionMatch ? `Sesión ${sesionMatch[1]}` : null;

  // Extract leading bracket tag like [Marcado como Ejecutado - Sesión 1]
  const bracketEnd = text.startsWith("[") ? text.indexOf("]") : -1;
  const tag = bracketEnd > 1 ? text.substring(1, bracketEnd) : undefined;
  const body = bracketEnd > 1 ? text.substring(bracketEnd + 1).trim() || text : text;

  const lower = text.toLowerCase();

  if (lower.includes("reactivad") || lower.includes("retornada a la pestaña de activos")) {
    return {
      kind: "reactivado",
      label: "Reactivado a Activos",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-blue-300/60",
      dotClass: "bg-blue-600 text-white shadow-blue-200",
      IconComponent: RotateCcw,
      sesion,
      body,
      tag,
    };
  }

  if (
    lower.includes("re-agendad") ||
    lower.includes("reagendad") ||
    lower.includes("reprogramad")
  ) {
    return {
      kind: "reagendado",
      label: "Re-agendado",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-300/60",
      dotClass: "bg-amber-500 text-white shadow-amber-200",
      IconComponent: CalendarClock,
      sesion,
      body,
      tag,
    };
  }

  if (
    lower.includes("no ejecutad") ||
    lower.includes("no ejecutada") ||
    lower.includes("cancelad")
  ) {
    return {
      kind: "no_ejecutado",
      label: "No ejecutado",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200 ring-1 ring-rose-300/60",
      dotClass: "bg-rose-600 text-white shadow-rose-200",
      IconComponent: XCircle,
      sesion,
      body,
      tag,
    };
  }

  if (
    lower.includes("marcado como ejecutado") ||
    lower.includes("confirmación en vivo") ||
    lower.includes("en proceso / ejecutado") ||
    lower.includes("ejecutado")
  ) {
    return {
      kind: "ejecutado",
      label: "En proceso / Ejecutado",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-300/60",
      dotClass: "bg-emerald-600 text-white shadow-emerald-200",
      IconComponent: CheckCircle2,
      sesion,
      body,
      tag,
    };
  }

  return {
    kind: "general",
    label: "Actualización de Servicio",
    badgeClass: "bg-slate-50 text-slate-800 border-slate-200 ring-1 ring-slate-300/60",
    dotClass: "bg-slate-600 text-white shadow-slate-200",
    IconComponent: Activity,
    sesion,
    body,
    tag,
  };
}

export default function OSINotasModal({
  osi,
  open,
  onClose,
}: OSINotasModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !osi || !osi.id_osi) return null;

  const notasList = osi.notas || [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 shadow-xs">
              <Milestone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  Historial de Estatus y Ejecución
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Sólo lectura
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-semibold text-gray-700">OSI {osi.nro_osi}</span>
                {osi.nombre_empresa && ` · ${osi.nombre_empresa}`}
                {osi.servicio && ` · ${osi.servicio}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper / Timeline Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {notasList.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-gray-200">
              {notasList.map((nota, idx) => {
                const parsed = parseStatusNota(nota.nota);
                const Icon = parsed.IconComponent;
                const isFirst = idx === 0;

                return (
                  <div key={nota.id} className="relative group">
                    {/* Stepper Timeline Node */}
                    <div
                      className={`absolute -left-6 top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ring-4 ring-white ${
                        parsed.dotClass
                      } ${isFirst ? "scale-110" : ""}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* Event Card */}
                    <div className="ml-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs transition-all hover:border-gray-300 hover:shadow-sm">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${parsed.badgeClass}`}
                          >
                            {parsed.label}
                          </span>
                          {parsed.sesion && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                              {parsed.sesion}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <span className="font-medium text-gray-700">
                            {nota.autorNombre || "Sistema / Usuario"}
                          </span>
                          <span>·</span>
                          <span title={formatFullDate(nota.createdAt)}>
                            {formatRelativeDate(nota.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {parsed.body}
                      </div>

                      {/* Tag metadata badge if present */}
                      {parsed.tag && (
                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-[10px] text-gray-400">
                          <Info className="w-3 h-3" />
                          <span className="truncate">{parsed.tag}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">
                Sin cambios de estatus registrados
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Esta OSI aún no tiene registros de ejecución, re-agendamiento o desmarcado en el flujo de seguimiento.
              </p>
            </div>
          )}
        </div>

        {/* Read-Only Footer Notice */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-4">
          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Para registrar nuevos comentarios u observaciones de coordinación, utiliza el chat de{" "}
              <strong className="text-gray-700">Comentarios</strong> de la OSI.
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
