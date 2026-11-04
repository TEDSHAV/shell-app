"use client";

import { AlertTriangle, Info } from "lucide-react";

import type { ImpactoOSI } from "../actions/impacto-actions";

/** Texto del efecto sobre la OSI, para el detalle (una OSI) y el lote (varias). */
export function texto_efecto(i: ImpactoOSI): { tono: "alerta" | "info"; texto: string } | null {
  const osi = `OSI ${i.nro_osi ?? i.id_osi}`;
  const factura = i.solicitudes_factura.length
    ? ` Ya tiene ${i.solicitudes_factura.length === 1 ? "la solicitud de factura" : "las solicitudes de factura"} ${i.solicitudes_factura.map((n) => `#${n}`).join(", ")}.`
    : "";
  switch (i.efecto) {
    case "cierra_ejecutada":
      return { tono: "alerta", texto: `Es la última sesión abierta: la ${osi} pasará a Ejecutada y se pedirá la factura.${factura}` };
    case "cierra_no_ejecutada":
      return { tono: "alerta", texto: `Ninguna sesión quedará ejecutada: la ${osi} pasará a OSI NO EJECUTADA.` };
    case "pendiente_pen":
      return { tono: "info", texto: `La ${osi} no se cerrará: su correlativo sigue pendiente (PEN-). Se cerrará cuando se emita.` };
    case "reabre":
      return { tono: "alerta", texto: `La ${osi} está cerrada y volverá a «En proceso».${factura}` };
    default:
      return null;
  }
}

/** Lista de avisos con un checkbox de confirmación cuando hace falta. */
export default function AvisosAccion({
  avisos,
  confirmado,
  onConfirmar,
  textoConfirmar,
}: {
  avisos: Array<{ tono: "alerta" | "info"; texto: string }>;
  confirmado: boolean;
  onConfirmar: (v: boolean) => void;
  /** Si se da, pide confirmar con un checkbox antes de enviar. */
  textoConfirmar?: string | null;
}) {
  if (!avisos.length && !textoConfirmar) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {avisos.map((a) => (
        <p
          key={a.texto}
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] leading-snug ${a.tono === "alerta" ? "bg-amber-50 text-amber-900" : "bg-sky-50 text-sky-900"}`}
        >
          {a.tono === "alerta" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
          {a.texto}
        </p>
      ))}
      {textoConfirmar ? (
        <label className="flex items-start gap-2 px-1 text-[13px] text-slate-700">
          <input type="checkbox" checked={confirmado} onChange={(e) => onConfirmar(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          {textoConfirmar}
        </label>
      ) : null}
    </div>
  );
}
