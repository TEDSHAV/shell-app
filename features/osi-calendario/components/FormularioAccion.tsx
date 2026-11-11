"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { registrarAccionSesion } from "../actions/sesion-accion-actions";
import { ACCION_BOTON_PRIMARIO, ACCION_UI, acciones_disponibles } from "../lib/acciones";
import { fecha_larga, hora_corta, sumar_dias } from "../lib/mes-grid";
import type { AccionSesion, EventoCalendario, PermisosSesion } from "../lib/types";
import { MOTIVOS_CANCELACION, MOTIVOS_REAGENDA } from "../schemas";
import AccionIcono from "./AccionIcono";
import AvisosAccion, { texto_efecto } from "./AvisosAccion";
import { getImpactoAccion, type ImpactoOSI } from "../actions/impacto-actions";
import { avisos_fecha } from "../lib/fechas-sesion";

type FormularioAccionProps = {
  evento: EventoCalendario;
  accionInicial: AccionSesion;
  /** Fecha propuesta al soltar la sesión sobre un día del calendario. */
  fechaInicial?: string | null;
  hoy: string;
  permisos: PermisosSesion;
  onVolver: () => void;
  onDone: (mensaje: string) => void;
};

const CAMPO = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500";

function hhmm(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : "";
}

/** Paso 2 del detalle de una sesión: se elige la acción y se completa. Vive dentro del mismo modal. */
export default function FormularioAccion({ evento, accionInicial, fechaInicial = null, hoy, permisos, onVolver, onDone }: FormularioAccionProps) {
  const [accion, set_accion] = useState<AccionSesion>(accionInicial);
  const [fecha, set_fecha] = useState("");
  const [hora, set_hora] = useState("");
  const [motivo_tipo, set_motivo_tipo] = useState<string | null>(null);
  const [motivo, set_motivo] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reiniciar = (a: AccionSesion) => {
    set_accion(a);
    set_error(null);
    set_motivo_tipo(null);
    set_motivo("");
    set_fecha(a === "ejecutar" ? (evento.fecha_efectiva <= hoy ? evento.fecha_efectiva : hoy) : a === "reagendar" && fechaInicial ? fechaInicial : "");
    set_hora(hhmm(evento.hora_reagendada ?? evento.hora_inicio));
  };

  useEffect(() => reiniciar(accionInicial), [evento.id_sesion, accionInicial, fechaInicial]); // eslint-disable-line react-hooks/exhaustive-deps

  // Efecto de la acción en la OSI (cierre, PEN-, reapertura) y sesiones hermanas para los avisos de fecha.
  const [impacto, set_impacto] = useState<ImpactoOSI | null>(null);
  const [confirmado, set_confirmado] = useState(false);
  useEffect(() => {
    let vivo = true;
    set_impacto(null);
    set_confirmado(false);
    void getImpactoAccion({ accion, ids_osi: [evento.id_osi], ids_sesion: [evento.id_sesion], individual: true }).then((res) => {
      if (vivo && res.ok) set_impacto(res.data[0] ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [accion, evento.id_osi, evento.id_sesion]);

  const acciones = acciones_disponibles(permisos, evento.estado, evento.fecha_efectiva, hoy);
  const motivos = accion === "reagendar" ? MOTIVOS_REAGENDA : MOTIVOS_CANCELACION;
  const pide_motivo = accion === "reagendar" || accion === "no_ejecutar";
  const sesion = `Sesión ${evento.nro_sesion}${evento.total_sesiones > 1 ? ` de ${evento.total_sesiones}` : ""}`;

  // Reabrir una ejecutada (reagendar o cancelar) se permite, pero con confirmación; corregir la fecha queda auditado.
  const reabre = evento.estado === "ejecutada" && (accion === "reagendar" || accion === "no_ejecutar");
  const avisos_de_fecha = accion === "reagendar" ? avisos_fecha(evento, fecha || null, impacto?.sesiones ?? [], hoy) : [];
  const efecto = impacto ? texto_efecto(impacto) : null;
  const avisos = [
    ...(reabre ? [{ tono: "alerta" as const, texto: "Esta sesión ya está ejecutada: se quitará la fecha de ejecución. El cambio queda registrado." }] : []),
    ...(evento.estado === "ejecutada" && accion === "ejecutar" ? [{ tono: "info" as const, texto: "Se corrige la fecha de ejecución; el valor anterior queda registrado." }] : []),
    ...(efecto ? [efecto] : []),
    ...avisos_de_fecha.map((texto) => ({ tono: "alerta" as const, texto })),
  ];
  const texto_confirmar = reabre
    ? "Entiendo que la sesión ejecutada se reabre."
    : efecto?.tono === "alerta" || avisos_de_fecha.length
      ? "Entiendo y quiero continuar."
      : null;

  // Avisos nuevos (otra fecha, otro efecto) piden confirmar otra vez.
  const firma_avisos = avisos.map((a) => a.texto).join("|");
  useEffect(() => set_confirmado(false), [firma_avisos]);

  const enviar = () => {
    set_error(null);
    if (accion === "ejecutar" && !fecha) return set_error("Indica la fecha en que se dio");
    if (pide_motivo && motivo.trim().length < 3) return set_error("Escribe el motivo");
    if (texto_confirmar && !confirmado) return set_error("Confirma los avisos antes de continuar");
    start(async () => {
      const input =
        accion === "ejecutar"
          ? { accion, id_sesion: evento.id_sesion, fecha, hora: hora || null }
          : accion === "no_se_dio"
            ? { accion, id_sesion: evento.id_sesion, motivo: null }
            : accion === "reagendar"
              ? { accion, id_sesion: evento.id_sesion, fecha: fecha || null, hora: fecha && hora ? hora : null, motivo_tipo, motivo }
              : { accion, id_sesion: evento.id_sesion, motivo_tipo, motivo };
      const res = await registrarAccionSesion(input);
      if (!res.ok) return set_error(res.error);
      const quien = `${sesion} · OSI ${evento.nro_osi ?? evento.id_osi}`;
      const estatus_osi = res.data.id_estatus_osi;
      const cambio_osi = estatus_osi !== evento.id_estatus_osi
        ? estatus_osi === 12 ? " · La OSI pasó a Ejecutada" : estatus_osi === 39 ? " · La OSI pasó a OSI NO EJECUTADA" : estatus_osi === 11 && (evento.id_estatus_osi === 12 || evento.id_estatus_osi === 39) ? " · La OSI se reabrió" : ""
        : "";
      onDone(
        (accion === "ejecutar"
          ? `${quien}: ejecutada`
          : accion === "no_se_dio"
            ? `${quien}: no ejecutada`
            : accion === "reagendar"
              ? `${quien}: reagendada ${fecha ? `para el ${fecha_larga(fecha)}` : "sin fecha todavía"}`
              : `${quien}: cancelada`) + cambio_osi,
      );
    });
  };

  const chip_sel = accion === "reagendar" ? "border-violet-600 bg-violet-600 text-white" : "border-rose-600 bg-rose-600 text-white";
  const chip = accion === "reagendar" ? "border-violet-200 text-violet-800 hover:bg-violet-50" : "border-rose-200 text-rose-800 hover:bg-rose-50";
  const info = ACCION_UI[accion];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1 pr-8">
        <button type="button" onClick={onVolver} disabled={pending} className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al detalle
        </button>
        <p className="text-sm font-semibold leading-snug text-slate-900">{evento.servicio ?? "Servicio"}</p>
        <p className="text-xs text-slate-500">
          OSI {evento.nro_osi ?? evento.id_osi} · {sesion} · planificada el <span className="font-medium text-slate-700">{fecha_larga(evento.fecha_planificada)}</span>
          {evento.hora_inicio ? ` · ${hora_corta(evento.hora_inicio)}` : ""}
        </p>
      </div>

      {acciones.length > 1 ? (
        <div role="tablist" aria-label="Acción" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {acciones.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={accion === a}
              onClick={() => reiniciar(a)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                accion === a ? `bg-white shadow-sm ${ACCION_UI[a].texto}` : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <AccionIcono accion={a} className="h-3.5 w-3.5" />
              {ACCION_UI[a].titulo}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-xs leading-snug text-slate-500">{info.descripcion}</p>

      {fechaInicial && accion === "reagendar" && fecha === fechaInicial ? (
        <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
          Moviste la sesión al <span className="font-semibold capitalize">{fecha_larga(fechaInicial)}</span>. Indica el motivo y confirma la hora.
        </p>
      ) : null}

      <div key={accion} className="flex flex-col gap-2 duration-200 animate-in fade-in slide-in-from-bottom-1">
        {accion === "ejecutar" ? (
          <>
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
            <div className="grid grid-cols-[1fr_7.5rem] gap-2">
              <input type="date" max={hoy} value={fecha} onChange={(e) => set_fecha(e.target.value)} aria-label="Fecha en que se dio" className={CAMPO} />
              <input type="time" value={hora} onChange={(e) => set_hora(e.target.value)} aria-label="Hora" className={CAMPO} />
            </div>
          </>
        ) : accion === "no_se_dio" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            La sesión queda como «No ejecutada» y no cambia de fecha. Quien tenga permiso de reagendar o cancelar decidirá qué hacer.
          </p>
        ) : (
          <>
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
                  className={`rounded-full border px-2.5 py-1 text-xs ${motivo_tipo === m ? chip_sel : chip}`}
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
                <div className="grid grid-cols-[1fr_7.5rem] gap-2">
                  <input type="date" value={fecha} onChange={(e) => set_fecha(e.target.value)} aria-label="Nueva fecha" className={CAMPO} />
                  <input type="time" value={hora} disabled={!fecha} onChange={(e) => set_hora(e.target.value)} aria-label="Nueva hora" className={`${CAMPO} disabled:opacity-50`} />
                </div>
                <p className="text-xs text-slate-500">
                  {fecha ? "La sesión se moverá a esa fecha en el calendario." : "Sin fecha, queda en «Reagendadas sin fecha» hasta que se la asignes."} La fecha planificada de la OSI no cambia.
                </p>
              </>
            ) : null}
          </>
        )}
      </div>

      <AvisosAccion avisos={avisos} confirmado={confirmado} onConfirmar={set_confirmado} textoConfirmar={texto_confirmar} />

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-auto flex justify-end gap-2 pt-2">
        <button type="button" onClick={onVolver} disabled={pending} className="h-11 rounded-lg px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Volver
        </button>
        <button
          type="button"
          onClick={enviar}
          disabled={pending}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60 ${ACCION_BOTON_PRIMARIO[accion]}`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AccionIcono accion={accion} className="h-4 w-4" />}
          {info.boton}
        </button>
      </div>
    </div>
  );
}
