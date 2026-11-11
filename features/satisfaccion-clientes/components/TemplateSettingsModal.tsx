"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Save,
  RotateCcw,
  Check,
  Loader2,
  FileText,
  MessageCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import {
  getPlantillaSatisfaccion,
  savePlantillaSatisfaccion,
} from "@/actions/satisfaccion-clientes";
import {
  DEFAULT_PLANTILLA_SATISFACCION,
  type PlantillaSatisfaccion,
} from "../lib/plantilla-defaults";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (plantilla: PlantillaSatisfaccion) => void;
}

export function TemplateSettingsModal({ isOpen, onClose, onSaved }: Props) {
  const [template, setTemplate] = useState<PlantillaSatisfaccion>(DEFAULT_PLANTILLA_SATISFACCION);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "q1" | "q2" | "q3" | "whatsapp">("general");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setErrorMsg(null);
    getPlantillaSatisfaccion()
      .then((data) => {
        setTemplate(data || DEFAULT_PLANTILLA_SATISFACCION);
      })
      .catch((err) => {
        console.error("Error loading template:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm("¿Desea restablecer todas las preguntas y textos a sus valores predeterminados?")) {
      setTemplate(DEFAULT_PLANTILLA_SATISFACCION);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    const res = await savePlantillaSatisfaccion(template);
    setSaving(false);

    if (res.ok) {
      setSavedSuccess(true);
      onSaved?.(template);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.error || "Error al guardar la plantilla.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-xs">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-none">
                Configuración de Plantilla de Encuesta
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Personalice los títulos, preguntas, escalas y plantilla del mensaje para clientes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="shrink-0 flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 px-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "general"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Encabezado y Saludo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("q1")}
            className={`py-3 px-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "q1"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            P1: Calidad
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("q2")}
            className={`py-3 px-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "q2"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            P2: Atención
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("q3")}
            className={`py-3 px-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === "q3"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            P3: Fidelidad
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`py-3 px-3 font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "whatsapp"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Mensaje WhatsApp
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
              <p className="mt-2 text-xs">Cargando plantilla...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: General Header & Greeting */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-slate-800">
                      Título Principal de la Encuesta
                    </label>
                    <input
                      type="text"
                      value={template.titulo_encuesta}
                      onChange={(e) =>
                        setTemplate({ ...template, titulo_encuesta: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Saludo y Subtítulo de Bienvenida</span>
                      <span className="text-[11px] font-normal text-slate-400">
                        Variable: &#123;empresa&#125;
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={template.subtitulo_encuesta}
                      onChange={(e) =>
                        setTemplate({ ...template, subtitulo_encuesta: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none resize-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      La etiqueta <code>&#123;empresa&#125;</code> será reemplazada automáticamente por el nombre del cliente.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: Question 1 (Calidad) */}
              {activeTab === "q1" && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-slate-800">Título de la Pregunta 1</label>
                    <input
                      type="text"
                      value={template.pregunta_1_titulo}
                      onChange={(e) =>
                        setTemplate({ ...template, pregunta_1_titulo: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800">Pregunta al Cliente</label>
                    <textarea
                      rows={2}
                      value={template.pregunta_1_texto}
                      onChange={(e) =>
                        setTemplate({ ...template, pregunta_1_texto: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="font-bold text-slate-800">
                      Etiquetas de las Opciones (Escala 1 a 5)
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[5, 4, 3, 2, 1].map((val) => {
                        const key = `opt${val}` as keyof typeof template.pregunta_1_opciones;
                        return (
                          <div key={val} className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                              {val}
                            </span>
                            <input
                              type="text"
                              value={template.pregunta_1_opciones[key]}
                              onChange={(e) =>
                                setTemplate({
                                  ...template,
                                  pregunta_1_opciones: {
                                    ...template.pregunta_1_opciones,
                                    [key]: e.target.value,
                                  },
                                })
                              }
                              className="flex-1 rounded-lg border border-slate-300 p-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Question 2 (Atención) */}
              {activeTab === "q2" && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-slate-800">Título de la Pregunta 2</label>
                    <input
                      type="text"
                      value={template.pregunta_2_titulo}
                      onChange={(e) =>
                        setTemplate({ ...template, pregunta_2_titulo: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800">Pregunta al Cliente</label>
                    <textarea
                      rows={2}
                      value={template.pregunta_2_texto}
                      onChange={(e) =>
                        setTemplate({ ...template, pregunta_2_texto: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="font-bold text-slate-800">
                      Etiquetas de las Opciones (Escala 1 a 5)
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[5, 4, 3, 2, 1].map((val) => {
                        const key = `opt${val}` as keyof typeof template.pregunta_2_opciones;
                        return (
                          <div key={val} className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                              {val}
                            </span>
                            <input
                              type="text"
                              value={template.pregunta_2_opciones[key]}
                              onChange={(e) =>
                                setTemplate({
                                  ...template,
                                  pregunta_2_opciones: {
                                    ...template.pregunta_2_opciones,
                                    [key]: e.target.value,
                                  },
                                })
                              }
                              className="flex-1 rounded-lg border border-slate-300 p-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Question 3 (Fidelidad) */}
              {activeTab === "q3" && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-slate-800">Título de la Pregunta 3</label>
                    <input
                      type="text"
                      value={template.pregunta_3_titulo}
                      onChange={(e) =>
                        setTemplate({ ...template, pregunta_3_titulo: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800">Pregunta y Escala al Cliente</label>
                    <textarea
                      rows={3}
                      value={template.pregunta_3_texto}
                      onChange={(e) =>
                        setTemplate({ ...template, pregunta_3_texto: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none resize-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      La escala estándar de Fidelidad va de 0 (Nada probable) a 10 (Altamente probable).
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 5: WhatsApp Template */}
              {activeTab === "whatsapp" && (
                <div className="space-y-4">
                  <div>
                    <label className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Plantilla de Mensaje para WhatsApp</span>
                      <span className="text-[11px] font-normal text-slate-400">
                        Variables disponibles
                      </span>
                    </label>
                    <textarea
                      rows={8}
                      value={template.mensaje_whatsapp_plantilla}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          mensaje_whatsapp_plantilla: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-800 focus:border-emerald-500 focus:outline-none resize-none font-mono"
                    />
                    <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1">
                      <span className="font-bold text-slate-800">Variables que se reemplazan al enviar:</span>
                      <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">&#123;contacto&#125;</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">&#123;empresa&#125;</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">&#123;servicio&#125;</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">&#123;enlace&#125;</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer valores predeterminados
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all ${
                savedSuccess
                  ? "bg-emerald-600"
                  : "bg-sky-600 hover:bg-sky-500"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  ¡Guardado!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Plantilla
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
