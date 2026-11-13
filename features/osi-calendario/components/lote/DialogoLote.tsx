"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { registrarAccionLote, type ResultadoLote } from "../../actions/lote-actions";
import { ACCION_BOTON_PRIMARIO, ACCION_UI, HOJA_MOVIL } from "../../lib/acciones";
import type { AccionSesion } from "../../lib/types";
import { MOTIVOS_CANCELACION, MOTIVOS_REAGENDA } from "../../schemas";
import AccionIcono from "../AccionIcono";
import AvisosAccion, { texto_efecto } from "../AvisosAccion";
import { getImpactoAccion, type ImpactoOSI } from "../../actions/impacto-actions";
import { avisos_fecha } from "../../lib/fechas-sesion";

/** Sesiones del calendario (con sus OSIs, para calcular el efecto) u OSIs completas de Consulta. */
export type ObjetivoLote = { tipo: "sesiones"; ids: number[]; ids_osi: number[] } | { tipo: "osis"; ids: number[] };

type DialogoLoteProps = {
  accion: AccionSesion | null;
  objetivo: ObjetivoLote;
  hoy: string;
  onClose: () => void;
  /** Se llama tras aplicar (aunque haya omitidas) para refrescar y limpiar la selección. */
  onDone: (mensaje: string) => void;
};

const CAMPO = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500";

