"use client";

import { MessageSquare } from "lucide-react";

import { empresa_y_sede, ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { hora_corta } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";

type EventoChipProps = {
  evento: EventoCalendario;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
};

export function BurbujaComentarios({ evento, onComments, className = "" }: { evento: EventoCalendario; onComments: (e: EventoCalendario) => void; className?: string }) {
  const n = evento.comentarios_count;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onComments(evento);
      }}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-white hover:text-emerald-700 ${className}`}
      title={n ? `Comentarios (${n})` : "Comentarios"}
      aria-label={n ? `Abrir ${n} comentarios de la OSI` : "Abrir comentarios de la OSI"}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      {n > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
          {n > 9 ? "9+" : n}
        </span>
      ) : null}
    </button>
  );
}

/** Etiqueta de una sesión en la grilla del mes: servicio, empresa y sede, hora. */
export default function EventoChip({ evento, onSelect, onComments }: EventoChipProps) {
  const ui = ESTADO_UI[evento.estado];
  const { empresa, sede } = empresa_y_sede(evento.nombre_empresa);
  const hora = hora_corta(hora_efectiva(evento));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(evento)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(evento);
        }
      }}
      title={`${evento.servicio ?? ""}\n${empresa}${sede ? ` · ${sede}` : ""}\n${ui.etiqueta}`}
      className={`group flex w-full cursor-pointer items-start gap-1 rounded-md border-l-[3px] py-1 pl-1.5 pr-0.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 ${ui.suave} ${ui.barra}`}
    >
      <span className="min-w-0 flex-1">
        <span className={`line-clamp-2 text-[11.5px] font-semibold leading-[1.15rem] ${ui.texto} ${evento.estado === "cancelada" ? "line-through decoration-rose-300" : ""}`}>
          {evento.servicio ?? "Servicio"}
        </span>
        <span className="block truncate text-[11px] leading-4 text-slate-600">
          {empresa}
          {sede ? <span className="text-slate-400"> · {sede}</span> : null}
        </span>
        <span className="block text-[10.5px] leading-4 text-slate-500">
          {hora ?? "Sin hora"}
          {evento.total_sesiones > 1 ? ` · Sesión ${evento.nro_sesion}/${evento.total_sesiones}` : ""}
        </span>
      </span>
      <BurbujaComentarios evento={evento} onComments={onComments} className={evento.comentarios_count ? "" : "opacity-0 group-hover:opacity-100"} />
    </div>
  );
}
