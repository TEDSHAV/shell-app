"use client";

import { useState } from "react";

import { DIAS_SEMANA, semanas_del_mes } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import EventoChip from "./EventoChip";

const VISIBLES = 3;

type CalendarioMesProps = {
  mes: string;
  hoy: string;
  eventosPorFecha: Map<string, EventoCalendario[]>;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
};

/** Grilla mensual de escritorio (lunes primero), con etiquetas por sesión. */
export default function CalendarioMes({ mes, hoy, eventosPorFecha, onSelect, onComments }: CalendarioMesProps) {
  const [abiertos, set_abiertos] = useState<Set<string>>(new Set());
  const semanas = semanas_del_mes(mes);
  const dias = semanas.flat();

  const alternar = (fecha: string) =>
    set_abiertos((prev) => {
      const next = new Set(prev);
      if (next.has(fecha)) next.delete(fecha);
      else next.add(fecha);
      return next;
    });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-medium text-slate-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map(({ fecha, en_mes }, i) => {
          const eventos = eventosPorFecha.get(fecha) ?? [];
          const abierto = abiertos.has(fecha);
          const visibles = abierto ? eventos : eventos.slice(0, VISIBLES);
          const ocultos = eventos.length - visibles.length;
          const es_hoy = fecha === hoy;
          const dia = Number(fecha.slice(8));
          return (
            <div
              key={fecha}
              className={`flex min-h-[7.5rem] flex-col gap-1 border-slate-200 p-1.5 ${en_mes ? "bg-white" : "bg-slate-50/80"} ${i % 7 !== 6 ? "border-r" : ""} ${i < dias.length - 7 ? "border-b" : ""}`}
            >
              <div className="flex justify-end">
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                    es_hoy ? "bg-slate-900 text-white" : en_mes ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {dia}
                </span>
              </div>
              <div className={`flex flex-col gap-1 ${en_mes ? "" : "opacity-60"}`}>
                {visibles.map((e) => (
                  <EventoChip key={e.id_sesion} evento={e} onSelect={onSelect} onComments={onComments} />
                ))}
              </div>
              {ocultos > 0 || abierto ? (
                <button
                  type="button"
                  onClick={() => alternar(fecha)}
                  className="mt-auto self-start rounded px-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {abierto ? "Ver menos" : `+${ocultos} más`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