/** Formulario de una acción sobre varias sesiones u OSIs. Muestra al final cuántas se hicieron y cuáles se omitieron. */
export default function DialogoLote({ accion, objetivo, hoy, onClose, onDone }: DialogoLoteProps) {
  const [fecha_propia, set_fecha_propia] = useState(true);
  const [fecha, set_fecha] = useState("");
  const [motivo_tipo, set_motivo_tipo] = useState<string | null>(null);
  const [motivo, set_motivo] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [resultado, set_resultado] = useState<ResultadoLote | null>(null);
  const [pending, start] = useTransition();
  const [impacto, set_impacto] = useState<ImpactoOSI[]>([]);
  // Guarda qué avisos se confirmaron: si cambian (otra fecha, otro efecto), hay que confirmar de nuevo.
  const [confirmado_para, set_confirmado_para] = useState<string | null>(null);
  const ids_osi = objetivo.tipo === "osis" ? objetivo.ids : objetivo.ids_osi;
  const clave_ids = `${objetivo.tipo}:${objetivo.ids.join(",")}`;

  // Efecto en las OSIs: cuántas se cierran (y piden factura), cuáles quedan por PEN-.
  useEffect(() => {
    if (!accion) return;
    let vivo = true;
    set_impacto([]);
    void getImpactoAccion({ accion, ids_osi, ids_sesion: objetivo.tipo === "sesiones" ? objetivo.ids : undefined }).then((res) => {
      if (vivo && res.ok) set_impacto(res.data);
    });
    return () => {
      vivo = false;
    };
  }, [accion, clave_ids]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    set_fecha_propia(true);
    set_fecha(accion === "ejecutar" ? hoy : "");
    set_motivo_tipo(null);
    set_motivo("");
    set_error(null);
    set_resultado(null);
  }, [accion, hoy]);

  if (!accion) return null;
  const info = ACCION_UI[accion];
  const n = objetivo.ids.length;
  const que = objetivo.tipo === "osis" ? `${n} ${n === 1 ? "OSI" : "OSIs"} (todas sus sesiones abiertas)` : `${n} ${n === 1 ? "sesión" : "sesiones"}`;
  const motivos = accion === "reagendar" ? MOTIVOS_REAGENDA : MOTIVOS_CANCELACION;
  const pide_motivo = accion === "reagendar" || accion === "no_ejecutar";

  const efectos = impacto.map(texto_efecto).filter((e): e is NonNullable<typeof e> => !!e);
  const cierran = impacto.filter((i) => i.efecto === "cierra_ejecutada");
  const con_factura = cierran.filter((i) => i.solicitudes_factura.length).length;
  // Con muchas OSIs, un resumen; con pocas, el detalle de cada una.
  const avisos_efecto =
    efectos.length > 3
      ? [
          ...(cierran.length ? [{ tono: "alerta" as const, texto: `${cierran.length} OSIs pasarán a Ejecutada y se pedirá su factura${con_factura ? ` (${con_factura} ya tienen solicitud)` : ""}.` }] : []),
          ...(impacto.some((i) => i.efecto === "pendiente_pen") ? [{ tono: "info" as const, texto: `${impacto.filter((i) => i.efecto === "pendiente_pen").length} OSIs no se cerrarán por correlativo PEN-.` }] : []),
          ...(impacto.some((i) => i.efecto === "cierra_no_ejecutada") ? [{ tono: "alerta" as const, texto: `${impacto.filter((i) => i.efecto === "cierra_no_ejecutada").length} OSIs quedarán suspendidas (y sus requisiciones abiertas).` }] : []),
        ]
      : efectos;
  // Reagendar «todas a esta fecha»: cuántas sesiones quedan en fecha pasada o fuera de orden.
  const elegidas = objetivo.tipo === "sesiones" ? new Set(objetivo.ids) : null;
  const con_aviso_fecha =
    accion === "reagendar" && fecha
      ? impacto.flatMap((i) => i.sesiones.filter((s) => (elegidas ? elegidas.has(s.id_sesion) : s.estado !== "ejecutada" && s.estado !== "cancelada")).map((s) => avisos_fecha(s, fecha, i.sesiones, hoy).length)).filter((n) => n > 0).length
      : 0;
  const avisos = [
    ...avisos_efecto,
    ...(con_aviso_fecha ? [{ tono: "alerta" as const, texto: `${con_aviso_fecha} ${con_aviso_fecha === 1 ? "sesión queda" : "sesiones quedan"} en fecha pasada o fuera de orden respecto a las otras de su OSI.` }] : []),
  ];
  const texto_confirmar = avisos.some((a) => a.tono === "alerta") ? "Entiendo y quiero continuar." : null;
  const firma_avisos = avisos.map((a) => a.texto).join("|");
  const confirmado = confirmado_para === firma_avisos;

  const enviar = () => {
    set_error(null);
    if (texto_confirmar && !confirmado) return set_error("Confirma los avisos antes de continuar");
    if (accion === "ejecutar" && !fecha_propia && !fecha) return set_error("Indica la fecha");
    if (pide_motivo && motivo.trim().length < 3) return set_error("Escribe el motivo");
    start(async () => {
      const res = await registrarAccionLote({
        accion,
        ids_sesion: objetivo.tipo === "sesiones" ? objetivo.ids : [],
        ids_osi: objetivo.tipo === "osis" ? objetivo.ids : [],
        fecha_propia,
        fecha: accion === "ejecutar" ? (fecha_propia ? null : fecha) : accion === "reagendar" ? fecha || null : null,
        motivo_tipo,
        motivo: motivo.trim() || null,
      });
      if (!res.ok) return set_error(res.error);
      if (res.data.omitidas.length) {
        set_resultado(res.data);
        return;
      }
      onDone(`${res.data.hechas} ${res.data.hechas === 1 ? "sesión" : "sesiones"}: ${info.titulo.toLowerCase()}`);
    });
  };

  const chip_sel = accion === "reagendar" ? "border-violet-600 bg-violet-600 text-white" : "border-rose-600 bg-rose-600 text-white";
  const chip = accion === "reagendar" ? "border-violet-200 text-violet-800 hover:bg-violet-50" : "border-rose-200 text-rose-800 hover:bg-rose-50";

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && (resultado ? onDone(`${resultado.hechas} sesiones aplicadas`) : onClose())}>
      <DialogContent className={`max-w-lg gap-4 ${HOJA_MOVIL}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AccionIcono accion={accion} className={`h-5 w-5 ${info.texto}`} />
            {info.titulo} en lote
          </DialogTitle>
          <DialogDescription>
            {que}. {info.descripcion}
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="flex flex-col gap-3 duration-200 animate-in fade-in slide-in-from-right-4">
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> {resultado.hechas} {resultado.hechas === 1 ? "sesión aplicada" : "sesiones aplicadas"}
            </p>
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-800">{resultado.omitidas.length} omitidas</p>
              <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm">
                {resultado.omitidas.map((o) => (
                  <li key={o.id_sesion} className="flex justify-between gap-3 px-3 py-1.5">
                    <span className="font-medium text-slate-700">{o.etiqueta}</span>
                    <span className="text-right text-slate-500">{o.motivo}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {accion === "ejecutar" ? (
              <>
                <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                  <input type="radio" name="fecha" checked={fecha_propia} onChange={() => set_fecha_propia(true)} className="mt-0.5" />
                  <span>
                    <span className="block font-medium text-slate-900">Cada una en su fecha</span>
                    <span className="block text-xs text-slate-500">Se marca ejecutada el día que tenía en el calendario.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                  <input type="radio" name="fecha" checked={!fecha_propia} onChange={() => set_fecha_propia(false)} className="mt-0.5" />
                  <span className="flex-1">
                    <span className="block font-medium text-slate-900">Todas en esta fecha</span>
                    {!fecha_propia ? <input type="date" max={hoy} value={fecha} onChange={(e) => set_fecha(e.target.value)} aria-label="Fecha de ejecución" className={`${CAMPO} mt-2`} /> : null}
                  </span>
                </label>
                <p className="text-xs text-slate-500">Las que todavía no llegan a su fecha se omiten.</p>
              </>
            ) : accion === "no_se_dio" ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                Quedan como «No ejecutada» sin cambiar de fecha. Las que todavía no llegan a su fecha se omiten.
              </p>
            ) : (
              <>
                <span className="text-sm font-medium text-slate-800">
                  {accion === "reagendar" ? "¿Por qué no se dieron?" : "¿Por qué se suspenden?"} <span className="text-rose-600">*</span>
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
                      Nueva fecha para todas <span className="font-normal text-slate-500">(opcional)</span>
                    </span>
                    <input type="date" value={fecha} onChange={(e) => set_fecha(e.target.value)} aria-label="Nueva fecha" className={CAMPO} />
                    <p className="text-xs text-slate-500">Sin fecha, quedan en «Reagendadas sin fecha». La fecha planificada de cada OSI no cambia.</p>
                  </>
                ) : null}
              </>
            )}
          </div>
        )}

        {!resultado ? <AvisosAccion avisos={avisos} confirmado={confirmado} onConfirmar={(v) => set_confirmado_para(v ? firma_avisos : null)} textoConfirmar={texto_confirmar} /> : null}

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <DialogFooter>
          {resultado ? (
            <button type="button" onClick={() => onDone(`${resultado.hechas} ${resultado.hechas === 1 ? "sesión aplicada" : "sesiones aplicadas"}, ${resultado.omitidas.length} omitidas`)} className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">
              Listo
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={pending} className="h-11 rounded-lg px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Volver
              </button>
              <button type="button" onClick={enviar} disabled={pending} className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-60 ${ACCION_BOTON_PRIMARIO[accion]}`}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AccionIcono accion={accion} className="h-4 w-4" />}
                {info.boton} ({n})
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
