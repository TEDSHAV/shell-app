"use client";

import { createContext, useContext } from "react";
import { Check } from "lucide-react";

/** Modo selección del calendario: las etiquetas lo leen para pintarse marcadas y no abrir el detalle. */
export const SeleccionContext = createContext<{ activa: boolean; tiene: (id: number) => boolean }>({
  activa: false,
  tiene: () => false,
});

export function useEstadoSeleccion(id: number): { activa: boolean; marcada: boolean } {
  const s = useContext(SeleccionContext);
  return { activa: s.activa, marcada: s.activa && s.tiene(id) };
}

/** Círculo de marcado en la esquina de una etiqueta o tarjeta. */
export function MarcaSeleccion({ marcada }: { marcada: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute -left-1.5 -top-1.5 z-10 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 shadow-sm transition ${
        marcada ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white"
      }`}
    >
      {marcada ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}
