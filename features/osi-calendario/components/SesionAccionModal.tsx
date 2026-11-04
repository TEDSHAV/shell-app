"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { registrarAccionSesion } from "../actions/sesion-accion-actions";
import { ACCION_BOTON_PRIMARIO, ACCION_UI, acciones_disponibles, HOJA_MOVIL } from "../lib/acciones";
import { empresa_y_sede } from "../lib/estado-sesion";
import { fecha_larga, hora_corta, sumar_dias } from "../lib/mes-grid";
import type { AccionSesion, EventoCalendario, PermisosSesion } from "../lib/types";
import { MOTIVOS_CANCELACION, MOTIVOS_REAGENDA } from "../schemas";
import AccionIcono from "./AccionIcono";

type SesionAccionModalProps = {
  evento: EventoCalendario | null;
  accionInicial: AccionSesion | null;
  /** Fecha propuesta al soltar la sesión sobre un día del calendario. */
  fechaInicial?: string | null;
  hoy: string;
  permisos: PermisosSesion;
  onClose: () => void;
  onDone: (mensaje: string) => void;
};

const CAMPO = "h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500";

function hhmm(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : "";
}

export default function SesionAccionModal({ evento, accionInicial, fechaInicial = null, hoy, permisos, onClose, onDone }: SesionAccionModalProps) {
  const [accion, set_accion] = useState<AccionSesion>("ejecutar");
  const [fecha, set_fecha] = useState("");
  const [hora, set_hora] = useState("");
  const [motivo_tipo, set_motivo_tipo] = useState<string | null>(null);
  const [motivo, set_motivo] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reiniciar = (a: AccionSesion, e: EventoCalendario) => {
    set_accion(a);
    set_error(null);
    set_motivo_tipo(null);
    set_motivo("");
    set_fecha(a === "ejecutar" ? (e.fecha_efectiva <= hoy ? e.fecha_efectiva : hoy) : "");
    set_hora(hhmm(e.hora_reagendada ?? e.hora_inicio));
  };

  useEffect(() => {
    if (!evento) return;
    reiniciar(accionInicial ?? "ejecutar", evento);
    if (fechaInicial && (accionInicial ?? "ejecutar") === "reagendar") set_fecha(fechaInicial);
  }, [evento, accionInicial, fechaInicial]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!evento) return null;
  const { empresa, sede } = empresa_y_sede(evento.nombre_empresa);
  const acciones = acciones_disponibles(permisos, evento.estado, evento.fecha_efectiva, hoy);
  const motivos = accion === "reagendar" ? MOTIVOS_REAGENDA : MOTIVOS_CANCELACION;
  const sesion = `Sesión ${evento.nro_sesion}${evento.total_sesiones > 1 ? ` de ${evento.total_sesiones}` : ""}`;
  const pide_motivo = accion === "reagendar" || accion === "no_ejecutar";

  const enviar = () => {
    set_error(null);
    if (accion === "ejecutar" && !fecha) return set_error("Indica la fecha en que se dio");
    if (pide_motivo && motivo.trim().length < 3) return set_error("Escribe el motivo");
    start(async () => {
      const input =
        accion === "ejecutar"
          ? { accion, id_sesion: evento.id_sesion, fecha, hora: hora || null }
          : accion === "no_se_dio"
            ? { accion, id_sesion: evento.id_sesion, motivo: motivo.trim() || null }
            : accion === "reagendar"
              ? { accion, id_sesion: evento.id_sesion, fecha: fecha || null, hora: fecha && hora ? hora : null, motivo_tipo, motivo }
              : { accion, id_sesion: evento.id_sesion, motivo_tipo, motivo };
      const res = await registrarAccionSesion(input);
      if (!res.ok) return set_error(res.error);
      const quien = `${sesion} · OSI ${evento.nro_osi ?? evento.id_osi}`;
      onDone(
        accion === "ejecutar"
          ? `${quien}: ejecutada`
          : accion === "no_se_dio"
            ? `${quien}: se registró que no se dio`
            : accion === "reagendar"
              ? `${quien}: reagendada ${fecha ? `para el ${fecha_larga(fecha)}` : "sin fecha todavía"}`
              : `${quien}: cancelada`,
      );
    });
  };

  const chip_sel = accion === "reagendar" ? "border-violet-600 bg-violet-600 text-white" : "border-rose-600 bg-rose-600 text-white";
  const chip = accion === "reagendar" ? "border-violet-200 text-violet-800 hover:bg-violet-50" : "border-rose-200 text-rose-800 hover:bg-rose-50";

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className={`max-w-xl gap-5 ${HOJA_MOVIL}`}>
        <DialogHeader>
          <DialogTitle className="leading-snug">{evento.servicio ?? "Servicio"}</DialogTitle>
          <DialogDescription>
            {empresa}
            {sede ? ` · ${sede}` : ""}
          </DialogDescription>
          <p className="text-xs text-slate-500">
            OSI {evento.nro_osi ?? evento.id_osi} · {sesion} · planificada el{" "}
            <span className="font-medium text-slate-700">{fecha_larga(evento.fecha_planificada)}</span>
            {evento.hora_inicio ? ` · ${hora_corta(evento.hora_inicio)}` : ""}
          </p>
        </DialogHeader>

        {fechaInicial && accion === "reagendar" && fecha === fechaInicial ? (
          <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
            Moviste la sesión al <span className="font-semibold capitalize">{fecha_larga(fechaInicial)}</span>. Indica el motivo y confirma la hora.
          </p>
        ) : null}

        {evento.estado === "no_se_dio" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ya se registró que esta sesión no se dio{evento.no_se_dio_nota ? `: ${evento.no_se_dio_nota}` : ""}. Decide si se reagenda o se cancela.
          </p>
        ) : null}

        <div className={`grid gap-2 ${acciones.length >= 3 ? "sm:grid-cols-3" : acciones.length === 2 ? "sm:grid-cols-2" : ""}`}>
          {acciones.map((a) => {
            const info = ACCION_UI[a];
            const sel = accion === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => reiniciar(a, evento)}
                aria-pressed={sel}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition sm:flex-col ${sel ? info.activo : "border-slate-200 hover:bg-slate-50"}`}
              >
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sel ? info.icono_activo : "bg-slate-100 text-slate-600"}`}>
                  <AccionIcono accion={a} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{info.titulo}</span>
                  <span className="block text-xs leading-snug text-slate-500">{info.descripcion}</span>
                </span>
              </button>
            );
          })}
        </div>

        {accion === "ejecutar" ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-800">¿Cuándo se dio?</span>
            <div className="flex flex-wrap gap-1.5">
              {[{ t: "Hoy", f: hoy }, { t: "Ayer", f: sumar_dias(hoy, -1) }, { t: "En la fecha planificada", f: evento.fecha_planificada }]
                .filter(({ f }) => f <= hoy)
                .map(({ t, f }) => (
                  <button key={t} type="button" onClick={() => set_fecha(f)} className={`rounded-full border px-3 py-1 text-xs font-medium ${fecha === f ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                    {t}
                  </button>
                ))}
            </div>
            <div className="grid grid-cols-[1fr_8rem] gap-2">
              <input type="date" max={hoy} value={fecha} onChange={(e) => set_fecha(e.target.value)} aria-label="Fecha en que se dio" className={CAMPO} />
              <input type="time" value={hora} onChange={(e) => set_hora(e.target.value)} aria-label="Hora" className={CAMPO} />
            </div>
          </div>
        ) : accion === "no_se_dio" ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-800">
              ¿Qué pasó? <span className="font-normal text-slate-500">(opcional)</span>
            </span>
            <textarea value={motivo} onChange={(e) => set_motivo(e.target.value)} rows={3} placeholder="Por ejemplo: el cliente no llegó, se suspendió por lluvia…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" />
            <p className="text-xs text-slate-500">
              La sesión queda marcada como «No se dio» y no cambia de fecha. Quien tenga permiso de reagendar o cancelar decidirá qué hacer.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-800">
              {accion === "reagendar" ? "¿Por qué no se dio?" : "¿Por qué se cancela?"} <span className="text-rose-600">*</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {motivos.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    set_motivo_tipo(m);
                    if (!motivo.trim() || (motivos as readonly string[]).includes(motivo)) set_motivo(m);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs ${motivo_tipo === m ? chip_sel : chip}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea value={motivo} onChange={(e) => set_motivo(e.target.value)} rows={3} placeholder="Detalle (opcional si elegiste un motivo)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500" />
            {accion === "reagendar" ? (
              <>
                <span className="mt-1 text-sm font-medium text-slate-800">
                  Nueva fecha <span className="font-normal text-slate-500">(si ya se sabe)</span>
                </span>
                <div className="grid grid-cols-[1fr_8rem] gap-2">
                  <input type="date" value={fecha} onChange={(e) => set_fecha(e.target.value)} aria-label="Nueva fecha" className={CAMPO} />
                  <input type="time" value={hora} disabled={!fecha} onChange={(e) => set_hora(e.target.value)} aria-label="Nueva hora" className={`${CAMPO} disabled:opacity-50`} />
                </div>
                <p className="text-xs text-slate-500">
                  {fecha ? "La sesión se moverá a esa fecha en el calendario." : "Sin fecha, queda en la lista «Reagendadas sin fecha» hasta que se la asignes."} La fecha planificada de la OSI no cambia.
                </p>
              </>
            ) : null}
          </div>
        )}

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className="h-11 rounded-lg px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Volver
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={pending}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-60 ${ACCION_BOTON_PRIMARIO[accion]}`}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AccionIcono accion={accion} className="h-4 w-4" />}
            {ACCION_UI[accion].boton}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
