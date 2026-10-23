"use client";

import React from "react";
import { X, Star, MessageSquare, ClipboardCheck, CheckCircle2 } from "lucide-react";
import type { EncuestaConRespuesta } from "@/actions/satisfaccion-clientes";

interface Props {
  encuesta: EncuestaConRespuesta | null;
  onClose: () => void;
}

const Q1_TEXT: Record<number, string> = {
  5: "Excedió mis expectativas",
  4: "Cumplió totalmente",
  3: "Cumplió parcialmente",
  2: "Regular / Falta mejorar",
  1: "No cumplió con lo acordado",
};

const Q2_TEXT: Record<number, string> = {
  5: "Excelente atención",
  4: "Buena atención",
  3: "Aceptable",
  2: "Deficiente",
  1: "Muy mala experiencia",
};

export function SurveyDetailsModal({ encuesta, onClose }: Props) {
  if (!encuesta) return null;
  const r = encuesta.respuesta;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-none">
                  {encuesta.nombre_empresa}
                </h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  Respondida
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {encuesta.nro_osi && encuesta.nro_osi !== "S/N" ? `OSI ${encuesta.nro_osi} • ` : ""}
                {encuesta.servicio}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div>
              <span className="text-slate-400">Servicio evaluado:</span>
              <p className="font-semibold text-slate-800">{encuesta.servicio}</p>
            </div>
            <div>
              <span className="text-slate-400">Tipo de Servicio:</span>
              <p className="font-semibold text-slate-800">{encuesta.tipo_servicio || "General"}</p>
            </div>
            <div>
              <span className="text-slate-400">Ejecutivo de Cuentas:</span>
              <p className="font-semibold text-slate-800">{encuesta.ejecutivo_negocios || "No especificado"}</p>
            </div>
            <div>
              <span className="text-slate-400">Fecha de Respuesta:</span>
              <p className="font-semibold text-slate-800">
                {encuesta.responded_at
                  ? new Date(encuesta.responded_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Ratings Overview */}
          {r ? (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Resultados de la Evaluación del Cliente
              </h4>

              {/* Question 1 Result */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    1. Calidad del Producto o Servicio (Cumplimiento de Requisitos)
                  </span>
                  <span className="flex items-center gap-1 font-bold text-slate-900 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {r.calidad_servicio} / 5
                  </span>
                </div>
                <p className="text-xs font-semibold text-emerald-800">
                  {r.calidad_servicio} – {Q1_TEXT[r.calidad_servicio] || "N/A"}
                </p>
              </div>

              {/* Question 2 Result */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    2. Atención y Soporte al Cliente
                  </span>
                  <span className="flex items-center gap-1 font-bold text-slate-900 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {r.atencion_soporte} / 5
                  </span>
                </div>
                <p className="text-xs font-semibold text-emerald-800">
                  {r.atencion_soporte} – {Q2_TEXT[r.atencion_soporte] || "N/A"}
                </p>
              </div>

              {/* Question 3: Fidelidad Card */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-950">
                      3. Fidelidad (Volvería a comprar)
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Considerando su experiencia global con nosotros
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-3 py-1 text-sm font-bold ${
                        r.fidelidad_nps >= 9
                          ? "bg-emerald-600 text-white"
                          : r.fidelidad_nps >= 7
                          ? "bg-amber-500 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {r.fidelidad_nps} / 10
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {r.fidelidad_nps >= 9
                        ? "Promotor"
                        : r.fidelidad_nps >= 7
                        ? "Pasivo"
                        : "Detractor"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Qualitative comments */}
              {r.comentarios && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    Comentarios o sugerencias del cliente:
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 italic mt-1">
                    &quot;{r.comentarios}&quot;
                  </p>
                </div>
              )}

              {/* Respondent info */}
              {(r.respondente_nombre || r.respondente_cargo) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">Respondido por:</span>{" "}
                  {r.respondente_nombre || "Anónimo"}{" "}
                  {r.respondente_cargo && `(${r.respondente_cargo})`}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              Esta encuesta aún no ha sido respondida por el cliente.
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="shrink-0 flex items-center justify-end border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
