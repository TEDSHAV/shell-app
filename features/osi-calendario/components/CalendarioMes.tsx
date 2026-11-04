"use client";

import { useState } from "react";

import { DIAS_SEMANA, es_fin_de_semana, semanas_del_mes } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import EventoChip from "./EventoChip";

const VISIBLES = 3;

type CalendarioMesProps = {
  mes: string;
  hoy: string;
  eventosPorFecha: Map<string, EventoCalendario[]>;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
  onVerSemana: (fecha: string) => void;
};

export default function CalendarioMes({ mes, hoy, eventosPorFecha, onSelect, onComments, onVerSemana }: CalendarioMesProps) {
  const [abiertos, set_abiertos] = useState<Set<string>>(new Set());
  const semanas = semanas_del_mes(mes);

  const alternar = (fecha: string) =>
    set_abiertos((prev) => {
      const next = new Set(prev);
      if (next.has(fecha)) next.delete(fecha);
      else next.add(fecha);
      return next;
    });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[840px] overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DIAS_SEMANA.map((d, i) => (
            <div key={d} className={`py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${i >= 5 ? "text-slate-400" : "text-slate-500"}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {semanas.flat().map(({ fecha, en_mes }, i) => {
            const eventos = eventosPorFecha.get(fecha) ?? [];
            const abierto = abiertos.has(fecha);
            const visibles = abierto ? eventos : eventos.slice(0, VISIBLES);
            const ocultos = eventos.length - visibles.length;
            const es_hoy = fecha === hoy;
            const fondo = !en_mes ? "bg-slate-50/70" : es_fin_de_semana(fecha) ? "bg-slate-50/40" : "bg-white";
            return (
              <div
                key={fecha}
                className={`group/dia flex min-h-[8.5rem] flex-col gap-1 border-slate-200 p-1.5 ${fondo} ${i % 7 !== 6 ? "border-r" : ""} ${i < semanas.length * 7 - 7 ? "border-b" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onVerSemana(fecha)}
                    title="Ver esta semana por horas"
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[13px] font-semibold transition ${
                      es_hoy ? "bg-sky-600 text-white shadow-sm" : en_mes ? "text-slate-700 hover:bg-slate-100" : "text-slate-300"
                    }`}
                  >
                    {Number(fecha.slice(8))}
                  </button>
                  {eventos.length > 1 ? (
                    <span className="text-[10px] font-medium text-slate-400">{eventos.length} sesiones</span>
                  ) : null}
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
                    className="mt-auto self-start rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-50"
                  >
                    {abierto ? "Ver menos" : `+${ocultos} más`}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
