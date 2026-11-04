"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { registrarAccionSesion } from "../actions/sesion-accion-actions";
import { fecha_larga, hora_corta, sumar_dias } from "../lib/mes-grid";
import type { AccionSesion, EventoCalendario } from "../lib/types";
import { MOTIVOS_NO_EJECUCION, MOTIVOS_REAGENDA } from "../schemas";

type SesionAccionModalProps = {
  evento: EventoCalendario | null;
  accionInicial: AccionSesion | null;
  hoy: string;
  onClose: () => void;
  onDone: (mensaje: string) => void;
};

const ACCIONES: Array<{ id: AccionSesion; titulo: string; texto: string; icono: typeof CheckCircle2; activo: string; icono_activo: string }> = [
  { id: "ejecutar", titulo: "Ejecutado", texto: "La sesión se dio.", icono: CheckCircle2, activo: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200", icono_activo: "bg-emerald-600 text-white" },
  { id: "reagendar", titulo: "Re-agendar", texto: "No se dio en la fecha y se mueve.", icono: CalendarClock, activo: "border-orange-500 bg-orange-50 ring-2 ring-orange-200", icono_activo: "bg-orange-600 text-white" },
  { id: "no_ejecutar", titulo: "No ejecutado", texto: "No se dio ni se va a dar.", icono: XCircle, activo: "border-red-500 bg-red-50 ring-2 ring-red-200", icono_activo: "bg-red-600 text-white" },
];

const BOTON: Record<AccionSesion, { texto: string; clase: string }> = {
  ejecutar: { texto: "Confirmar como ejecutada", clase: "bg-emerald-600 hover:bg-emerald-700" },
  reagendar: { texto: "Confirmar reagenda", clase: "bg-orange-600 hover:bg-orange-700" },
  no_ejecutar: { texto: "Confirmar no ejecutada", clase: "bg-red-600 hover:bg-red-700" },
};

function hhmm(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : "";
}

export default function SesionAccionModal({ evento, accionInicial, hoy, onClose, onDone }: SesionAccionModalProps) {
  const [accion, set_accion] = useState<AccionSesion>("ejecutar");
  const [fecha, set_fecha] = useState("");
  const [hora, set_hora] = useState("");
  const [motivo_tipo, set_motivo_tipo] = useState<string | null>(null);
  const [motivo, set_motivo] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!evento) return;
    const inicial = accionInicial ?? "ejecutar";
    set_accion(inicial);
    set_fecha(inicial === "ejecutar" ? (evento.fecha_efectiva <= hoy ? evento.fecha_efectiva : hoy) : "");
    set_hora(hhmm(evento.hora_reagendada ?? evento.hora_inicio));
    set_motivo_tipo(null);
    set_motivo("");
    set_error(null);
  }, [evento, accionInicial, hoy]);

  if (!evento) return null;

  const cambiar_accion = (a: AccionSesion) => {
    set_accion(a);
    set_error(null);
    set_motivo_tipo(null);
    set_motivo("");
    set_fecha(a === "ejecutar" ? (evento.fecha_efectiva <= hoy ? evento.fecha_efectiva : hoy) : "");
  };

  const motivos = accion === "reagendar" ? MOTIVOS_REAGENDA : MOTIVOS_NO_EJECUCION;

  const enviar = () => {
    set_error(null);
    if (accion === "ejecutar" && !fecha) return set_error("Indica la fecha real de ejecución");
    if (accion !== "ejecutar" && motivo.trim().length < 3) return set_error("Explica el motivo");
    start(async () => {
      const input =
        accion === "ejecutar"
          ? { accion, id_sesion: evento.id_sesion, fecha, hora: hora || null }
          : accion === "reagendar"
            ? { accion, id_sesion: evento.id_sesion, fecha: fecha || null, hora: fecha && hora ? hora : null, motivo_tipo, motivo }
            : { accion, id_sesion: evento.id_sesion, motivo_tipo, motivo };
      const res = await registrarAccionSesion(input);
      if (!res.ok) return set_error(res.error);
      const sesion = `Sesión ${evento.nro_sesion} de OSI ${evento.nro_osi ?? evento.id_osi}`;
      onDone(
        accion === "ejecutar"
          ? `${sesion} marcada como ejecutada`
          : accion === "reagendar"
            ? `${sesion} reagendada ${fecha ? `al ${fecha_larga(fecha)}` : "(fecha por confirmar)"}`
            : `${sesion} marcada como no ejecutada`,
      );
    });
  };

  const tono = accion === "ejecutar" ? "border-emerald-200 bg-emerald-50/60" : accion === "reagendar" ? "border-orange-200 bg-orange-50/60" : "border-red-200 bg-red-50/60";
  const chip_activo = accion === "reagendar" ? "border-orange-500 bg-orange-600 text-white" : "border-red-500 bg-red-600 text-white";
  const chip = accion === "reagendar" ? "border-orange-300 text-orange-800 hover:bg-orange-100" : "border-red-300 text-red-800 hover:bg-red-100";
  const planificada = `${fecha_larga(evento.fecha_planificada)}${evento.hora_inicio ? ` · ${hora_corta(evento.hora_inicio)}` : ""}`;

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-xl gap-5">
        <DialogHeader>
          <DialogTitle>Ejecución de la sesión</DialogTitle>
          <DialogDescription>
            OSI <span className="font-semibold text-sky-700">{evento.nro_osi ?? evento.id_osi}</span> · Sesión {evento.nro_sesion}
            {evento.total_sesiones > 1 ? ` de ${evento.total_sesiones}` : ""} · {evento.nombre_empresa ?? "Sin empresa"}
          </DialogDescription>
          <p className="text-xs uppercase tracking-wide text-slate-500">{evento.servicio}</p>
          <p className="text-xs text-slate-600">
            Planificada (OSI): <span className="font-medium">{planificada}</span>
            {evento.fecha_reagendada ? (
              <> · Reagendada: <span className="font-medium text-orange-700">{fecha_larga(evento.fecha_reagendada)}</span></>
            ) : null}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ACCIONES.map(({ id, titulo, texto, icono: Icono, activo, icono_activo }) => (
            <button
              key={id}
              type="button"
              onClick={() => cambiar_accion(id)}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${accion === id ? activo : "border-slate-200 hover:bg-slate-50"}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${accion === id ? icono_activo : "bg-slate-100 text-slate-600"}`}>
                  <Icono className="h-4 w-4" />
                </span>
                {titulo}
              </span>
              <span className="text-xs text-slate-600">{texto}</span>
            </button>
          ))}
        </div>

        <div className={`flex flex-col gap-3 rounded-xl border p-4 ${tono}`}>
          {accion === "ejecutar" ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="fecha-ejecucion" className="text-sm font-medium text-slate-800">Fecha real de ejecución</label>
                <span className="flex gap-1">
                  {[{ t: "Hoy", f: hoy }, { t: "Ayer", f: sumar_dias(hoy, -1) }, { t: "Planificada", f: evento.fecha_planificada }].map(({ t, f }) => (
                    <button key={t} type="button" onClick={() => set_fecha(f)} className={`rounded-md border px-2 py-0.5 text-xs ${fecha === f ? "border-emerald-500 bg-emerald-100 text-emerald-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                      {t}
                    </button>
                  ))}
                </span>
              </div>
              <div className="flex gap-2">
                <input id="fecha-ejecucion" type="date" max={hoy} value={fecha} onChange={(e) => set_fecha(e.target.value)} className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm" />
                <input type="time" value={hora} onChange={(e) => set_hora(e.target.value)} aria-label="Hora de ejecución" className="h-10 w-32 rounded-md border border-slate-300 bg-white px-3 text-sm" />
              </div>
              {fecha && fecha !== evento.fecha_planificada ? (
                <p className="text-xs text-amber-700">Se registra como ejecutada fuera de la fecha planificada. La fecha planificada de la OSI no cambia.</p>
              ) : null}
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-slate-800">
                {accion === "reagendar" ? "Motivo de la reagenda" : "Motivo de la no ejecución"} <span className="text-red-600">*</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {motivos.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      set_motivo_tipo(m);
                      if (!motivo.trim()) set_motivo(m);
                    }}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition ${motivo_tipo === m ? chip_activo : `bg-white ${chip}`}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <textarea
                value={motivo}
                onChange={(e) => set_motivo(e.target.value)}
                rows={3}
                placeholder="Explica qué pasó…"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              {accion === "reagendar" ? (
                <>
                  <label htmlFor="fecha-reagenda" className="text-sm font-medium text-slate-800">
                    Nueva fecha tentativa <span className="font-normal text-slate-500">(opcional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input id="fecha-reagenda" type="date" value={fecha} onChange={(e) => set_fecha(e.target.value)} className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm" />
                    <input type="time" value={hora} disabled={!fecha} onChange={(e) => set_hora(e.target.value)} aria-label="Hora tentativa" className="h-10 w-32 rounded-md border border-slate-300 bg-white px-3 text-sm disabled:opacity-50" />
                  </div>
                  <p className="text-xs text-orange-700">
                    Si no conoces la fecha, déjala en blanco: la sesión queda como «Por confirmar». La fecha planificada de la OSI no cambia.
                  </p>
                </>
              ) : null}
            </>
          )}
        </div>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={pending}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${BOTON[accion].clase}`}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {BOTON[accion].texto}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
