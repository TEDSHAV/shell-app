"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  RotateCcw,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  DEFAULT_VISITANTES_CONFIG,
  type VisitantesConfig,
} from "@/features/visitantes/lib/visitantes-defaults";
import { saveVisitantesConfig } from "@/actions/visitantes";

interface VisitantesConfigModalProps {
  open: boolean;
  onClose: () => void;
  initialConfig: VisitantesConfig;
  updatedBy?: string | null;
  updatedAt?: string | null;
  onSaved: (newConfig: VisitantesConfig) => void;
}

export function VisitantesConfigModal({
  open,
  onClose,
  initialConfig,
  updatedBy,
  updatedAt,
  onSaved,
}: VisitantesConfigModalProps) {
  const [form, setForm] = useState<VisitantesConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialConfig);
      setError(null);
      setSuccess(false);
    }
  }, [open, initialConfig]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleResetDefaults = () => {
    setForm(DEFAULT_VISITANTES_CONFIG);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await saveVisitantesConfig(form);
    setSaving(false);

    if (res.ok && res.config) {
      setSuccess(true);
      onSaved(res.config);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 900);
    } else {
      setError(res.error || "No se pudo guardar la configuración.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#0c3f69]">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Configurar Descargo de Responsabilidad y Formulario QR
              </h2>
              <p className="text-[11px] text-slate-500">
                Personalice el texto legal y de seguridad que aceptan los visitantes al registrarse
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Configuración actualizada correctamente.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título del Formulario Público
              </label>
              <input
                type="text"
                required
                value={form.titulo_formulario}
                onChange={(e) =>
                  setForm({ ...form, titulo_formulario: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de Sede / Pie del QR de Recepción
              </label>
              <input
                type="text"
                required
                value={form.sede_nombre}
                onChange={(e) =>
                  setForm({ ...form, sede_nombre: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtítulo de Bienvenida
              </label>
              <input
                type="text"
                required
                value={form.subtitulo_formulario}
                onChange={(e) =>
                  setForm({ ...form, subtitulo_formulario: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título del Descargo / Normas de Visita
              </label>
              <input
                type="text"
                required
                value={form.titulo_descargo}
                onChange={(e) =>
                  setForm({ ...form, titulo_descargo: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Texto Completo del Descargo y Normas (se guarda copia en cada visita para auditoría)
            </label>
            <textarea
              rows={6}
              required
              value={form.texto_descargo}
              onChange={(e) =>
                setForm({ ...form, texto_descargo: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Texto de la Casilla de Aceptación (Checkbox)
            </label>
            <input
              type="text"
              required
              value={form.checkbox_descargo_label}
              onChange={(e) =>
                setForm({ ...form, checkbox_descargo_label: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          {updatedBy && (
            <p className="text-[11px] text-slate-400">
              Última edición por <strong>{updatedBy}</strong>
              {updatedAt
                ? ` el ${new Date(updatedAt).toLocaleString("es-VE", {
                    timeZone: "America/Caracas",
                  })}`
                : ""}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar predeterminado SHA
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0c3f69] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#092f50] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Guardar Cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
