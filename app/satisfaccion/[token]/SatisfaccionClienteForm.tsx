"use client";

import React, { useState } from "react";
import Image from "next/image";
import logo from "@/app/logo.png";
import {
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Star,
  Check,
} from "lucide-react";
import type { EncuestaCliente, SubmitRespuestaInput } from "@/actions/satisfaccion-clientes";
import { submitRespuestaCliente } from "@/actions/satisfaccion-clientes";

interface Props {
  encuesta: EncuestaCliente;
}

const Q1_OPTIONS = [
  { value: 5, label: "Excedió mis expectativas", desc: "Superó lo acordado con un estándar sobresaliente" },
  { value: 4, label: "Cumplió totalmente", desc: "Se ajustó cabalmente a lo requerido y especificado" },
  { value: 3, label: "Cumplió parcialmente", desc: "Se entregó el servicio pero con detalles pendientes" },
  { value: 2, label: "Regular / Falta mejorar", desc: "Aspectos clave por debajo de lo esperado" },
  { value: 1, label: "No cumplió con lo acordado", desc: "No satisfizo los requisitos convenidos" },
];

const Q2_OPTIONS = [
  { value: 5, label: "Excelente atención", desc: "Atención rápida, proactiva y muy amable" },
  { value: 4, label: "Buena atención", desc: "Trato cordial y respuesta oportuna" },
  { value: 3, label: "Aceptable", desc: "Atención estándar dentro de lo normal" },
  { value: 2, label: "Deficiente", desc: "Demoras o poca disposición de respuesta" },
  { value: 1, label: "Muy mala experiencia", desc: "Falta de respuesta o trato insatisfactorio" },
];

