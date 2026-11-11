"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type SelectorMesProps = {
  /** Mes elegido, 'YYYY-MM'. */
  mes: string;
  hoy: string;
  onSelect: (mes: string) => void;
  onClose: () => void;
};

/** Calendario anual para saltar a un mes: año con flechas y los 12 meses en una grilla. */
export default function SelectorMes({ mes, hoy, onSelect, onClose }: SelectorMesProps) {
  const [anio, set_anio] = useState(() => Number(mes.slice(0, 4)));
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) onClose();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [onClose]);

  const mes_hoy = hoy.slice(0, 7);

  return (
    <div ref={caja} role="dialog" aria-label="Elegir mes" className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => set_anio((a) => a - 1)} aria-label="Año anterior" className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{anio}</span>
        <button type="button" onClick={() => set_anio((a) => a + 1)} aria-label="Año siguiente" className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MESES.map((nombre, i) => {
          const valor = `${anio}-${String(i + 1).padStart(2, "0")}`;
          const sel = valor === mes;
          return (
            <button
              key={valor}
              type="button"
              onClick={() => onSelect(valor)}
              aria-pressed={sel}
              className={`rounded-lg py-2 text-sm capitalize transition ${
                sel ? "bg-slate-900 font-semibold text-white" : valor === mes_hoy ? "font-bold text-sky-700 hover:bg-slate-100" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}
