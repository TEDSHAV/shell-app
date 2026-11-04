"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, MapPin, MessageSquare, Repeat, User, XCircle } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getReagendasSesion } from "../actions/calendario-actions";
import { ESTADO_UI } from "../lib/estado-sesion";
import { fecha_larga, hora_corta } from "../lib/mes-grid";
import type { AccionSesion, EventoCalendario, ReagendaHistorial } from "../lib/types";
import OsiPreviewBox from "./OsiPreviewBox";

type EventoDetalleProps = {
  evento: EventoCalendario | null;
  mes: string;
  puedeGestionar: boolean;
  onClose: () => void;
  onAccion: (evento: EventoCalendario, accion: AccionSesion) => void;
  onComments: (evento: EventoCalendario) => void;
};

function Fecha({ titulo, fecha, hora, tono }: { titulo: string; fecha: string | null; hora?: string | null; tono: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tono}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{titulo}</p>
        <p className="text-sm font-semibold capitalize text-slate-900">
          {fecha ? fecha_larga(fecha) : "Por confirmar"}
          {fecha && hora ? <span className="font-normal normal-case text-slate-600"> · {hora_corta(hora)}</span> : null}
        </p>
      </div>
    </div>
  );
}

export default function EventoDetalle({ evento, mes, puedeGestionar, onClose, onAccion, onComments }: EventoDetalleProps) {
  const [reagendas, set_reagendas] = useState<ReagendaHistorial[]>([]);

  useEffect(() => {
    set_reagendas([]);
    if (!evento || evento.reagenda_count === 0) return;
    let vivo = true;
    void getReagendasSesion(evento.id_sesion).then((res) => {
      if (vivo && res.ok) set_reagendas(res.data);
    });
    return () => {
      vivo = false;
    };
  }, [evento]);

  if (!evento) return null;
  const ui = ESTADO_UI[evento.estado];
  const href_completa = `/consulta-osi/preview/${evento.id_osi}?from=calendario&mes=${mes}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl gap-0 p-0">
        <div className="grid min-h-0 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5 border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
            <DialogHeader>
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ui.chip} ${ui.texto}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${ui.punto}`} />
                {ui.etiqueta}
              </span>
              <DialogTitle className="text-xl">
                OSI {evento.nro_osi ?? evento.id_osi}
                <span className="ml-2 text-base font-normal text-slate-500">
                  Sesión {evento.nro_sesion}
                  {evento.total_sesiones > 1 ? ` de ${evento.total_sesiones}` : ""}
                </span>
              </DialogTitle>
              <DialogDescription className="text-base font-medium text-slate-800">{evento.nombre_empresa ?? "Sin empresa"}</DialogDescription>
              <p className="text-sm text-slate-500">{evento.servicio}</p>
            </DialogHeader>

            <div className="flex flex-col gap-1.5 text-sm text-slate-600">
              {evento.ciudad || evento.direccion_ejecucion ? (
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {[evento.ciudad, evento.direccion_ejecucion].filter(Boolean).join(" · ")}
                </span>
              ) : null}
              {evento.ejecutivo_negocios ? (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-slate-400" />
                  {evento.ejecutivo_negocios}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
              <Fecha titulo="Planificada en la OSI" fecha={evento.fecha_planificada} hora={evento.hora_inicio} tono="bg-sky-500" />
              {evento.reagenda_count > 0 ? (
                <Fecha
                  titulo={evento.reagenda_count > 1 ? `Reagendada (${evento.reagenda_count} veces)` : "Reagendada"}
                  fecha={evento.fecha_reagendada}
                  hora={evento.hora_reagendada}
                  tono="bg-orange-500"
                />
              ) : null}
              {evento.fecha_ejecutada ? <Fecha titulo="Ejecutada" fecha={evento.fecha_ejecutada} hora={evento.hora_ejecutada} tono="bg-emerald-500" /> : null}
              {evento.estado === "no_ejecutada" ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  No se ejecutó{evento.motivo_no_ejecucion ? `: ${evento.motivo_no_ejecucion}` : ""}
                </p>
              ) : null}
            </div>

            {reagendas.length > 0 ? (
              <details className="text-sm text-slate-600">
                <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-slate-700">
                  <Repeat className="h-4 w-4 text-orange-600" /> Historial de reagendas ({reagendas.length})
                </summary>
                <ol className="mt-3 flex flex-col gap-3 border-l-2 border-orange-200 pl-3">
                  {reagendas.map((r) => (
                    <li key={r.id} className="text-xs">
                      <span className="font-semibold capitalize text-slate-800">
                        {r.fecha_desde ? fecha_larga(r.fecha_desde) : "—"} → {r.fecha_hasta ? fecha_larga(r.fecha_hasta) : "por confirmar"}
                      </span>
                      <span className="block text-slate-600">{r.motivo}</span>
                      <span className="block text-slate-400">{new Date(r.created_at).toLocaleString("es-VE", { timeZone: "America/Caracas" })}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}

            {puedeGestionar ? (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">¿Qué pasó con esta sesión?</p>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => onAccion(evento, "ejecutar")} className="inline-flex flex-col items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
                    <CheckCircle2 className="h-5 w-5" /> {evento.estado === "ejecutada" ? "Corregir" : "Se dio"}
                  </button>
                  <button type="button" onClick={() => onAccion(evento, "reagendar")} className="inline-flex flex-col items-center gap-1 rounded-lg border border-orange-200 bg-white px-2 py-2.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-50">
                    <CalendarClock className="h-5 w-5" /> Reagendar
                  </button>
                  <button type="button" onClick={() => onAccion(evento, "no_ejecutar")} disabled={evento.estado === "no_ejecutada"} className="inline-flex flex-col items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-40">
                    <XCircle className="h-5 w-5" /> No se dio
                  </button>
                </div>
              </div>
            ) : null}

            <button type="button" onClick={() => onComments(evento)} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50">
              <MessageSquare className="h-4 w-4" />
              Comentarios de la OSI
              {evento.comentarios_count ? (
                <span className="rounded-full bg-sky-600 px-1.5 text-[11px] font-semibold text-white">{evento.comentarios_count}</span>
              ) : null}
            </button>
          </div>

          <div className="flex min-h-0 flex-col p-4 pt-12 lg:p-6 lg:pt-12">
            <OsiPreviewBox osiId={evento.id_osi} hrefCompleta={href_completa} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
