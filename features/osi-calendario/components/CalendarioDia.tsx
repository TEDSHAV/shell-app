"use client";

import { CalendarX2 } from "lucide-react";

import { DIAS_SEMANA, fechas_entre, inicio_semana, sumar_dias } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import AgendaItem from "./AgendaItem";

type CalendarioDiaProps = {
  dia: string;
  hoy: string;
  eventosPorFecha: Map<string, EventoCalendario[]>;
  onDia: (fecha: string) => void;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
};

/** Un día: tira de la semana para saltar entre días y, debajo, las sesiones a todo el ancho, una debajo de otra. */
export default function CalendarioDia({ dia, hoy, eventosPorFecha, onDia, onSelect, onComments }: CalendarioDiaProps) {
  const lunes = inicio_semana(dia);
  const semana = fechas_entre(lunes, sumar_dias(lunes, 6));
  const eventos = eventosPorFecha.get(dia) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-1 rounded-xl bg-slate-50 p-1">
        {semana.map((fecha, i) => {
          const n = eventosPorFecha.get(fecha)?.length ?? 0;
          const sel = fecha === dia;
          return (
            <button
              key={fecha}
              type="button"
              onClick={() => onDia(fecha)}
              aria-pressed={sel}
              aria-label={`${DIAS_SEMANA[i]} ${Number(fecha.slice(8))}: ${n} ${n === 1 ? "sesión" : "sesiones"}`}
              className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition ${sel ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-white/70"}`}
            >
              <span className={`text-[11px] font-medium ${sel ? "text-slate-900" : "text-slate-500"}`}>{DIAS_SEMANA[i]}</span>
              <span
                className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-semibold ${
                  fecha === hoy ? "bg-slate-900 text-white" : sel ? "text-slate-900" : "text-slate-700"
                }`}
              >
                {Number(fecha.slice(8))}
              </span>
              <span className={`h-3.5 text-[10px] tabular-nums ${n ? "text-slate-500" : "text-transparent"}`}>{n || 0}</span>
            </button>
          );
        })}
      </div>

      {eventos.length ? (
        <div className="flex flex-col gap-2.5">
          {eventos.map((e) => (
            <AgendaItem key={e.id_sesion} evento={e} onSelect={onSelect} onComments={onComments} detallada />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <CalendarX2 className="h-6 w-6 text-slate-300" />
          <p className="text-sm text-slate-500">No hay sesiones este día con los filtros elegidos.</p>
        </div>
      )}
    </div>
  );
}
