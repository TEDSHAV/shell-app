"use client";

import { X } from "lucide-react";

import { ACCION_UI, acciones_por_permiso } from "../../lib/acciones";
import type { AccionSesion, PermisosSesion } from "../../lib/types";
import AccionIcono from "../AccionIcono";

type BarraLoteProps = {
  cantidad: number;
  /** "sesión"/"sesiones" en el calendario, "OSI"/"OSIs" en Consulta. */
  unidad: [singular: string, plural: string];
  permisos: PermisosSesion;
  onAccion: (accion: AccionSesion) => void;
  onLimpiar: () => void;
};

/** Barra flotante abajo con las acciones del lote. Aparece cuando hay algo seleccionado. */
export default function BarraLote({ cantidad, unidad, permisos, onAccion, onLimpiar }: BarraLoteProps) {
  if (!cantidad) return null;
  const acciones = acciones_por_permiso(permisos);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div
        role="toolbar"
        aria-label="Acciones para la selección"
        className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur duration-200 animate-in fade-in slide-in-from-bottom-4"
      >
        <span className="px-2 text-sm font-semibold text-slate-900">
          {cantidad} {cantidad === 1 ? unidad[0] : unidad[1]}
        </span>
        <span className="h-6 w-px bg-slate-200" aria-hidden />
        {acciones.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onAccion(a)}
            className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-sm font-semibold transition ${ACCION_UI[a].color}`}
          >
            <AccionIcono accion={a} className="h-4 w-4" />
            {ACCION_UI[a].titulo}
          </button>
        ))}
        <button type="button" onClick={onLimpiar} aria-label="Quitar selección" title="Quitar selección" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
