"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";

import { empresa_y_sede, ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { hora_corta } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";

type EventoChipProps = {
  evento: EventoCalendario;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
  arrastrable?: boolean;
  onArrastre?: (evento: EventoCalendario | null) => void;
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
      <MessageSquare className="h-4 w-4" />
      {n > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {n > 9 ? "9+" : n}
        </span>
      ) : null}
    </button>
  );
}

/** Tarjeta flotante al pasar el mouse: OSI, servicio, empresa, sede, hora y estado. Posición fija para no cortarse en la grilla. */
function TarjetaHover({ evento, rect, arrastrable }: { evento: EventoCalendario; rect: DOMRect; arrastrable: boolean }) {
  const ui = ESTADO_UI[evento.estado];
  const { empresa, sede } = empresa_y_sede(evento.nombre_empresa);
  const hora = hora_corta(hora_efectiva(evento));
  const ancho = 300;
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - ancho / 2), window.innerWidth - ancho - 8);
  const arriba = rect.top > 220;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[65] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
      style={{ width: ancho, left, ...(arriba ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-bold text-slate-900">OSI {evento.nro_osi ?? evento.id_osi}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ui.pill}`}>{ui.etiqueta}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-800">{evento.servicio}</p>
      <p className="mt-0.5 text-[13px] text-slate-600">{empresa}</p>
      {sede ? <p className="text-xs text-slate-500">Sede {sede}</p> : null}
      <p className="mt-1.5 text-xs text-slate-500">
        {hora ?? "Sin hora"}
        {evento.total_sesiones > 1 ? ` · Sesión ${evento.nro_sesion} de ${evento.total_sesiones}` : ""}
        {evento.en_sha ? " · En SHA" : ""}
      </p>
      {arrastrable ? <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400">Arrástrala a otro día para reagendar</p> : null}
    </div>
  );
}

/** Etiqueta de una sesión en la grilla del mes: servicio, empresa y sede, hora. Arrastrable si se puede reagendar. */
export default function EventoChip({ evento, onSelect, onComments, arrastrable = false, onArrastre }: EventoChipProps) {
  const ui = ESTADO_UI[evento.estado];
  const { empresa, sede } = empresa_y_sede(evento.nombre_empresa);
  const hora = hora_corta(hora_efectiva(evento));
  const [rect, set_rect] = useState<DOMRect | null>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={arrastrable}
      onDragStart={(e) => {
        set_rect(null);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(evento.id_sesion));
        onArrastre?.(evento);
      }}
      onDragEnd={() => onArrastre?.(null)}
      onMouseEnter={(e) => set_rect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => set_rect(null)}
      onClick={() => {
        set_rect(null);
        onSelect(evento);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(evento);
        }
      }}
      aria-label={`OSI ${evento.nro_osi ?? evento.id_osi}: ${evento.servicio ?? ""}, ${empresa}`}
      className={`group relative flex w-full flex-col gap-0.5 rounded-md border-l-[3px] py-1.5 pl-2 pr-1.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 ${arrastrable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${ui.suave} ${ui.barra}`}
    >
      <span className={`line-clamp-2 text-[13px] font-semibold leading-[1.3rem] ${ui.texto} ${evento.estado === "cancelada" ? "line-through decoration-rose-300" : ""}`}>
        {evento.servicio ?? "Servicio"}
      </span>
      <span className="truncate text-[12px] leading-[1.15rem] text-slate-600">
        {empresa}
        {sede ? <span className="text-slate-400"> · {sede}</span> : null}
      </span>
      <span className="flex items-center gap-1 text-[12px] leading-[1.15rem] text-slate-500">
        <span className="shrink-0 whitespace-nowrap tabular-nums">{hora ?? "Sin hora"}</span>
        {evento.en_sha ? (
          <span className="shrink-0 rounded bg-white/80 px-1 text-[10px] font-semibold uppercase leading-4 tracking-wide text-slate-500 ring-1 ring-slate-200" title="Se dicta en SHA">
            SHA
          </span>
        ) : null}
        {evento.total_sesiones > 1 ? (
          <span className="ml-auto min-w-0 truncate text-[11px] tabular-nums text-slate-400" title={`Sesión ${evento.nro_sesion} de ${evento.total_sesiones}`}>
            S{evento.nro_sesion}/{evento.total_sesiones}
          </span>
        ) : null}
      </span>
      {evento.comentarios_count > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComments(evento);
          }}
          title={`Comentarios (${evento.comentarios_count})`}
          aria-label={`Abrir ${evento.comentarios_count} comentarios de la OSI`}
          className="absolute -right-2 -top-2 inline-flex h-5 items-center gap-0.5 rounded-full bg-sky-600 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white transition hover:bg-sky-700"
        >
          <MessageSquare className="h-3 w-3" strokeWidth={2.5} />
          {evento.comentarios_count > 9 ? "9+" : evento.comentarios_count}
        </button>
      ) : null}
      {rect ? <TarjetaHover evento={evento} rect={rect} arrastrable={arrastrable} /> : null}
    </div>
  );
}
