"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Expand, Loader2 } from "lucide-react";
import { OsiDocumentView, type OsiPreviewData } from "@sha/osi-formato";

import { getOSIPreviewData } from "../actions/osi-preview-actions";

const ASSETS = { logoSrc: "/osi/a3.png", footerSrc: "/osi/pie-horizontal.png" };

/** Formato OSI reducido con scroll, dentro del detalle de la sesión. «Expandir» abre la vista completa. */
export default function OsiPreviewBox({ osiId, hrefCompleta }: { osiId: number; hrefCompleta: string }) {
  const [data, set_data] = useState<OsiPreviewData | null>(null);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    set_data(null);
    set_error(null);
    void getOSIPreviewData(osiId).then((res) => {
      if (!vivo) return;
      if (res.ok) set_data(res.data);
      else set_error(res.error);
    });
    return () => {
      vivo = false;
    };
  }, [osiId]);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Formato OSI</span>
        <Link
          href={hrefCompleta}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-50"
        >
          <Expand className="h-3.5 w-3.5" /> Expandir
        </Link>
      </div>
      <div className="h-[22rem] overflow-auto lg:h-[30rem]">
        {data ? (
          <div className="origin-top p-2" style={{ zoom: 0.62 }}>
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
