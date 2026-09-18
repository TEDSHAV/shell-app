"use client";

import { useEffect, useState } from "react";
import { Check, Copy, FileDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanModal } from "./plan-modal";
import { create_prisma_public_link } from "../actions/share-plan";
import { download_plan_overview_pdf } from "../lib/download-plan-pdf";
import type { PlanApp } from "../lib/types";
import { current_ve_year } from "../lib/gantt";

export function PlanShareModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [busy, set_busy] = useState(false);
  const [url, set_url] = useState<string | null>(null);
  const [snapshot_apps, set_snapshot_apps] = useState<PlanApp[]>([]);
  const [captured_at, set_captured_at] = useState<string | null>(null);
  const [copied, set_copied] = useState(false);
  const [pdf_busy, set_pdf_busy] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      set_url(null);
      set_snapshot_apps([]);
      set_captured_at(null);
      set_copied(false);
      set_error(null);
      set_busy(false);
      set_pdf_busy(false);
    }
  }, [open]);

  async function generate() {
    set_busy(true);
    set_error(null);
    set_copied(false);
    const result = await create_prisma_public_link();
    set_busy(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    set_url(result.url);
    set_snapshot_apps(result.apps);
    set_captured_at(result.captured_at);
  }

  async function download_pdf() {
    if (snapshot_apps.length === 0) return;
    set_pdf_busy(true);
    set_error(null);
    try {
      await download_plan_overview_pdf({
        apps: snapshot_apps,
        anio: current_ve_year(),
        captured_at,
      });
    } catch {
      set_error("No se pudo generar el PDF de esta foto.");
    } finally {
      set_pdf_busy(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      set_copied(true);
      window.setTimeout(() => set_copied(false), 2500);
    } catch {
      set_error("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  return (
    <PlanModal
      open={open}
      title="Foto pública del plan"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {url ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="mr-auto"
                disabled={pdf_busy || snapshot_apps.length === 0}
                onClick={() => void download_pdf()}
              >
                <FileDown className="mr-1.5 h-4 w-4" />
                {pdf_busy ? "PDF…" : "Descargar PDF de esta foto"}
              </Button>
              <Button
                type="button"
                className="bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => void copy()}
              >
                {copied ? "Copiado" : "Copiar enlace"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={busy}
              onClick={() => void generate()}
            >
              {busy ? "Generando…" : "Generar enlace"}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          Crea una <span className="font-semibold text-slate-800">foto</span>{" "}
          del plan en este momento: módulos, tareas y avances tal como están
          ahora.
        </p>
        <p>
          Quien tenga el enlace puede verla <span className="font-semibold text-slate-800">sin iniciar sesión</span>.
          No podrá editar. Si el plan cambia después, genera otra foto: este
          enlace no se actualiza solo.
        </p>
        {url ? (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Enlace para compartir
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800"
              />
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                onClick={() => void copy()}
                aria-label="Copiar enlace"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900"
            >
              <Link2 className="h-3.5 w-3.5" />
              Abrir en una pestaña
            </a>
            <p className="text-xs text-slate-500">
              El PDF se arma con esta foto, no con el plan en vivo.
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            Pulsa <span className="font-semibold">Generar enlace</span> para
            obtener la URL.
          </p>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </PlanModal>
  );
}
