"use client";

import { empresa_y_sede, ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { hora_corta } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import { useContext } from "react";

import { se_puede_facturar } from "../lib/factura";
import { BurbujaComentarios } from "./EventoChip";
import { BotonFactura, IndicadorCertificado, PuedeFacturarContext, UbicacionSesion } from "./IndicadoresOSI";
import { MarcaSeleccion, useEstadoSeleccion } from "./lote/seleccion-context";

type AgendaItemProps = {
  evento: EventoCalendario;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
  /** Texto en la columna de la izquierda; por defecto la hora. */
  lateral?: string;
  arrastrable?: boolean;
  onArrastre?: (evento: EventoCalendario | null) => void;
  /** Vista por día: ancho completo, con ejecutivo y orden de compra, e indicadores a la derecha. */
  detallada?: boolean;
};

/** Tarjeta de agenda (teléfono y lista de reagendadas sin fecha). */
export default function AgendaItem({ evento, onSelect, onComments, lateral, arrastrable: arrastrable_prop = false, onArrastre, detallada = false }: AgendaItemProps) {
  const { activa: seleccionando, marcada } = useEstadoSeleccion(evento.id_sesion);
  const arrastrable = arrastrable_prop && !seleccionando;
  const ui = ESTADO_UI[evento.estado];
  const { empresa, sede } = empresa_y_sede(evento.nombre_empresa);
  const hora = lateral ?? hora_corta(hora_efectiva(evento)) ?? "Sin hora";
  const puede_facturar = useContext(PuedeFacturarContext);
  const indicadores =
    evento.certificados > 0 || evento.factura || se_puede_facturar(evento, puede_facturar) ? (
      <>
        <IndicadorCertificado evento={evento} variante="etiqueta" />
        <BotonFactura evento={evento} variante="etiqueta" />
      </>
    ) : null;

  return (
    <div className="flex gap-3">
      <span className={`${detallada ? "w-[4.5rem] sm:w-24 sm:text-sm" : "w-[4.5rem]"} shrink-0 pt-3 text-right text-[13px] font-medium tabular-nums text-slate-500`}>{hora}</span>
      <div
        role="button"
        tabIndex={0}
        draggable={arrastrable}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(evento.id_sesion));
          onArrastre?.(evento);
        }}
        onDragEnd={() => onArrastre?.(null)}
        title={arrastrable ? "Arrástrala a un día del calendario para darle fecha" : undefined}
        onClick={() => onSelect(evento)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(evento);
          }
        }}
        aria-pressed={seleccionando ? marcada : undefined}
        className={`relative flex min-w-0 flex-1 ${arrastrable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} items-start gap-2 rounded-xl border-l-4 p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 ${ui.suave} ${ui.barra} ${marcada ? "ring-2 ring-sky-500" : ""}`}
      >
        {seleccionando ? <MarcaSeleccion marcada={marcada} /> : null}
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-semibold leading-snug ${ui.texto} ${evento.estado === "cancelada" ? "line-through decoration-rose-300" : ""}`}>
            {evento.servicio ?? "Servicio"}
          </p>
          <p className={`mt-0.5 text-sm text-slate-700 ${detallada ? "" : "truncate"}`}>
            {empresa}
            {detallada && sede ? <span className="text-slate-500"> · {sede}</span> : null}
          </p>
          {sede && !detallada ? <p className="truncate text-[13px] text-slate-500">{sede}</p> : null}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className={`rounded-full px-2 py-0.5 font-medium ${ui.pill}`}>{ui.etiqueta}</span>
            <span>OSI {evento.nro_osi ?? evento.id_osi}</span>
            <UbicacionSesion evento={evento} />
            {evento.total_sesiones > 1 ? <span>Sesión {evento.nro_sesion}/{evento.total_sesiones}</span> : null}
            {detallada && evento.ejecutivo_negocios ? <span>Ejecutivo: {evento.ejecutivo_negocios}</span> : null}
            {detallada && evento.ordenes_compra.length ? <span>OC {evento.ordenes_compra.join(", ")}</span> : null}
          </p>
          {indicadores ? <div className={`mt-2 flex flex-wrap items-center gap-1.5 ${detallada ? "sm:hidden" : ""}`}>{indicadores}</div> : null}
        </div>
        {detallada && indicadores ? <div className="hidden shrink-0 flex-col items-end gap-1.5 self-center sm:flex">{indicadores}</div> : null}
        <BurbujaComentarios evento={evento} onComments={onComments} />
      </div>
    </div>
  );
}
