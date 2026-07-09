"use client";

import type { OSIListItem } from "@/types/osi";
import { X, MessageSquare, Sparkles } from "lucide-react";

interface OSICommentsSidebarProps {
  osi: OSIListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OSICommentsSidebar({
  osi,
  isOpen,
  onClose,
}: OSICommentsSidebarProps) {
  if (!osi) return null;

  return (
    <div
      className={`flex flex-col h-full shrink-0 bg-white border-l border-gray-200 shadow-sm transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen ? "w-96 opacity-100" : "w-0 opacity-0"
      }`}
    >
      {isOpen && (
        <div className="flex flex-col h-full w-96">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 shrink-0">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {osi.nro_osi || "OSI"}
                </p>
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase mt-0.5"
                  style={{
                    backgroundColor: `${osi.status_color}20`,
                    color: osi.status_color,
                  }}
                >
                  {osi.status_name}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-700 shrink-0"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Comments section */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
              <div className="relative mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <MessageSquare className="w-8 h-8 text-blue-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                No hay comentarios aún
              </p>
              <p className="text-xs text-gray-500 max-w-[220px] leading-relaxed">
                Los comentarios y menciones con @ estarán disponibles próximamente en esta sección.
              </p>
            </div>
          </div>

          {/* Comment input placeholder */}
          <div className="border-t border-gray-200 p-3 bg-gray-50/50">
            <div className="relative">
              <textarea
                disabled
                placeholder="Escribe un comentario..."
                className="w-full px-3 py-2 pr-16 border border-gray-200 rounded-lg text-sm text-gray-400 bg-white resize-none focus:outline-none"
                rows={2}
              />
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
                <Sparkles className="w-2.5 h-2.5" />
                Próximamente
              </span>
            </div>
            <div className="flex justify-end mt-2">
              <button
                disabled
                className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-medium cursor-not-allowed"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