export function SatisfaccionClienteForm({ encuesta }: Props) {
  const [calidad, setCalidad] = useState<number | null>(null);
  const [atencion, setAtencion] = useState<number | null>(null);
  const [fidelidad, setFidelidad] = useState<number | null>(null);
  const [comentarios, setComentarios] = useState<string>("");
  const [respondenteNombre, setRespondenteNombre] = useState<string>(
    encuesta.cliente_contacto_nombre || "",
  );
  const [respondenteCargo, setRespondenteCargo] = useState<string>(
    encuesta.cliente_contacto_cargo || "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = calidad !== null && atencion !== null && fidelidad !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    const payload: SubmitRespuestaInput = {
      calidad_servicio: calidad!,
      atencion_soporte: atencion!,
      fidelidad_nps: fidelidad!,
      comentarios: comentarios.trim() || null,
      respondente_nombre: respondenteNombre.trim() || null,
      respondente_cargo: respondenteCargo.trim() || null,
    };

    const res = await submitRespuestaCliente(encuesta.token, payload);
    setSubmitting(false);

    if (res.ok) {
      setSubmitted(true);
    } else {
      setErrorMsg(res.error || "Ocurrió un error al enviar sus respuestas. Por favor intente nuevamente.");
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-xl sm:p-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-semibold text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" /> ¡Encuesta enviada con éxito!
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          ¡Muchas gracias por su opinión!
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          En <strong>SHA de Venezuela</strong> valoramos profundamente su tiempo y confianza. Su retroalimentación es clave para seguir asegurando la excelencia técnica y operativa en cada uno de nuestros servicios.
        </p>
        <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-500">
          Empresa: <strong>{encuesta.nombre_empresa}</strong> • Servicio: <strong>{encuesta.servicio}</strong>
          {encuesta.nro_osi && encuesta.nro_osi !== "S/N" && ` • OSI: ${encuesta.nro_osi}`}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0c3f69] via-[#0f4b7c] to-[#0284c7] px-6 py-8 text-white sm:px-10">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <Image
              src={logo}
              alt="SHA de Venezuela"
              height={40}
              className="h-10 w-auto object-contain rounded-xl bg-white px-3 py-1 shadow-xs"
              priority
            />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-200" />
            Control de Calidad
          </span>
        </div>

        <div className="relative z-10 mt-6">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Encuesta de Satisfacción del Cliente
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-sky-100">
            Estimado cliente de <strong className="text-white underline decoration-sky-300 underline-offset-2">{encuesta.nombre_empresa}</strong>, le agradecemos responder estas 3 breves preguntas sobre el servicio recibido.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-white/10 px-2.5 py-1 text-white backdrop-blur-sm">
              📋 Servicio: <strong>{encuesta.servicio}</strong>
            </span>
            {encuesta.nro_osi && encuesta.nro_osi !== "S/N" && (
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-white backdrop-blur-sm">
                🔢 OSI: <strong>{encuesta.nro_osi}</strong>
              </span>
            )}
            {encuesta.fecha_servicio && (
              <span className="rounded-md bg-white/10 px-2.5 py-1 text-white backdrop-blur-sm">
                📅 Fecha: {encuesta.fecha_servicio}
              </span>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* Survey Form */}
      <form onSubmit={handleSubmit} className="space-y-8 p-6 sm:p-10">
        {errorMsg && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* ========================================================= */}
        {/* QUESTION 1: Calidad del Producto o Servicio */}
        {/* ========================================================= */}
        <div className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 sm:p-6 transition-all hover:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0c3f69] text-xs font-bold text-white">
                1
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Calidad del Producto o Servicio (Cumplimiento de Requisitos)
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 font-medium">
              ¿En qué medida el servicio recibido cumplió con las especificaciones y características acordadas?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-2">
            {Q1_OPTIONS.map((opt) => {
              const isSelected = calidad === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCalidad(opt.value)}
                  className={`group flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                      }`}
                    >
                      {opt.value}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 sm:text-sm">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {opt.desc}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* QUESTION 2: Atención y Soporte al Cliente */}
        {/* ========================================================= */}
        <div className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 sm:p-6 transition-all hover:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0c3f69] text-xs font-bold text-white">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Atención y Soporte al Cliente
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 font-medium">
              ¿Cómo evalúa la disposición, amabilidad y capacidad de respuesta de nuestro equipo/ejecutivo ante sus solicitudes o dudas?
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-2">
            {Q2_OPTIONS.map((opt) => {
              const isSelected = atencion === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAtencion(opt.value)}
                  className={`group flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                      }`}
                    >
                      {opt.value}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 sm:text-sm">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {opt.desc}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* QUESTION 3: Fidelidad (NPS 0 al 10) */}
        {/* ========================================================= */}
        <div className="space-y-4 rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50/50 via-white to-sky-50/30 p-5 sm:p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0284c7] text-xs font-bold text-white">
                3
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Fidelidad
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-slate-700 font-medium">
              Considerando su experiencia global con nosotros, ¿Volverías a comprar nuestros servicios?
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 italic">
              (Seleccione un número del 0 al 10, donde 0 es &quot;Nada probable&quot; y 10 es &quot;Altamente probable&quot;)
            </p>
          </div>

          <div className="pt-2">
            <div className="grid grid-cols-11 gap-1 sm:gap-2">
              {Array.from({ length: 11 }, (_, i) => i).map((score) => {
                const isSelected = fidelidad === score;
                let colorClasses =
                  "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

                if (isSelected) {
                  if (score <= 6) {
                    colorClasses =
                      "border-rose-500 bg-rose-600 text-white font-bold ring-2 ring-rose-200 shadow-sm";
                  } else if (score <= 8) {
                    colorClasses =
                      "border-amber-500 bg-amber-500 text-white font-bold ring-2 ring-amber-200 shadow-sm";
                  } else {
                    colorClasses =
                      "border-emerald-600 bg-emerald-600 text-white font-bold ring-2 ring-emerald-200 shadow-sm";
                  }
                }

                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setFidelidad(score)}
                    className={`flex h-11 items-center justify-center rounded-xl border text-xs sm:text-sm font-semibold transition-all ${colorClasses}`}
                  >
                    {score}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1">
              <span>0 = Nada probable</span>
              <span>10 = Altamente probable</span>
            </div>

            {fidelidad !== null && (
              <div className="mt-3 rounded-lg bg-white/90 p-2 text-center text-xs font-medium border border-slate-200/60">
                Puntuación seleccionada:{" "}
                <strong
                  className={
                    fidelidad >= 9
                      ? "text-emerald-700"
                      : fidelidad >= 7
                      ? "text-amber-700"
                      : "text-rose-700"
                  }
                >
                  {fidelidad} de 10 —{" "}
                  {fidelidad >= 9
                    ? "Altamente probable (¡Gracias por su lealtad!)"
                    : fidelidad >= 7
                    ? "Probable (Trabajamos para ganar su total confianza)"
                    : "Poco probable (Nos esforzaremos en mejorar)"}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Optional Comments */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <MessageSquare className="h-4 w-4 text-sky-600" />
              Comentarios o sugerencias adicionales (Opcional)
            </label>
            <textarea
              rows={3}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="¿Desea compartir algún comentario, sugerencia o detalle sobre el servicio recibido?"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Contact Details */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Datos de contacto (Opcional)
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-600">Nombre de quien responde</label>
                <input
                  type="text"
                  value={respondenteNombre}
                  onChange={(e) => setRespondenteNombre(e.target.value)}
                  placeholder="Ej. Ing. Carlos Pérez"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Cargo / Departamento</label>
                <input
                  type="text"
                  value={respondenteCargo}
                  onChange={(e) => setRespondenteCargo(e.target.value)}
                  placeholder="Ej. Coordinador de Seguridad / RRHH"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg transition-all ${
              canSubmit && !submitting
                ? "bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/35 active:scale-[0.99]"
                : "cursor-not-allowed bg-slate-300 shadow-none"
            }`}
          >
            {submitting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Enviando evaluación...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Encuesta de Satisfacción
              </>
            )}
          </button>
          {!canSubmit && (
            <p className="mt-2 text-center text-xs text-slate-400">
              * Por favor seleccione una opción en cada una de las 3 preguntas para completar la encuesta.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
