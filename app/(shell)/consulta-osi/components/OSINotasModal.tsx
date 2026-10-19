"use client";

import { useState, useEffect } from "react";
import { X, Send, Trash2, StickyNote, Loader2 } from "lucide-react";
import type { OSIListItem, OsiNota } from "@/types/osi";
import { addOsiNota, deleteOsiNota } from "@/actions/osi";

interface OSINotasModalProps {
  osi: OSIListItem | null;
  open: boolean;
  onClose: () => void;
  onNotasUpdated: (osiId: number, updatedNotas: OsiNota[]) => void;
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

export default function OSINotasModal({
  osi,
  open,
  onClose,
  onNotasUpdated,
}: OSINotasModalProps) {
  const [notas, setNotas] = useState<OsiNota[]>([]);
  const [newNota, setNewNota] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (osi?.notas) {
      setNotas(osi.notas);
    } else {
      setNotas([]);
    }
    setNewNota("");
    setError(null);
  }, [osi]);

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

  const handleAddNota = async () => {
    if (!newNota.trim() || !osi.id_osi) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await addOsiNota(osi.id_osi, newNota);
      if (res.success && res.data) {
        const updated = [res.data, ...notas];
        setNotas(updated);
        onNotasUpdated(osi.id_osi, updated);
        setNewNota("");
      } else {
        setError(res.error ?? "Error al guardar la nota");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNota = async (notaId: number) => {
    if (!osi.id_osi) return;
    setDeletingId(notaId);
    setError(null);

    try {
      const res = await deleteOsiNota(notaId);
      if (res.success) {
        const updated = notas.filter((n) => n.id !== notaId);
        setNotas(updated);
        onNotasUpdated(osi.id_osi, updated);
      } else {
        setError(res.error ?? "Error al eliminar la nota");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Notas y observaciones
              </h2>
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">OSI {osi.nro_osi}</span>
                {osi.nombre_empresa && ` · ${osi.nombre_empresa}`}
                {osi.servicio && ` · ${osi.servicio}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {notas.length > 0 ? (
            notas.map((nota) => (
              <div
                key={nota.id}
                className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-xs hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-900">
                      {nota.autorNombre || "Usuario"}
                    </span>
                    <span className="text-[11px] text-gray-400">·</span>
                    <span className="text-[11px] text-gray-500">
                      {formatRelativeDate(nota.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteNota(nota.id)}
                    disabled={deletingId === nota.id}
                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Eliminar nota"
                  >
                    {deletingId === nota.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {nota.nota}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <StickyNote className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">
                No hay notas u observaciones para esta OSI
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Puedes registrar motivos de reagendamiento, estatus de ejecución o cualquier detalle relevante del servicio.
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-200">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* New Note Form */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-col gap-2">
            <textarea
              value={newNota}
              onChange={(e) => setNewNota(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleAddNota();
                }
              }}
              placeholder="Escribe una nota u observación (Ctrl+Enter para guardar)..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
              rows={3}
              disabled={submitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                {newNota.length}/2000 caracteres
              </span>
              <button
                type="button"
                onClick={() => void handleAddNota()}
                disabled={!newNota.trim() || submitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Guardar nota</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
