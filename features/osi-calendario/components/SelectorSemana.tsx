"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DIAS_SEMANA, etiqueta_mes, mover_mes, semanas_del_mes, sumar_dias } from "../lib/mes-grid";

type SelectorSemanaProps = {
  /** Lunes de la semana elegida. */
  lunes: string;
  hoy: string;
  onSelect: (lunes: string) => void;
  onClose: () => void;
};

/** Mini calendario para saltar a una semana: cada fila es una semana; se resalta al pasar el mouse. */
export default function SelectorSemana({ lunes, hoy, onSelect, onClose }: SelectorSemanaProps) {
  // Abre en el mes del jueves: una semana que cruza de mes se ve donde caen la mayoría de sus días.
  const [mes, set_mes] = useState(() => sumar_dias(lunes, 3).slice(0, 7));
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

  const semanas = semanas_del_mes(mes);

  return (
    <div
      ref={caja}
      role="dialog"
      aria-label="Elegir semana"
      className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => set_mes((m) => mover_mes(m, -1))} aria-label="Mes anterior" className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize text-slate-900">{etiqueta_mes(mes)}</span>
        <button type="button" onClick={() => set_mes((m) => mover_mes(m, 1))} aria-label="Mes siguiente" className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 pb-1">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="text-center text-[11px] font-medium text-slate-400">
            {d.slice(0, 1)}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {semanas.map((semana) => {
          const inicio = semana[0].fecha;
          const sel = inicio === lunes;
          return (
            <button
              key={inicio}
              type="button"
              onClick={() => onSelect(inicio)}
              aria-pressed={sel}
              aria-label={`Semana del ${Number(inicio.slice(8))}`}
              className={`grid grid-cols-7 rounded-lg py-1 transition ${sel ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
            >
              {semana.map(({ fecha, en_mes }) => (
                <span
                  key={fecha}
                  className={`text-center text-sm tabular-nums ${
                    sel ? "text-white" : fecha === hoy ? "font-bold text-sky-700" : en_mes ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  {Number(fecha.slice(8))}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

