"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Clock, FileText, MapPin, MessageSquare, User } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAuditoriaSesion, getReagendasSesion, type CambioEjecucion } from "../actions/calendario-actions";
import { ACCION_UI, acciones_disponibles, HOJA_MOVIL } from "../lib/acciones";
import { empresa_y_sede, ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { fecha_larga, hora_corta } from "../lib/mes-grid";
import type { AccionSesion, EventoCalendario, PermisosSesion, ReagendaHistorial } from "../lib/types";
import AccionIcono from "./AccionIcono";
import FormularioAccion from "./FormularioAccion";
import OsiPreviewBox from "./OsiPreviewBox";

type EventoDetalleProps = {
  evento: EventoCalendario | null;
  mes: string;
  hoy: string;
  permisos: PermisosSesion;
  /** Abre directo en el paso de acción (p. ej. al soltar una sesión en otro día). */
  pasoInicial?: PasoAccion | null;
  onClose: () => void;
  onDone: (mensaje: string) => void;
  onComments: (evento: EventoCalendario) => void;
};

const ETIQUETA_CAMBIO: Record<string, string> = {
  ejecutar: "Fecha de ejecución corregida",
  reagendar: "Se reabrió para reagendar",
  no_ejecutar: "Se canceló después de ejecutada",
};

export type PasoAccion = { accion: AccionSesion; fecha?: string | null };

function useEsEscritorio(): boolean {
  const [ok, set_ok] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => set_ok(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return ok;
}

function Linea({ titulo, fecha, hora, punto }: { titulo: string; fecha: string | null; hora?: string | null; punto: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${punto}`} />
      <div>
        <p className="text-xs text-slate-500">{titulo}</p>
        <p className="text-sm font-medium capitalize text-slate-900">
          {fecha ? fecha_larga(fecha) : "Sin fecha todavía"}
          {fecha && hora ? <span className="font-normal normal-case text-slate-500"> · {hora_corta(hora)}</span> : null}
        </p>
      </div>
    </li>
  );
}

export default function EventoDetalle({ evento, mes, hoy, permisos, pasoInicial = null, onClose, onDone, onComments }: EventoDetalleProps) {
  const [reagendas, set_reagendas] = useState<ReagendaHistorial[]>([]);
  const [cambios, set_cambios] = useState<CambioEjecucion[]>([]);
  const [ver_formato, set_ver_formato] = useState(false);
  // Paso 1 (null): detalle. Paso 2: formulario de la acción, en la misma columna y el mismo modal.
  const [paso, set_paso] = useState<PasoAccion | null>(pasoInicial);
  const [entra_desde, set_entra_desde] = useState<"derecha" | "izquierda">("derecha");
  const escritorio = useEsEscritorio();

  useEffect(() => {
    set_paso(pasoInicial);
    set_entra_desde("derecha");
  }, [evento?.id_sesion, pasoInicial]);

  const ir_a_paso = (p: PasoAccion | null) => {
    set_entra_desde(p ? "derecha" : "izquierda");
    set_paso(p);
  };

  useEffect(() => {
    set_reagendas([]);
    set_cambios([]);
    set_ver_formato(false);
    if (!evento) return;
    let vivo = true;
    // Reagendas y cambios sobre una ejecutada en paralelo; solo se piden si pueden existir.
    if (evento.reagenda_count > 0) {
      void getReagendasSesion(evento.id_sesion).then((res) => {
        if (vivo && res.ok) set_reagendas(res.data);
      });
    }
    if (evento.reagenda_count > 0 || evento.fecha_ejecutada || evento.estado === "cancelada") {
      void getAuditoriaSesion(evento.id_sesion).then((res) => {
        if (vivo && res.ok) set_cambios(res.data);
      });
    }
    return () => {
      vivo = false;
    };
  }, [evento]);

  if (!evento) return null;
  const ui = ESTADO_UI[evento.estado];
  const { empresa, sede } = empresa_y_sede(evento.nombre_empresa);
  const hora = hora_corta(hora_efectiva(evento));
  const mostrar_formato = escritorio || ver_formato;
  const acciones = acciones_disponibles(permisos, evento.estado, evento.fecha_efectiva, hoy);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-w-6xl gap-0 p-0 lg:min-h-[min(40rem,calc(100dvh-3rem))] ${HOJA_MOVIL}`}>
        {/* En escritorio la columna izquierda marca el alto (sin scroll propio); el formato se estira a ese alto y hace scroll por dentro. */}
        <div className="grid lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
          <div className="flex flex-col overflow-hidden px-5 py-4">
          {paso ? (
            <div
              key="paso-accion"
              className={`flex flex-1 flex-col duration-200 animate-in fade-in ${entra_desde === "derecha" ? "slide-in-from-right-6" : "slide-in-from-left-6"}`}
            >
              <DialogTitle className="sr-only">{`${ACCION_UI[paso.accion].titulo}: ${evento.servicio ?? "sesión"}`}</DialogTitle>
              <FormularioAccion
                evento={evento}
                accionInicial={paso.accion}
                fechaInicial={paso.fecha ?? null}
                hoy={hoy}
                permisos={permisos}
                onVolver={() => ir_a_paso(null)}
                onDone={onDone}
              />
            </div>
          ) : (
          <div
            key="paso-detalle"
            className={`flex flex-col gap-3 duration-200 animate-in fade-in ${entra_desde === "izquierda" ? "slide-in-from-left-6" : ""}`}
          >
            <DialogHeader className="gap-2">
              <div className="flex flex-wrap items-center gap-1.5 pr-8">
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">OSI {evento.nro_osi ?? evento.id_osi}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ui.pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ui.punto}`} />
                  {ui.etiqueta}
                </span>
                {evento.en_sha ? <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">En SHA</span> : null}
              </div>
              <DialogTitle className="text-lg leading-snug sm:text-xl">{evento.servicio ?? "Servicio"}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-medium text-slate-800">{empresa}</span>
                  {sede ? <span className="text-sm text-slate-500">Sede {sede}</span> : null}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="capitalize">{evento.estado === "sin_fecha" ? "Sin fecha" : fecha_larga(evento.fecha_efectiva)}</span>
                {hora && evento.estado !== "sin_fecha" ? <span>· {hora}</span> : null}
              </span>
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                {evento.total_sesiones > 1 ? `Sesión ${evento.nro_sesion} de ${evento.total_sesiones}` : "Sesión única"}
              </span>
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

            {evento.reagenda_count > 0 || evento.fecha_ejecutada || evento.estado === "cancelada" ? (
              <ul className="flex flex-col gap-2 rounded-xl bg-slate-50 px-3.5 py-3">
                <Linea titulo="Fecha planificada en la OSI" fecha={evento.fecha_planificada} hora={evento.hora_inicio} punto="bg-sky-500" />
                {reagendas
                  .slice()
                  .reverse()
                  .map((r, i) => (
                    <li key={r.id} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                      <div>
                        <p className="text-xs text-slate-500">Reagenda {i + 1}{r.motivo_tipo ? ` · ${r.motivo_tipo}` : ""}</p>
                        <p className="text-sm font-medium capitalize text-slate-900">{r.fecha_hasta ? fecha_larga(r.fecha_hasta) : "Sin fecha todavía"}</p>
                        {r.motivo && r.motivo !== r.motivo_tipo ? <p className="text-xs text-slate-500">{r.motivo}</p> : null}
                      </div>
                    </li>
                  ))}
                {evento.fecha_ejecutada ? <Linea titulo="Ejecutada" fecha={evento.fecha_ejecutada} hora={evento.hora_ejecutada} punto="bg-emerald-500" /> : null}
                {evento.estado === "cancelada" ? (
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    <div>
                      <p className="text-xs text-slate-500">Cancelada{evento.motivo_no_ejecucion_tipo ? ` · ${evento.motivo_no_ejecucion_tipo}` : ""}</p>
                      <p className="text-sm text-slate-800">{evento.motivo_no_ejecucion ?? "Sin motivo"}</p>
                    </div>
                  </li>
                ) : null}
              </ul>
            ) : null}

            {cambios.length ? (
              <details className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">Cambios sobre la ejecución ({cambios.length})</summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {cambios.map((c) => (
                    <li key={c.id} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{ETIQUETA_CAMBIO[c.accion] ?? c.accion}</span>
                      {c.antes.fecha_ejecutada ? ` · estaba ejecutada el ${fecha_larga(c.antes.fecha_ejecutada)}` : ""}
                      {c.despues.fecha_ejecutada ? ` · ahora ${fecha_larga(c.despues.fecha_ejecutada)}` : ""}
                      <span className="block text-slate-400">{new Date(c.created_at).toLocaleString("es-VE", { timeZone: "America/Caracas" })}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {evento.estado === "no_se_dio" ? (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
                Se registró como no ejecutada
                {evento.no_se_dio_at ? ` el ${new Date(evento.no_se_dio_at).toLocaleDateString("es-VE", { timeZone: "America/Caracas" })}` : ""}.
                {evento.no_se_dio_nota ? <span className="block text-amber-800/80">{evento.no_se_dio_nota}</span> : null}
                <span className="block text-xs text-amber-800/80">
                  {permisos.reagendar || permisos.cancelar ? "Falta decidir si se reagenda o se cancela." : "Quien tenga permiso de reagendar o cancelar decidirá qué hacer."}
                </span>
              </p>
            ) : null}

            {acciones.length ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-slate-500">
                  {evento.estado === "no_se_dio" ? "Decidir qué pasa con la sesión" : "Registrar qué pasó"}
                </p>
                {acciones.map((a: AccionSesion) => {
                  const info = ACCION_UI[a];
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => ir_a_paso({ accion: a })}
                      className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-1.5 text-left transition disabled:opacity-40 ${info.color}`}
                    >
                      <AccionIcono accion={a} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{a === "ejecutar" && evento.estado === "ejecutada" ? "Corregir fecha de ejecución" : info.titulo}</span>
                        <span className="block text-xs text-slate-500">{info.descripcion}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button type="button" onClick={() => onComments(evento)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Comentarios
                {evento.comentarios_count ? <span className="rounded-full bg-sky-600 px-1.5 text-[11px] font-semibold text-white">{evento.comentarios_count}</span> : null}
              </button>
              {!escritorio ? (
                <button type="button" onClick={() => set_ver_formato((v) => !v)} aria-expanded={ver_formato} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Formato OSI <ChevronDown className={`h-4 w-4 transition ${ver_formato ? "rotate-180" : ""}`} />
                </button>
              ) : null}
            </div>
          </div>
          )}
          </div>

          {mostrar_formato ? (
            <div className="flex min-h-0 flex-col border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0 lg:p-4 lg:pt-12">
              <OsiPreviewBox osiId={evento.id_osi} hrefCompleta={`/consulta-osi/preview/${evento.id_osi}?from=calendario&mes=${mes}`} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
