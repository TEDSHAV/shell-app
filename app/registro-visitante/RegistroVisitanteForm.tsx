"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import logo from "@/app/logo.png";
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Phone,
  Building2,
  FileText,
  Clock,
  Calendar,
  Loader2,
  Sparkles,
  User,
  Briefcase,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  registerVisitorPublic,
  getPublicVisitantesInitData,
  type VisitanteRegistro,
} from "@/actions/visitantes";
import {
  MOTIVOS_VISITA_SUGERIDOS,
  type VisitantesConfig,
} from "@/features/visitantes/lib/visitantes-defaults";

interface Props {
  config: VisitantesConfig;
  departamentos: string[];
}

const OTRO_MOTIVO = "__otro__";

export function RegistroVisitanteForm({
  config: initialConfig,
  departamentos: initialDepartamentos,
}: Props) {
  const [config, setConfig] = useState<VisitantesConfig>(initialConfig);
  const [departamentos, setDepartamentos] =
    useState<string[]>(initialDepartamentos);
  const [nacionalidad, setNacionalidad] = useState<"V" | "E">("V");
  const [cedula, setCedula] = useState("");
  const [nombreApellido, setNombreApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [empresaProcedencia, setEmpresaProcedencia] = useState("");
  const [departamentoDestino, setDepartamentoDestino] = useState("");
  const [personaAVisitar, setPersonaAVisitar] = useState("");
  const [motivoVisita, setMotivoVisita] = useState("");
  const [motivoOtro, setMotivoOtro] = useState("");
  const [aceptoDescargo, setAceptoDescargo] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registroExitoso, setRegistroExitoso] =
    useState<VisitanteRegistro | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicVisitantesInitData()
      .then((res) => {
        if (cancelled) return;
        if (res.config) setConfig(res.config);
        if (res.departamentos && res.departamentos.length > 0) {
          setDepartamentos(res.departamentos);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // On mobile the submit button sits at the bottom of a long form — make sure
  // the visitor actually sees the confirmation (or the error banner at the top).
  useEffect(() => {
    if (registroExitoso || errorMsg) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [registroExitoso, errorMsg]);

  const canSubmit =
    nombreApellido.trim().length >= 3 &&
    cedula.replace(/\D/g, "").length >= 5 &&
    aceptoDescargo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    const res = await registerVisitorPublic({
      nacionalidad,
      cedula: cedula.replace(/\D/g, ""),
      nombre_apellido: nombreApellido.trim(),
      telefono: telefono.trim() || null,
      empresa_procedencia: empresaProcedencia.trim() || "Particular",
      departamento_destino: departamentoDestino.trim() || null,
      persona_a_visitar: personaAVisitar.trim() || null,
      motivo_visita:
        (motivoVisita === OTRO_MOTIVO ? motivoOtro : motivoVisita).trim() ||
        null,
      acepto_descargo: aceptoDescargo,
    });

    setSubmitting(false);

    if (res.ok && res.registro) {
      setRegistroExitoso(res.registro);
    } else {
      setErrorMsg(
        res.error ||
          "No se pudo completar su registro. Por favor intente nuevamente.",
      );
    }
  };

  const handleReset = () => {
    setCedula("");
    setNombreApellido("");
    setTelefono("");
    setEmpresaProcedencia("");
    setDepartamentoDestino("");
    setPersonaAVisitar("");
    setMotivoVisita("");
    setMotivoOtro("");
    setAceptoDescargo(false);
    setErrorMsg(null);
    setRegistroExitoso(null);
  };

  if (registroExitoso) {
    const entryTimeFormatted = new Date(
      registroExitoso.hora_entrada,
    ).toLocaleTimeString("es-VE", {
      timeZone: "America/Caracas",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const entryDateFormatted = new Date(
      registroExitoso.hora_entrada,
    ).toLocaleDateString("es-VE", {
      timeZone: "America/Caracas",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return (
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-[#0c3f69] via-[#0f4b7c] to-teal-700 px-6 py-7 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/20 backdrop-blur-sm">
            <CheckCircle2 className="h-9 w-9 text-emerald-300" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-0.5 text-xs font-semibold text-emerald-100 border border-emerald-300/30">
            <Sparkles className="h-3.5 w-3.5" /> Pase Digital de Entrada #{registroExitoso.id}
          </span>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight">
            {config.mensaje_exito_titulo}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-sky-100/90 leading-relaxed">
            {config.mensaje_exito_cuerpo}
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {/* Visitor Digital Pass Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Visitante Registrado
                </p>
                <p className="text-base font-bold text-slate-900">
                  {registroExitoso.nombre_apellido}
                </p>
                <p className="text-xs font-medium text-slate-600">
                  C.I. {registroExitoso.nacionalidad}-{registroExitoso.cedula}
                  {registroExitoso.telefono ? ` • Tel: ${registroExitoso.telefono}` : ""}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                En visita
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Fecha</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {entryDateFormatted}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Hora de Entrada</span>
                <span className="font-semibold text-slate-800">
                  {entryTimeFormatted}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Procedencia / Empresa</span>
                <span className="font-semibold text-slate-800">
                  {registroExitoso.empresa_procedencia || "Particular"}
                </span>
              </div>
              {registroExitoso.departamento_destino && (
                <div>
                  <span className="text-slate-400 block">Departamento</span>
                  <span className="font-semibold text-slate-800">
                    {registroExitoso.departamento_destino}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Descargo y normas aceptadas
              </span>
              <span>Registro confirmado</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Registrar otro acompañante / visitante
          </button>
        </div>
      </div>
    );
  }

  const nowCaracasDate = new Date().toLocaleDateString("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/60">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0c3f69] via-[#0f4b7c] to-[#0d9488] px-6 py-7 text-white sm:px-8">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <Image
            src={logo}
            alt="SHA de Venezuela"
            height={38}
            className="h-9 w-auto object-contain rounded-xl bg-white px-3 py-1 shadow-xs"
            priority
          />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-200" />
            Control de Acceso
          </span>
        </div>

        <div className="relative z-10 mt-5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {config.titulo_formulario}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-sky-100/90 leading-relaxed">
            {config.subtitulo_formulario}
          </p>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-3 text-xs text-sky-100/90">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-teal-200" />
            Fecha: <strong>{nowCaracasDate}</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-teal-200" />
            Hora de entrada automática al enviar
          </span>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Nombre y Apellido */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Nombre y Apellido <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Nombre y apellido del visitante"
              value={nombreApellido}
              onChange={(e) => setNombreApellido(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

        {/* 2. Cédula de Identidad */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Cédula de Identidad <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={nacionalidad}
              onChange={(e) => setNacionalidad(e.target.value as "V" | "E")}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="V">V</option>
              <option value="E">E</option>
            </select>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="Ej. 12345678"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

        {/* 3. Teléfono y Empresa/Procedencia (Opcionales) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Teléfono <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                placeholder="Ej. 0414-1234567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Empresa / Procedencia <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Empresa o Particular"
                value={empresaProcedencia}
                onChange={(e) => setEmpresaProcedencia(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>
        </div>

        {/* 4. Departamento / Persona a visitar y Motivo (Opcionales) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Departamento que visita <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <select
              value={departamentoDestino}
              onChange={(e) => setDepartamentoDestino(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Seleccione...</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Persona a quien visita <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Nombre del contacto en SHA"
              value={personaAVisitar}
              onChange={(e) => setPersonaAVisitar(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Motivo de la Visita <span className="text-slate-400 font-normal lowercase">(opcional)</span>
          </label>
          <div className="relative">
            <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
            <select
              value={motivoVisita}
              onChange={(e) => setMotivoVisita(e.target.value)}
              className={`w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 py-2.5 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                motivoVisita ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <option value="">Seleccione el motivo de su visita...</option>
              {MOTIVOS_VISITA_SUGERIDOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={OTRO_MOTIVO}>Otro motivo (especifique)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          {motivoVisita === OTRO_MOTIVO && (
            <input
              type="text"
              placeholder="Especifique el motivo de su visita"
              value={motivoOtro}
              onChange={(e) => setMotivoOtro(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          )}
        </div>

        {/* 5. Descargo de Responsabilidad (Expanded for better UX) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#0c3f69]">
            <FileText className="h-4 w-4 shrink-0 text-teal-600" />
            {config.titulo_descargo}
          </div>

          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-line shadow-2xs">
            {config.texto_descargo}
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-teal-200/70 bg-teal-50/50 p-3.5 hover:bg-teal-50 transition-colors">
            <input
              type="checkbox"
              checked={aceptoDescargo}
              onChange={(e) => setAceptoDescargo(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
              {config.checkbox_descargo_label}{" "}
              <span className="text-rose-500">*</span>
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0c3f69] to-teal-700 px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:from-[#0a3356] hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando visita...
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4" />
              Aceptar y Registrar Entrada
            </>
          )}
        </button>
      </form>
    </div>
  );
}
