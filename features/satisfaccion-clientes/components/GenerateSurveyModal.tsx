"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  ClipboardCheck,
  Building2,
  User,
  Phone,
  Mail,
  Briefcase,
  Loader2,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Plus,
} from "lucide-react";
import {
  searchOsisForEncuesta,
  getOsiDetailsForEncuesta,
  searchEmpresasForEncuesta,
  generateEncuestaCliente,
  getEjecutivosNegocios,
  type EncuestaCliente,
  type GenerateEncuestaInput,
  type OsiSearchResult,
  type EmpresaSearchResult,
} from "@/actions/satisfaccion-clientes";
import { normalizePhoneNumber, formatWhatsAppPhone } from "../lib/plantilla-defaults";
import { ShareWhatsAppModal } from "./ShareWhatsAppModal";

const DEFAULT_EJECUTIVOS = [
  "Liliana Montero",
  "Katerine Serrano",
  "Yuliana Rosas",
  "Aliannys Rodriguez",
];

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

  // Combobox state for OSI search
  const [osiQuery, setOsiQuery] = useState("");
  const [osiResults, setOsiResults] = useState<OsiSearchResult[]>([]);
  const [searchingOsi, setSearchingOsi] = useState(false);
  const [showOsiDropdown, setShowOsiDropdown] = useState(false);
  const osiComboboxRef = useRef<HTMLDivElement>(null);

  // Combobox state for Manual Empresa search
  const [empresaQuery, setEmpresaQuery] = useState("");
  const [empresaResults, setEmpresaResults] = useState<EmpresaSearchResult[]>([]);
  const [searchingEmpresa, setSearchingEmpresa] = useState(false);
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const empresaComboboxRef = useRef<HTMLDivElement>(null);

  // Selected OSI and extracted data
  const [selectedOsi, setSelectedOsi] = useState<OsiSearchResult | null>(null);

  // Editable fields (pre-filled from OSI / Empresa, but user can freely modify)
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [servicioNombre, setServicioNombre] = useState("");
  const [tipoServicio, setTipoServicio] = useState("Capacitación");
  const [ejecutivoNegocios, setEjecutivoNegocios] = useState("");
  const [ejecutivosOptions, setEjecutivosOptions] = useState<string[]>(DEFAULT_EJECUTIVOS);
  const [nroOsiInput, setNroOsiInput] = useState("");

  // Contact details
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoCargo, setContactoCargo] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactSource, setContactSource] = useState<string | null>(null);

  useEffect(() => {
    getEjecutivosNegocios()
      .then((list) => {
        if (list && list.length > 0) {
          setEjecutivosOptions(list);
        }
      })
      .catch((err) => console.error("Error loading ejecutivos:", err));
  }, []);

  // Workflow state
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedEncuesta, setGeneratedEncuesta] = useState<EncuestaCliente | null>(null);
  const [copied, setCopied] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const resetFormState = () => {
    setGeneratedEncuesta(null);
    setErrorMsg(null);
    setCopied(false);
    setIsWhatsAppModalOpen(false);
    setSelectedOsi(null);
    setOsiQuery("");
    setOsiResults([]);
    setShowOsiDropdown(false);
    setEmpresaQuery("");
    setEmpresaResults([]);
    setShowEmpresaDropdown(false);
    setEmpresaNombre("");
    setServicioNombre("");
    setTipoServicio("Capacitación");
    setEjecutivoNegocios("");
    setNroOsiInput("");
    setContactoNombre("");
    setContactoCargo("");
    setContactoTelefono("");
    setContactoEmail("");
    setContactSource(null);
    setMode("osi");
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetFormState();
    }
  }, [isOpen]);

  // Handle ESC key to close modal (if WhatsApp submodal is not open)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isWhatsAppModalOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isWhatsAppModalOpen]);

  // Load initial OSI if provided
  useEffect(() => {
    if (isOpen && initialOsi && initialOsi.id_osi) {
      setMode("osi");
      // Fetch rich details & contact info
      getOsiDetailsForEncuesta(initialOsi.id_osi).then((details) => {
        if (details) {
          applyOsiSelection(details);
        } else {
          // Fallback to initial props
          setSelectedOsi({
            id_osi: initialOsi.id_osi!,
            nro_osi: initialOsi.nro_osi || "S/N",
            nombre_empresa: initialOsi.nombre_empresa || "",
            servicio: initialOsi.servicio || "",
            tipo_servicio: initialOsi.tipo_servicio || "Capacitación",
            ejecutivo_negocios: initialOsi.ejecutivo_negocios || null,
            id_ciudad: initialOsi.id_ciudad || null,
            id_estado: null,
            fecha_inicio_real: initialOsi.fecha_servicio || null,
          });
          setEmpresaNombre(initialOsi.nombre_empresa || "");
          setServicioNombre(initialOsi.servicio || "");
          setTipoServicio(initialOsi.tipo_servicio || "Capacitación");
          setEjecutivoNegocios(initialOsi.ejecutivo_negocios || "");
          setNroOsiInput(initialOsi.nro_osi || "S/N");
        }
      });
    }
  }, [isOpen, initialOsi]);

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (osiComboboxRef.current && !osiComboboxRef.current.contains(event.target as Node)) {
        setShowOsiDropdown(false);
      }
      if (empresaComboboxRef.current && !empresaComboboxRef.current.contains(event.target as Node)) {
        setShowEmpresaDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for OSI Combobox
  useEffect(() => {
    if (mode !== "osi" || !osiQuery.trim() || osiQuery.trim().length < 2) {
      setOsiResults([]);
      setShowOsiDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingOsi(true);
      try {
        const results = await searchOsisForEncuesta(osiQuery);
        setOsiResults(results);
        setShowOsiDropdown(true);
      } catch (err) {
        console.error("Error searching OSIs:", err);
      } finally {
        setSearchingOsi(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [osiQuery, mode]);

  // Debounced search for Empresa Combobox in manual mode
  useEffect(() => {
    if (mode !== "manual" || !empresaQuery.trim() || empresaQuery.trim().length < 2) {
      setEmpresaResults([]);
      setShowEmpresaDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingEmpresa(true);
      try {
        const results = await searchEmpresasForEncuesta(empresaQuery);
        setEmpresaResults(results);
        setShowEmpresaDropdown(true);
      } catch (err) {
        console.error("Error searching Empresas:", err);
      } finally {
        setSearchingEmpresa(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [empresaQuery, mode]);

  const applyOsiSelection = (osi: OsiSearchResult) => {
    setSelectedOsi(osi);
    setOsiQuery("");
    setShowOsiDropdown(false);

    // Auto-fill editable fields
    setEmpresaNombre(osi.nombre_empresa);
    setServicioNombre(osi.servicio);
    setTipoServicio(osi.tipo_servicio || "Capacitación");
    setEjecutivoNegocios(osi.ejecutivo_negocios || "");
    setNroOsiInput(osi.nro_osi);

    // Auto-fill contact details pulled from OSI
    if (osi.persona_contacto) setContactoNombre(osi.persona_contacto);
    if (osi.contacto_cargo) setContactoCargo(osi.contacto_cargo);
    if (osi.contacto_telefono) setContactoTelefono(normalizePhoneNumber(osi.contacto_telefono));
    if (osi.contacto_email) setContactoEmail(osi.contacto_email);

    if (osi.persona_contacto || osi.contacto_telefono || osi.contacto_email) {
      setContactSource(`OSI #${osi.nro_osi}`);
    } else {
      setContactSource(null);
    }
  };

  const applyEmpresaSelection = (empresa: EmpresaSearchResult) => {
    setEmpresaNombre(empresa.nombre_empresa);
    setEmpresaQuery(empresa.nombre_empresa);
    setShowEmpresaDropdown(false);

    if (empresa.contacto_nombre) setContactoNombre(empresa.contacto_nombre);
    if (empresa.contacto_cargo) setContactoCargo(empresa.contacto_cargo);
    if (empresa.contacto_telefono) setContactoTelefono(normalizePhoneNumber(empresa.contacto_telefono));
    if (empresa.contacto_email) setContactoEmail(empresa.contacto_email);

    if (empresa.contacto_nombre || empresa.contacto_telefono || empresa.contacto_email) {
      setContactSource(`Ficha de ${empresa.nombre_empresa}`);
    }
  };

  const resetSelection = () => {
    setSelectedOsi(null);
    setOsiQuery("");
    setEmpresaNombre("");
    setServicioNombre("");
    setEjecutivoNegocios("");
    setNroOsiInput("");
    setContactoNombre("");
    setContactoCargo("");
    setContactoTelefono("");
    setContactoEmail("");
    setContactSource(null);
  };

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setErrorMsg(null);

    if (!empresaNombre.trim()) {
      setErrorMsg("El nombre de la empresa es obligatorio.");
      return;
    }
    if (!servicioNombre.trim()) {
      setErrorMsg("El nombre del servicio es obligatorio.");
      return;
    }

    const payload: GenerateEncuestaInput = {
      id_osi: selectedOsi?.id_osi || null,
      nro_osi: selectedOsi?.nro_osi || nroOsiInput.trim() || "S/N",
      id_empresa: selectedOsi?.id_empresa || null,
      nombre_empresa: empresaNombre.trim(),
      servicio: servicioNombre.trim(),
      tipo_servicio: tipoServicio.trim() || null,
      ejecutivo_negocios: ejecutivoNegocios.trim() || null,
      id_ciudad: selectedOsi?.id_ciudad || null,
      id_estado: selectedOsi?.id_estado || null,
      fecha_servicio: selectedOsi?.fecha_inicio_real || null,
      cliente_contacto_nombre: contactoNombre.trim() || null,
      cliente_contacto_telefono: contactoTelefono ? normalizePhoneNumber(contactoTelefono) : null,
      cliente_contacto_email: contactoEmail.trim() || null,
      cliente_contacto_cargo: contactoCargo.trim() || null,
    };

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

    const cleanPhone = formatWhatsAppPhone(contactoTelefono);
    if (cleanPhone) {
      return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
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
              <h3 className="text-base font-bold text-slate-900 leading-none">
                {generatedEncuesta ? "Enlace de Encuesta Listo" : "Generar Encuesta de Satisfacción"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {generatedEncuesta
                  ? "Comparta el enlace con su cliente vía WhatsApp o copie la URL"
                  : "Busque una OSI o escriba una empresa para sugerencias automáticas"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
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
                      El cliente de <strong>{generatedEncuesta.nombre_empresa}</strong> podrá responderla de inmediato sin iniciar sesión.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Pill */}
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
                    <span className="font-semibold text-slate-900">Contacto asignado:</span> {contactoNombre} {contactoCargo && `(${contactoCargo})`}
                  </div>
                )}
                {contactoTelefono && (
                  <div>
                    <span className="font-semibold text-slate-900">Teléfono:</span> {contactoTelefono}
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
                <button
                  type="button"
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Compartir por WhatsApp
                </button>

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
            /* CREATION VIEW WITH COMBOBOX */
            <div className="space-y-4">
              {/* Mode Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode("osi");
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mode === "osi"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Desde una OSI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("manual");
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mode === "manual"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Personalizada (Sin OSI)
                </button>
              </div>

              {/* MODE 1: OSI COMBOBOX */}
              {mode === "osi" && (
                <div className="space-y-3">
                  {!selectedOsi ? (
                    <div ref={osiComboboxRef} className="relative space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                        <span>Buscar Orden de Servicio (OSI) o Empresa</span>
                        <span className="text-[11px] font-normal normal-case text-slate-400">
                          Escriba Nro de OSI, Cliente o Servicio
                        </span>
                      </label>

                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={osiQuery}
                          onChange={(e) => setOsiQuery(e.target.value)}
                          onFocus={() => {
                            if (osiResults.length > 0) setShowOsiDropdown(true);
                          }}
                          placeholder="Comience a escribir... (Ej. 3512, Polar, Primeros Auxilios)"
                          className="w-full rounded-xl border border-slate-300 pl-9 pr-9 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                        />
                        {searchingOsi ? (
                          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-emerald-600" />
                        ) : (
                          <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        )}
                      </div>

                      {/* OSI Suggestions Dropdown */}
                      {showOsiDropdown && (
                        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                          {osiResults.length > 0 ? (
                            osiResults.map((item) => (
                              <button
                                key={item.id_osi}
                                type="button"
                                onClick={() => applyOsiSelection(item)}
                                className="w-full p-3 text-left hover:bg-emerald-50/60 transition-colors flex items-start justify-between gap-3 text-xs group"
                              >
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="rounded bg-slate-900 group-hover:bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white transition-colors">
                                      {item.nro_osi}
                                    </span>
                                    <span className="font-bold text-slate-900 truncate">
                                      {item.nombre_empresa}
                                    </span>
                                    {item.tipo_servicio && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                        {item.tipo_servicio}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-600 line-clamp-1">
                                    {item.servicio}
                                  </p>
                                  {(item.persona_contacto || item.contacto_telefono) && (
                                    <p className="text-[11px] text-emerald-700 flex items-center gap-2 font-medium">
                                      {item.persona_contacto && (
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" /> {item.persona_contacto}
                                          {item.contacto_cargo && ` (${item.contacto_cargo})`}
                                        </span>
                                      )}
                                      {item.contacto_telefono && (
                                        <span className="flex items-center gap-1 text-slate-500">
                                          <Phone className="h-3 w-3" /> {item.contacto_telefono}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                                <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                                  Vincular
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-slate-500">
                              No se encontraron órdenes de servicio con ese término.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Selected OSI Header Badge with Reset */
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white">
                            {selectedOsi.nro_osi}
                          </span>
                          <span className="text-xs font-bold text-emerald-950">
                            OSI Vinculada Exitosamente
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800">
                          Datos extraídos automáticamente. Puede revisar o editar los campos abajo según necesite.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetSelection}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 border border-emerald-300 bg-white shadow-2xs transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Cambiar OSI
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: MANUAL WITH EMPRESA COMBOBOX */}
              {mode === "manual" && (
                <div ref={empresaComboboxRef} className="relative space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Nombre de la Empresa / Cliente <span className="text-rose-500">*</span></span>
                    <span className="text-[11px] font-normal normal-case text-slate-400">
                      Sugerencias de clientes registrados al escribir
                    </span>
                  </label>

                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={empresaNombre}
                      onChange={(e) => {
                        setEmpresaNombre(e.target.value);
                        setEmpresaQuery(e.target.value);
                      }}
                      onFocus={() => {
                        if (empresaResults.length > 0) setShowEmpresaDropdown(true);
                      }}
                      placeholder="Ej. Cervecería Polar, Alimentos Heinz, Cargill..."
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-9 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                    {searchingEmpresa ? (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-emerald-600" />
                    ) : (
                      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    )}
                  </div>

                  {/* Empresa suggestions dropdown */}
                  {showEmpresaDropdown && empresaResults.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                      {empresaResults.map((emp) => (
                        <button
                          key={emp.id_empresa}
                          type="button"
                          onClick={() => applyEmpresaSelection(emp)}
                          className="w-full p-2.5 text-left hover:bg-emerald-50/60 transition-colors flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{emp.nombre_empresa}</span>
                            {emp.contacto_nombre && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Contacto sugerido: {emp.contacto_nombre} {emp.contacto_cargo && `(${emp.contacto_cargo})`}
                              </p>
                            )}
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

              {/* EDITABLE SERVICE DETAILS (Works for both OSI and Manual) */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Datos del Servicio Realizado
                  </h4>
                  {selectedOsi && (
                    <span className="text-[11px] text-slate-400">Editable si desea ajustar</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mode === "osi" && (
                    <div>
                      <label className="text-xs font-medium text-slate-700">
                        Empresa / Cliente <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={empresaNombre}
                        onChange={(e) => setEmpresaNombre(e.target.value)}
                        placeholder="Nombre de la empresa"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className={mode === "manual" ? "sm:col-span-2" : ""}>
                    <label className="text-xs font-medium text-slate-700">
                      Servicio Realizado <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={servicioNombre}
                      onChange={(e) => setServicioNombre(e.target.value)}
                      placeholder="Ej. Curso de Primeros Auxilios / Inspección de Andamios"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700">Tipo de Servicio</label>
                    <select
                      value={tipoServicio}
                      onChange={(e) => setTipoServicio(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Capacitación">Capacitación</option>
                      <option value="Servicios Técnicos">Servicios Técnicos</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      Ejecutivo de Negocios
                    </label>
                    <select
                      value={ejecutivoNegocios}
                      onChange={(e) => setEjecutivoNegocios(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Seleccionar Ejecutivo...</option>
                      {ejecutivoNegocios && !ejecutivosOptions.includes(ejecutivoNegocios) && (
                        <option value={ejecutivoNegocios}>{ejecutivoNegocios}</option>
                      )}
                      {ejecutivosOptions.map((ejec) => (
                        <option key={ejec} value={ejec}>
                          {ejec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* EDITABLE CONTACT DETAILS */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Datos del Contacto del Cliente
                    </h4>
                  </div>
                  {contactSource ? (
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-600" /> Precargado de {contactSource}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Opcional pero recomendado para WhatsApp
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" /> Nombre del contacto
                    </label>
                    <input
                      type="text"
                      value={contactoNombre}
                      onChange={(e) => setContactoNombre(e.target.value)}
                      placeholder="Ej. Ing. Carlos Pérez"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-slate-400" /> Cargo / Departamento
                    </label>
                    <input
                      type="text"
                      value={contactoCargo}
                      onChange={(e) => setContactoCargo(e.target.value)}
                      placeholder="Ej. Gerente de RRHH / SHA"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> Teléfono / WhatsApp
                      </span>
                      {contactoTelefono && (
                        <span className="text-[10px] text-emerald-700 font-mono font-medium">
                          {contactoTelefono}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={contactoTelefono}
                      onChange={(e) => setContactoTelefono(e.target.value.replace(/[^\d+]/g, ""))}
                      onBlur={() => setContactoTelefono(normalizePhoneNumber(contactoTelefono))}
                      placeholder="Ej. 04141234567"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" /> Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={contactoEmail}
                      onChange={(e) => setContactoEmail(e.target.value)}
                      placeholder="Ej. cperez@empresa.com"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <div
          className={`shrink-0 flex items-center border-t border-slate-200 bg-slate-50/80 px-6 py-4 ${
            generatedEncuesta ? "justify-between" : "justify-end gap-3"
          }`}
        >
          {generatedEncuesta ? (
            <>
              <button
                type="button"
                onClick={resetFormState}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                Crear otra encuesta
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !empresaNombre.trim() || !servicioNombre.trim()}
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
            </>
          )}
        </div>
      </div>

      <ShareWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        encuesta={
          generatedEncuesta
            ? {
                token: generatedEncuesta.token,
                nombre_empresa: generatedEncuesta.nombre_empresa,
                servicio: generatedEncuesta.servicio,
                nro_osi: generatedEncuesta.nro_osi,
                cliente_contacto_nombre: contactoNombre,
                cliente_contacto_telefono: contactoTelefono,
              }
            : null
        }
      />
    </div>
  );
}
