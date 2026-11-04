"use client";

import { Check, Clock, MessageSquare, Repeat, X } from "lucide-react";

import { ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { hora_corta } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";

type EventoChipProps = {
  evento: EventoCalendario;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
  /** Bloque de la vista semana: ocupa todo el alto de su franja. */
  bloque?: boolean;
};

function IconoEstado({ evento }: { evento: EventoCalendario }) {
  const clase = `h-3 w-3 shrink-0 ${ESTADO_UI[evento.estado].texto}`;
  if (evento.estado === "ejecutada") return <Check className={clase} strokeWidth={3} />;
  if (evento.estado === "no_ejecutada") return <X className={clase} strokeWidth={3} />;
  if (evento.reagenda_count > 0) return <Repeat className={clase} strokeWidth={2.5} />;
  return <Clock className={clase} strokeWidth={2.5} />;
}

export default function EventoChip({ evento, onSelect, onComments, bloque = false }: EventoChipProps) {
  const ui = ESTADO_UI[evento.estado];
  const hora = hora_corta(hora_efectiva(evento));
  const sesion = evento.total_sesiones > 1 ? `Sesión ${evento.nro_sesion}/${evento.total_sesiones}` : "Sesión única";
  const titulo = [`OSI ${evento.nro_osi ?? evento.id_osi}`, evento.nombre_empresa, evento.servicio, sesion, hora, ui.etiqueta]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      role="button"
      tabIndex={0}
      title={titulo}
      onClick={() => onSelect(evento)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(evento);
        }
      }}
      className={`group relative flex w-full cursor-pointer flex-col gap-0.5 overflow-hidden rounded-md border-l-[3px] py-1 pl-1.5 pr-1 text-left shadow-sm outline-none ring-1 ring-black/5 transition focus-visible:ring-2 focus-visible:ring-sky-500 ${ui.chip} ${ui.barra} ${bloque ? "h-full" : ""}`}
    >
      <span className="flex items-center gap-1 text-[11px] leading-4">
        <IconoEstado evento={evento} />
        <span className={`font-semibold tabular-nums ${ui.texto}`}>{hora ?? "Sin hora"}</span>
        <span className="ml-auto flex items-center gap-1">
          {evento.reagenda_count > 1 ? (
            <span className="rounded bg-orange-100 px-1 text-[10px] font-semibold text-orange-700" title={`Reagendada ${evento.reagenda_count} veces`}>
              ×{evento.reagenda_count}
            </span>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onComments(evento);
            }}
            className={`relative inline-flex items-center rounded p-0.5 transition hover:bg-white hover:text-green-700 ${evento.comentarios_count ? "text-slate-600" : "text-slate-300 opacity-0 group-hover:opacity-100"}`}
            title={evento.comentarios_count ? `Comentarios (${evento.comentarios_count})` : "Comentarios"}
            aria-label="Abrir comentarios de la OSI"
          >
            <MessageSquare className="h-3 w-3" />
            {evento.comentarios_count > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sky-600 px-0.5 text-[9px] font-bold leading-none text-white">
                {evento.comentarios_count > 9 ? "9+" : evento.comentarios_count}
              </span>
            ) : null}
          </button>
        </span>
      </span>
      <span className="truncate text-[12px] font-semibold leading-4 text-slate-900">{evento.nombre_empresa ?? "Sin empresa"}</span>
      <span className="flex items-center gap-1 text-[10.5px] leading-4 text-slate-500">
        <span className="font-medium text-slate-700">OSI {evento.nro_osi ?? evento.id_osi}</span>
        {evento.total_sesiones > 1 ? <span>· S{evento.nro_sesion}/{evento.total_sesiones}</span> : null}
      </span>
    </div>
  );
}
