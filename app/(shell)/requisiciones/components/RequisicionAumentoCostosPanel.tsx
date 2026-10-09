"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  preview_aumento_costos,
  type AumentoCostosPatch,
} from "@/actions/requisiciones-aumento-costos";
import { Textarea } from "@/components/ui/textarea";
import type { RequisicionFormData } from "@/types/requisiciones";

type Props = {
  isInterna: boolean;
  idOsi: number | null;
  osiFixedItems: RequisicionFormData["osi_fixed_items"];
  additionalItems: RequisicionFormData["additional_items"];
  idSesion?: number | null;
  excludeReqId?: number | null;
  justification: string;
  onJustificationChange: (value: string) => void;
  canRestoreJornada?: boolean;
  onRestoreJornada?: () => void;
};

function usd(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `$ ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

function estado_from_analysis(analysis: {
  extra: number;
  level: number;
  needs_approval: boolean;
  needs_justification: boolean;
}): "base" | "moderado" | "riesgoso" | "aprobacion" {
  if (analysis.needs_approval) return "aprobacion";
  if (analysis.needs_justification) return "riesgoso";
  if (analysis.extra > 0) return "moderado";
  return "base";
}

export function RequisicionAumentoCostosPanel({
  isInterna,
  idOsi,
  osiFixedItems,
  additionalItems,
  idSesion = null,
  excludeReqId = null,
  justification,
  onJustificationChange,
  canRestoreJornada = false,
  onRestoreJornada,
}: Props) {
  const [patch, setPatch] = useState<AumentoCostosPatch | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isInterna || !idOsi) {
      setPatch(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void preview_aumento_costos({
        is_interna: isInterna,
        id_osi: idOsi,
        form: {
          osi_fixed_items: osiFixedItems,
          additional_items: additionalItems,
          id_sesion: idSesion,
        },
        exclude_req_id: excludeReqId,
      })
        .then((next) => {
          if (!cancelled) setPatch(next);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [additionalItems, excludeReqId, idOsi, idSesion, isInterna, osiFixedItems]);

  if (isInterna) return null;

  if (!idOsi) {
    return (
      <div className="border-b border-gray-300 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-800">Estado del costo</p>
        <p className="mt-1 text-sm text-slate-600">
          Elige una OSI para ver si el ajuste es moderado, riesgoso o si queda
          sujeto a aprobación.
        </p>
      </div>
    );
  }

  const analysis = patch?.aumento_costos_analisis;
  const estado = analysis ? estado_from_analysis(analysis) : null;
  const show_justificacion = estado === "riesgoso" || estado === "aprobacion";
  const tone =
    estado === "aprobacion"
      ? "border-rose-200 bg-rose-50 text-rose-950"
      : estado === "riesgoso"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : estado === "moderado"
          ? "border-sky-200 bg-sky-50 text-sky-950"
          : "border-emerald-200 bg-emerald-50 text-emerald-950";

  const headline =
    !analysis
      ? loading
        ? "Revisando el ajuste…"
        : "Aún no hay estado."
      : estado === "aprobacion"
        ? "Riesgoso · sujeta a aprobación"
        : estado === "riesgoso"
          ? "Riesgoso"
          : estado === "moderado"
            ? "Moderado"
            : "Base";

  const detail =
    !analysis
      ? "Al cambiar ítems se actualiza solo."
      : estado === "aprobacion"
        ? `La requisición (${usd(analysis.cost_req)}) supera a la OSI (${usd(analysis.cost_osi)}) en ${usd(analysis.extra)}. Completa la justificación: esta solicitud queda sujeta a aprobación.`
        : estado === "riesgoso"
          ? `El ajuste es riesgoso. Completa la justificación para poder emitir.`
          : estado === "moderado"
            ? "El ajuste es moderado. No hace falta justificación ni aprobación."
            : "Sin extra respecto a la OSI. No hace falta justificación ni aprobación.";

  return (
    <div className="border-b border-gray-300 p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Estado del costo
        </p>
        <p className="mt-0.5 text-sm text-slate-600">
          Moderado, riesgoso o sujeto a aprobación, según lo que pides frente a
          la OSI.
        </p>
      </div>
      <div className={`rounded-xl border p-3 text-sm ${tone}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold">{headline}</p>
          {canRestoreJornada && onRestoreJornada ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={onRestoreJornada}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Volver a la jornada OSI
            </Button>
          ) : null}
        </div>
        {analysis ? (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-white/70 p-2 text-center text-xs text-slate-800">
            <div>
              <p className="font-medium uppercase tracking-wide text-slate-500">
                Jornada OSI
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {usd(analysis.cost_osi)}
              </p>
            </div>
            <div>
              <p className="font-medium uppercase tracking-wide text-slate-500">
                Pedido ahora
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {usd(analysis.cost_req)}
              </p>
            </div>
            <div>
              <p className="font-medium uppercase tracking-wide text-slate-500">
                Extra
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {usd(analysis.extra)}
              </p>
            </div>
          </div>
        ) : null}
        <p className="mt-2 leading-relaxed">{detail}</p>
        {analysis &&
        analysis.extra > 0 &&
        analysis.sessions_total > 1 ? (
          <p className="mt-2 rounded-md border border-dashed border-current/30 bg-white/50 px-2 py-1.5 text-xs leading-relaxed">
            {analysis.sessions_open > 0
              ? "Esta OSI tiene otros días sin requisición. El extra de este pedido se toma de un aire compartido: puede dejar menos margen para la sesión siguiente."
              : analysis.sibling_reqs > 0
                ? "Otra requisición de esta OSI ya pidió de más. Este pedido se evalúa con el aire que queda, no con el de toda la orden."
                : "Hay más de un día en esta OSI. El extra de este pedido se toma de un aire compartido entre sesiones."}
          </p>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">
        <Link
          href="/requisiciones/manual#manual-costo-operador"
          className="font-medium text-sky-800 underline underline-offset-2"
        >
          Cómo se lee este recuadro
        </Link>
      </p>
      {show_justificacion ? (
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-800">
            Justificación (obligatoria)
          </label>
          <Textarea
            value={justification}
            onChange={(event) => onJustificationChange(event.target.value)}
            className="min-h-[72px] text-sm border-gray-300"
            placeholder={
              estado === "aprobacion"
                ? "Explica el extra. Esta requisición quedará sujeta a aprobación."
                : "Explica por qué este ajuste riesgoso es necesario."
            }
          />
        </div>
      ) : null}
    </div>
  );
}
