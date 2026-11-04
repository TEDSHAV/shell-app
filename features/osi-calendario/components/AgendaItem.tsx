"use client";

import { empresa_y_sede, ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { hora_corta } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import { BurbujaComentarios } from "./EventoChip";

type AgendaItemProps = {
  evento: EventoCalendario;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
  /** Texto en la columna de la izquierda; por defecto la hora. */
  lateral?: string;
};

/** Tarjeta de agenda (teléfono y lista de reagendadas sin fecha). */
export default function AgendaItem({ evento, onSelect, onComments, lateral }: AgendaItemProps) {
  const ui = ESTADO_UI[evento.estado];
  const { empresa, sede } = empresa_y_sede(evento.nombre_empresa);
  const hora = lateral ?? hora_corta(hora_efectiva(evento)) ?? "Sin hora";

  return (
    <div className="flex gap-3">
      <span className="w-16 shrink-0 pt-3 text-right text-xs font-medium tabular-nums text-slate-500">{hora}</span>
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
        className={`flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-xl border-l-4 p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 ${ui.suave} ${ui.barra}`}
      >
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug ${ui.texto} ${evento.estado === "cancelada" ? "line-through decoration-rose-300" : ""}`}>
            {evento.servicio ?? "Servicio"}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-slate-700">{empresa}</p>
          {sede ? <p className="truncate text-xs text-slate-500">{sede}</p> : null}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
            <span className={`rounded-full px-2 py-0.5 font-medium ${ui.pill}`}>{ui.etiqueta}</span>
            <span>OSI {evento.nro_osi ?? evento.id_osi}</span>
            {evento.total_sesiones > 1 ? <span>Sesión {evento.nro_sesion}/{evento.total_sesiones}</span> : null}
          </p>
        </div>
        <BurbujaComentarios evento={evento} onComments={onComments} />
      </div>
    </div>
  );
}
