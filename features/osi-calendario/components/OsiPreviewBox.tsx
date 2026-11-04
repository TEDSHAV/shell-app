"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Expand, Loader2, MoveHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { OsiDocumentView, type OsiPreviewData } from "@sha/osi-formato";

import { getOSIPreviewData } from "../actions/osi-preview-actions";

const ASSETS = { logoSrc: "/osi/a3.png", footerSrc: "/osi/pie-horizontal.png" };
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;

function acotar(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

/** Siguiente o anterior múltiplo de 10 %, para que los pasos queden redondos tras «Ajustar». */
function paso(z: number, dir: 1 | -1): number {
  const decimas = dir > 0 ? Math.floor(z * 10 + 1e-6) + 1 : Math.ceil(z * 10 - 1e-6) - 1;
  return acotar(decimas / 10);
}

/**
 * Formato OSI con scroll dentro del detalle de la sesión. Arranca ajustado al ancho de la caja;
 * − / + acercan o alejan y «Ajustar» vuelve al ancho. «Expandir» abre la vista completa.
 */
export default function OsiPreviewBox({ osiId, hrefCompleta }: { osiId: number; hrefCompleta: string }) {
  const [data, set_data] = useState<OsiPreviewData | null>(null);
  const [error, set_error] = useState<string | null>(null);
  const [zoom, set_zoom] = useState(0.8);
  const caja = useRef<HTMLDivElement>(null);
  const documento = useRef<HTMLDivElement>(null);
  const ajustado = useRef(false);

  useEffect(() => {
    let vivo = true;
    set_data(null);
    set_error(null);
    ajustado.current = false;
    void getOSIPreviewData(osiId).then((res) => {
      if (!vivo) return;
      if (res.ok) set_data(res.data);
      else set_error(res.error);
    });
    return () => {
      vivo = false;
    };
  }, [osiId]);

  /** Zoom que hace caber el ancho del documento en la caja (sin scroll horizontal). */
  const ajustar = useCallback(() => {
    const c = caja.current;
    const d = documento.current;
    if (!c || !d) return;
    // getBoundingClientRect da el ancho ya escalado por `zoom`.
    const ancho_natural = d.getBoundingClientRect().width / zoom;
    if (ancho_natural > 0) set_zoom(acotar((c.clientWidth - 24) / ancho_natural));
  }, [zoom]);

  // Primer render del documento: ajustarlo al ancho.
  useLayoutEffect(() => {
    if (!data || ajustado.current) return;
    ajustado.current = true;
    ajustar();
  }, [data, ajustar]);

  const boton = "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:opacity-40";

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5">
        <span className="mr-auto pl-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Formato OSI</span>
        {data ? (
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5">
            <button type="button" onClick={() => set_zoom((z) => paso(z, -1))} disabled={zoom <= ZOOM_MIN} className={boton} aria-label="Alejar" title="Alejar">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-11 text-center text-xs font-medium tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => set_zoom((z) => paso(z, 1))} disabled={zoom >= ZOOM_MAX} className={boton} aria-label="Acercar" title="Acercar">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" onClick={ajustar} className={boton} aria-label="Ajustar al ancho" title="Ajustar al ancho">
              <MoveHorizontal className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <Link
          href={hrefCompleta}
          className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-50"
        >
          <Expand className="h-3.5 w-3.5" /> Expandir
        </Link>
      </div>
      <div ref={caja} className="h-[22rem] overflow-auto lg:h-[30rem]">
        {data ? (
          <div ref={documento} className="w-max p-3" style={{ zoom }}>
            <OsiDocumentView data={data} assets={ASSETS} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            {error ?? <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
          </div>
        )}
      </div>
    </div>
  );
}
