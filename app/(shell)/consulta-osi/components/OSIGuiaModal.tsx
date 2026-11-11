"use client";

import { useEffect, useState } from "react";
import {
  X,
  Truck,
  Copy,
  Check,
  ExternalLink,
  PackageCheck,
  Calendar,
  Layers,
} from "lucide-react";
import type { OSIListItem } from "@/types/osi";

interface OSIGuiaModalProps {
  osi: OSIListItem | null;
  open: boolean;
  onClose: () => void;
}

function formatDate(isoDate?: string | null): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("es-VE", {
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

export default function OSIGuiaModal({
  osi,
  open,
  onClose,
}: OSIGuiaModalProps) {
  const [copiedGuia, setCopiedGuia] = useState<string | null>(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !osi) return null;

  const handleCopy = (guia: string) => {
    navigator.clipboard.writeText(guia);
    setCopiedGuia(guia);
    setTimeout(() => {
      setCopiedGuia(null);
    }, 2000);
  };

  const guias =
    osi.guias_envio && osi.guias_envio.length > 0
      ? osi.guias_envio
      : osi.nro_guia_zoom
      ? [{ nro_sesion: 1, guia: osi.nro_guia_zoom, fecha: null }]
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-linear-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs border border-indigo-200/60">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  Información de Envío
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  ZOOM
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-semibold text-gray-800">
                  OSI {osi.nro_osi}
                </span>
                {osi.nombre_empresa && ` · ${osi.nombre_empresa}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Service info banner */}
          {osi.servicio && (
            <div className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs flex items-center justify-between gap-2">
              <span className="text-gray-500 font-medium truncate">
                Servicio: <strong className="text-gray-800">{osi.servicio}</strong>
              </span>
              {osi.ciudad_ejecucion && (
                <span className="text-gray-600 font-medium shrink-0">
                  {osi.ciudad_ejecucion}
                </span>
              )}
            </div>
          )}

          {/* Guías list */}
          {guias.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              No hay número de guía registrado para esta OSI.
            </div>
          ) : (
            <div className="space-y-3">
              {guias.map((item, index) => {
                const isCopied = copiedGuia === item.guia;
                return (
                  <div
                    key={`${item.guia}-${index}`}
                    className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
                        <PackageCheck className="w-4 h-4 text-indigo-600" />
                        <span>Sobre de Certificados / Documentación</span>
                        {guias.length > 1 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            Sesión {item.nro_sesion}
                          </span>
                        )}
                      </div>
                      {item.fecha && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{formatDate(item.fecha)}</span>
                        </div>
                      )}
                    </div>

                    {/* Monospace Tracking Code Box */}
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-white border border-indigo-200/80 rounded-lg shadow-2xs">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider shrink-0">
                          N° Guía:
                        </span>
                        <span className="font-mono text-sm md:text-base font-bold text-gray-900 tracking-wider truncate selection:bg-indigo-100 selection:text-indigo-900">
                          {item.guia}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.guia)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            isCopied
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                          }`}
                          title="Copiar número de guía"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-700" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>

                        <a
                          href="https://www.grupozoom.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs"
                          title="Abrir portal de rastreo de ZOOM"
                        >
                          <span>Rastrear</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Help description */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
            <Layers className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              Este número de guía corresponde al envío final de documentación y certificados completado por el departamento de Capacitación. Puedes copiarlo o acceder al portal de ZOOM para rastrear el paquete.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
