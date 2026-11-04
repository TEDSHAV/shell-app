"use client";

import { useState } from "react";

import { DIAS_SEMANA, fechas_entre, fecha_larga, sumar_dias } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import AgendaItem from "./AgendaItem";
import EventoChip from "./EventoChip";

type CalendarioSemanaProps = {
  lunes: string;
  hoy: string;
  eventosPorFecha: Map<string, EventoCalendario[]>;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
  arrastrando: EventoCalendario | null;
  puedeArrastrar: (evento: EventoCalendario) => boolean;
  onArrastre: (evento: EventoCalendario | null) => void;
  onSoltar: (evento: EventoCalendario, fecha: string) => void;
};

/**
 * Semana de lunes a domingo. Escritorio: siete columnas con las sesiones apiladas por hora, sin recortes.
 * Teléfono: los días uno debajo del otro, cada uno con sus tarjetas.
 */
export default function CalendarioSemana({ lunes, hoy, eventosPorFecha, onSelect, onComments, arrastrando, puedeArrastrar, onArrastre, onSoltar }: CalendarioSemanaProps) {
  const [destino, set_destino] = useState<string | null>(null);
  const dias = fechas_entre(lunes, sumar_dias(lunes, 6));

  const soltable = (fecha: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!arrastrando) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (destino !== fecha) set_destino(fecha);
    },
    onDragLeave: () => set_destino((d) => (d === fecha ? null : d)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      set_destino(null);
      if (arrastrando) onSoltar(arrastrando, fecha);
    },
  });

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:grid md:grid-cols-7">
        {dias.map((fecha, i) => {
          const eventos = eventosPorFecha.get(fecha) ?? [];
          const es_hoy = fecha === hoy;
          const sobre = destino === fecha && !!arrastrando;
          return (
            <div
              key={fecha}
              {...soltable(fecha)}
              className={`flex min-h-[26rem] min-w-0 flex-col transition-colors ${i < 6 ? "border-r border-slate-200" : ""} ${
                sobre ? "bg-violet-50 ring-2 ring-inset ring-violet-400" : i >= 5 ? "bg-slate-50/60" : "bg-white"
              }`}
            >
              <div className="flex flex-col items-center gap-1 border-b border-slate-200 py-3">
                <span className={`text-sm font-medium ${es_hoy ? "text-slate-900" : "text-slate-500"}`}>{DIAS_SEMANA[i]}</span>
                <span
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-lg font-semibold ${
                    es_hoy ? "bg-slate-900 text-white" : "text-slate-800"
                  }`}
                >
                  {Number(fecha.slice(8))}
                </span>
                <span className="text-xs text-slate-400">
                  {eventos.length ? `${eventos.length} ${eventos.length === 1 ? "sesión" : "sesiones"}` : " "}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {eventos.map((e) => (
                  <EventoChip
                    key={e.id_sesion}
                    evento={e}
                    onSelect={onSelect}
                    onComments={onComments}
                    arrastrable={puedeArrastrar(e)}
                    onArrastre={onArrastre}
                    expandida
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {dias.map((fecha) => {
          const eventos = eventosPorFecha.get(fecha) ?? [];
          return (
            <section key={fecha}>
              <h4 className={`mb-2 flex items-baseline gap-2 text-sm font-semibold capitalize ${fecha === hoy ? "text-sky-700" : "text-slate-900"}`}>
                {fecha_larga(fecha)}
                {fecha === hoy ? <span className="rounded-full bg-sky-100 px-2 text-[11px] font-medium normal-case text-sky-800">Hoy</span> : null}
                <span className="font-normal normal-case text-slate-400">
                  {eventos.length ? `${eventos.length} ${eventos.length === 1 ? "sesión" : "sesiones"}` : "Sin sesiones"}
                </span>
              </h4>
              {eventos.length ? (
                <div className="flex flex-col gap-2">
                  {eventos.map((e) => (
                    <AgendaItem key={e.id_sesion} evento={e} onSelect={onSelect} onComments={onComments} />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
