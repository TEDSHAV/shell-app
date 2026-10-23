"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  ClipboardCheck,
  FileCheck,
  FileText,
  Loader2,
  Building2,
  User,
  Phone,
  Calendar,
} from "lucide-react";
import {
  searchOsisForEncuesta,
  generateEncuestaCliente,
  type EncuestaCliente,
  type GenerateEncuestaInput,
} from "@/actions/satisfaccion-clientes";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSurveyCreated?: (newEncuesta: EncuestaCliente) => void;
  initialOsi?: {
    id_osi?: number | null;
    nro_osi?: string | null;
    nombre_empresa?: string | null;
    servicio?: string | null;
    tipo_servicio?: string | null;
    ejecutivo_negocios?: string | null;
    id_ciudad?: number | null;
    ciudad_ejecucion?: string | null;
    fecha_servicio?: string | null;
  };
}

export function GenerateSurveyModal({
  isOpen,
  onClose,
  onSurveyCreated,
  initialOsi,
}: Props) {
  const [mode, setMode] = useState<"osi" | "manual">("osi");

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Selected OSI data
  const [selectedOsi, setSelectedOsi] = useState<any | null>(initialOsi || null);

  // Manual fields
  const [manualEmpresa, setManualEmpresa] = useState("");
  const [manualServicio, setManualServicio] = useState("");
  const [manualTipo, setManualTipo] = useState("Capacitación");
  const [manualEjecutivo, setManualEjecutivo] = useState("");
  const [manualOsi, setManualOsi] = useState("");

  // Contact details
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoCargo, setContactoCargo] = useState("");

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedEncuesta, setGeneratedEncuesta] = useState<EncuestaCliente | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialOsi) {
      setSelectedOsi(initialOsi);
      setMode("osi");
    }
  }, [initialOsi]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    setErrorMsg(null);
    try {
      const results = await searchOsisForEncuesta(searchTerm);
      setSearchResults(results);
    } catch {
      setErrorMsg("Error al buscar órdenes de servicio.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectOsi = (osi: any) => {
    setSelectedOsi(osi);
    setSearchResults([]);
    setSearchTerm("");
  };

  const handleGenerate = async () => {
    setErrorMsg(null);

    let payload: GenerateEncuestaInput;

    if (mode === "osi") {
      if (!selectedOsi) {
        setErrorMsg("Por favor busque y seleccione una OSI para continuar.");
        return;
      }
      payload = {
        id_osi: selectedOsi.id_osi || null,
        nro_osi: selectedOsi.nro_osi || "S/N",
        id_empresa: selectedOsi.id_empresa || null,
        nombre_empresa: selectedOsi.nombre_empresa || "",
        servicio: selectedOsi.servicio || "",
        tipo_servicio: selectedOsi.tipo_servicio || null,
        ejecutivo_negocios: selectedOsi.ejecutivo_negocios || null,
        id_ciudad: selectedOsi.id_ciudad || null,
        fecha_servicio: selectedOsi.fecha_inicio_real || selectedOsi.fecha_servicio || null,
        cliente_contacto_nombre: contactoNombre.trim() || null,
        cliente_contacto_telefono: contactoTelefono.trim() || null,
        cliente_contacto_email: contactoEmail.trim() || null,
        cliente_contacto_cargo: contactoCargo.trim() || null,
      };
    } else {
      if (!manualEmpresa.trim() || !manualServicio.trim()) {
        setErrorMsg("El nombre de la empresa y el servicio son obligatorios.");
        return;
      }
      payload = {
        nro_osi: manualOsi.trim() || "S/N",
        nombre_empresa: manualEmpresa.trim(),
        servicio: manualServicio.trim(),
        tipo_servicio: manualTipo.trim() || null,
        ejecutivo_negocios: manualEjecutivo.trim() || null,
        cliente_contacto_nombre: contactoNombre.trim() || null,
        cliente_contacto_telefono: contactoTelefono.trim() || null,
        cliente_contacto_email: contactoEmail.trim() || null,
        cliente_contacto_cargo: contactoCargo.trim() || null,
      };
    }

    setGenerating(true);

    const res = await generateEncuestaCliente(payload);
    setGenerating(false);

    if (res.ok && res.encuesta) {
      setGeneratedEncuesta(res.encuesta);
      onSurveyCreated?.(res.encuesta);
    } else {
      setErrorMsg(res.error || "Error al generar la encuesta.");
    }
  };

  const surveyUrl = generatedEncuesta
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/satisfaccion/${generatedEncuesta.token}`
    : "";

  const handleCopy = () => {
    if (!surveyUrl) return;
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getWhatsAppShareUrl = () => {
    if (!generatedEncuesta) return "";
    const nameGreeting = contactoNombre ? `Estimado(a) ${contactoNombre}` : `Estimado cliente de ${generatedEncuesta.nombre_empresa}`;
    const text = `${nameGreeting}, en SHA de Venezuela valoramos su opinión sobre nuestro servicio de ${generatedEncuesta.servicio}. Le agradecemos tomarse 2 minutos para responder nuestra breve encuesta de satisfacción:\n\n${surveyUrl}\n\n¡Muchas gracias por su preferencia!`;

    const cleanPhone = contactoTelefono.replace(/[^\d]/g, "");
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header (Clean style without aggressive dark blue) */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-none">
                {generatedEncuesta ? "Enlace de Encuesta Listo" : "Generar Encuesta de Satisfacción"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {generatedEncuesta
                  ? "Comparta el enlace con su cliente vía WhatsApp o copie la URL"
                  : "Cree un enlace para compartir con el cliente post-servicio"}
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

        {/* Scrollable Body Container (Always fits and scrolls smoothly) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
              <span className="font-bold">Error:</span> {errorMsg}
            </div>
          )}

          {generatedEncuesta ? (
            /* SUCCESS VIEW */
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Encuesta generada exitosamente
                    </h4>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      El cliente de <strong>{generatedEncuesta.nombre_empresa}</strong> podrá evaluarla directamente desde su teléfono o computador sin necesidad de iniciar sesión.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data pill */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1 text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">Cliente / Empresa:</span> {generatedEncuesta.nombre_empresa}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Servicio:</span> {generatedEncuesta.servicio}
                </div>
                {generatedEncuesta.nro_osi && generatedEncuesta.nro_osi !== "S/N" && (
                  <div>
                    <span className="font-semibold text-slate-900">Nro OSI:</span> {generatedEncuesta.nro_osi}
                  </div>
                )}
                {contactoNombre && (
                  <div>
                    <span className="font-semibold text-slate-900">Contacto:</span> {contactoNombre} {contactoCargo && `(${contactoCargo})`}
                  </div>
                )}
              </div>

              {/* URL Box */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Enlace directo para el cliente
                </label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <input
                    type="text"
                    readOnly
                    value={surveyUrl}
                    className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                      copied
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-xs"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copiar Enlace
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a
                  href={getWhatsAppShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Compartir por WhatsApp
                </a>

                <a
                  href={surveyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <ExternalLink className="h-4 w-4 text-emerald-600" />
                  Ver formulario del cliente
                </a>
              </div>
            </div>
          ) : (
            /* CREATION VIEW */
            <div className="space-y-4">
              {/* Mode Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode("osi")}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mode === "osi"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Desde una OSI (Recomendado)
                </button>
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mode === "manual"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Personalizada (Sin OSI)
                </button>
              </div>

              {/* Mode: OSI Selection */}
              {mode === "osi" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Orden de Servicio (OSI)
                  </label>

                  {selectedOsi ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white">
                            {selectedOsi.nro_osi}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {selectedOsi.nombre_empresa}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">{selectedOsi.servicio}</p>
                        {selectedOsi.ejecutivo_negocios && (
                          <p className="text-[11px] text-slate-400">
                            Ejecutivo: {selectedOsi.ejecutivo_negocios}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedOsi(null)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 border border-emerald-200 bg-white"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Escriba el Nro de OSI o Nombre de Empresa..."
                            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={searching || !searchTerm.trim()}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                        </button>
                      </form>

                      {searchResults.length > 0 && (
                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white shadow-xs">
                          {searchResults.map((item) => (
                            <button
                              key={item.id_osi}
                              type="button"
                              onClick={() => handleSelectOsi(item)}
                              className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{item.nro_osi}</span>
                                  <span className="font-semibold text-slate-800">{item.nombre_empresa}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">{item.servicio}</p>
                              </div>
                              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Seleccionar
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mode: Manual Creation */}
              {mode === "manual" && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Nombre de la Empresa <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualEmpresa}
                        onChange={(e) => setManualEmpresa(e.target.value)}
                        placeholder="Ej. Empresas Polar, C.A."
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Servicio Realizado <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualServicio}
                        onChange={(e) => setManualServicio(e.target.value)}
                        placeholder="Ej. Curso de Primeros Auxilios"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Tipo de Servicio</label>
                      <select
                        value={manualTipo}
                        onChange={(e) => setManualTipo(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="Capacitación">Capacitación</option>
                        <option value="Servicios Técnicos">Servicios Técnicos</option>
                        <option value="Consultoría / Auditoría">Consultoría / Auditoría</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Nro de Referencia / OSI</label>
                      <input
                        type="text"
                        value={manualOsi}
                        onChange={(e) => setManualOsi(e.target.value)}
                        placeholder="Ej. OSI-1234 (opcional)"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information (Optional) */}
              <div className="space-y-3 pt-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Datos del Contacto del Cliente (Opcional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-500">Nombre del contacto</label>
                    <input
                      type="text"
                      value={contactoNombre}
                      onChange={(e) => setContactoNombre(e.target.value)}
                      placeholder="Ej. Ing. Carlos Pérez"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500">Cargo / Departamento</label>
                    <input
                      type="text"
                      value={contactoCargo}
                      onChange={(e) => setContactoCargo(e.target.value)}
                      placeholder="Ej. Gerente de RRHH / SHA"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      value={contactoTelefono}
                      onChange={(e) => setContactoTelefono(e.target.value)}
                      placeholder="Ej. 04141234567"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500">Correo electrónico</label>
                    <input
                      type="email"
                      value={contactoEmail}
                      onChange={(e) => setContactoEmail(e.target.value)}
                      placeholder="Ej. cperez@empresa.com"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer (Always visible at the bottom) */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {generatedEncuesta ? "Cerrar" : "Cancelar"}
          </button>
          {!generatedEncuesta && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || (mode === "osi" && !selectedOsi)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando enlace...
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4" />
                  Generar Enlace
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
