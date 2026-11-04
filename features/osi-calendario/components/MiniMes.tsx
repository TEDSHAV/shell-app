"use client";

import { ESTADO_UI } from "../lib/estado-sesion";
import { DIAS_SEMANA, semanas_del_mes } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";

type MiniMesProps = {
  mes: string;
  hoy: string;
  seleccion: string;
  eventosPorFecha: Map<string, EventoCalendario[]>;
  onSeleccion: (fecha: string) => void;
};

/** Mes compacto para teléfono: un punto por estado presente en el día; al tocar, se ve la agenda del día. */
export default function MiniMes({ mes, hoy, seleccion, eventosPorFecha, onSeleccion }: MiniMesProps) {
  return (
    <div className="grid grid-cols-7 gap-y-1">
      {DIAS_SEMANA.map((d) => (
        <div key={d} className="pb-1 text-center text-xs font-medium text-slate-400">
          {d.slice(0, 1)}
        </div>
      ))}
      {semanas_del_mes(mes)
        .flat()
        .map(({ fecha, en_mes }) => {
          const eventos = eventosPorFecha.get(fecha) ?? [];
          const estados = [...new Set(eventos.map((e) => e.estado))].slice(0, 3);
          const sel = fecha === seleccion;
          const es_hoy = fecha === hoy;
          return (
            <button
              key={fecha}
              type="button"
              onClick={() => onSeleccion(fecha)}
              aria-pressed={sel}
              aria-label={`${fecha}${eventos.length ? `, ${eventos.length} sesiones` : ""}`}
              className="flex flex-col items-center gap-0.5 py-0.5"
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-medium transition ${
                  sel ? "bg-slate-900 text-white" : es_hoy ? "bg-slate-100 text-slate-900 ring-1 ring-slate-300" : en_mes ? "text-slate-800" : "text-slate-300"
                }`}
              >
                {Number(fecha.slice(8))}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {estados.map((e) => (
                  <span key={e} className={`h-1.5 w-1.5 rounded-full ${ESTADO_UI[e].punto}`} />
                ))}
              </span>
            </button>
          );
        })}
    </div>
  );
}
