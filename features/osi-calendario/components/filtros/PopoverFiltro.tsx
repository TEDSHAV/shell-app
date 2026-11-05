"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type PopoverFiltroProps = {
  /** Texto del botón sin valor ("Todas las ciudades") y con valor ("Valencia"). */
  vacio: string;
  valor: string | null;
  icono: React.ReactNode;
  onLimpiar: () => void;
  /** Placeholder del buscador. */
  buscar: string;
  texto: string;
  onTexto: (t: string) => void;
  /** Al cerrar (fuera, Escape o al elegir) se avisa para volver al primer paso. */
  onCerrar?: () => void;
  children: (cerrar: () => void) => React.ReactNode;
  ancho?: string;
};

/** Botón de filtro con lista desplegable y buscador. Base de todos los filtros del panel. */
export default function PopoverFiltro({ vacio, valor, icono, onLimpiar, buscar, texto, onTexto, onCerrar, children, ancho = "sm:w-[22rem]" }: PopoverFiltroProps) {
  const [abierto, set_abierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const cerrar = () => {
    set_abierto(false);
    onTexto("");
    onCerrar?.();
  };

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && cerrar();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={caja} className="relative min-w-0">
      <div className={`flex h-10 w-full items-center rounded-lg border bg-white text-sm ${valor ? "border-slate-900" : "border-slate-200"}`}>
        <button
          type="button"
          onClick={() => (abierto ? cerrar() : set_abierto(true))}
          aria-expanded={abierto}
          className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left text-slate-700"
        >
          <span className="shrink-0 text-slate-400">{icono}</span>
          <span className={`min-w-0 flex-1 truncate ${valor ? "font-medium text-slate-900" : ""}`}>{valor ?? vacio}</span>
          {!valor ? <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${abierto ? "rotate-180" : ""}`} /> : null}
        </button>
        {valor ? (
          <button type="button" onClick={onLimpiar} aria-label={`Quitar filtro: ${valor}`} className="mr-1 rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {abierto ? (
        <div className={`absolute left-0 right-0 top-11 z-30 flex max-h-[24rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${ancho} sm:right-auto`}>
          <label className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={texto}
              onChange={(e) => onTexto(e.target.value)}
              placeholder={buscar}
              className="h-9 w-full rounded-lg bg-slate-50 pl-9 pr-3 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
            />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children(cerrar)}</div>
        </div>
      ) : null}
    </div>
  );
}

/** Fila de una lista de filtro. */
export function OpcionFiltro({ activa, onClick, children, extra }: { activa: boolean; onClick: () => void; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${activa ? "bg-sky-50 font-medium text-sky-900" : "text-slate-700"}`}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {extra}
    </button>
  );
}

export function SinResultados({ texto = "Nada coincide con la búsqueda." }: { texto?: string }) {
  return <p className="px-3 py-6 text-center text-sm text-slate-500">{texto}</p>;
}

/** Coincidencia sin acentos ni mayúsculas. */
export function coincide(valor: string, texto: string): boolean {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return norm(valor).includes(norm(texto.trim()));
}
