"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileDown,
  Link2,
  MoreHorizontal,
  Plus,
  Upload,
  UserPlus,
} from "lucide-react";
import { download_plan_overview_pdf } from "../lib/download-plan-pdf";
import type { PlanApp } from "../lib/types";

export function PlanActionsMenu({
  select_mode,
  export_apps,
  anio,
  on_assign,
  on_new_app,
  on_share,
}: {
  select_mode: boolean;
  export_apps: PlanApp[];
  anio: number;
  on_assign: () => void;
  on_new_app: () => void;
  on_share: () => void;
}) {
  const [open, set_open] = useState(false);
  const [exporting, set_exporting] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function on_doc(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) set_open(false);
    }
    document.addEventListener("mousedown", on_doc);
    return () => document.removeEventListener("mousedown", on_doc);
  }, [open]);

  async function on_export() {
    if (export_apps.length === 0) return;
    set_exporting(true);
    try {
      await download_plan_overview_pdf({ apps: export_apps, anio });
    } finally {
      set_exporting(false);
      set_open(false);
    }
  }

  const item =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => set_open((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
        Más
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            className={item}
            onClick={() => {
              set_open(false);
              on_assign();
            }}
          >
            <UserPlus className="h-4 w-4 text-slate-400" />
            {select_mode ? "Asignando…" : "Asignar responsables"}
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              set_open(false);
              on_share();
            }}
          >
            <Link2 className="h-4 w-4 text-slate-400" />
            Foto pública
          </button>
          <button
            type="button"
            className={item}
            disabled={exporting || export_apps.length === 0}
            onClick={() => void on_export()}
          >
            <FileDown className="h-4 w-4 text-slate-400" />
            {exporting ? "Generando PDF…" : "Exportar PDF"}
          </button>
          <Link
            href="/ted/planificacion/importar"
            className={item}
            onClick={() => set_open(false)}
          >
            <Upload className="h-4 w-4 text-slate-400" />
            Cargar Excel
          </Link>
          <button
            type="button"
            className={item}
            onClick={() => {
              set_open(false);
              on_new_app();
            }}
          >
            <Plus className="h-4 w-4 text-slate-400" />
            Nueva app
          </button>
        </div>
      ) : null}
    </div>
  );
}
