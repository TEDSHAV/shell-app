"use client";

import { useState } from "react";
import { FileDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanMonthPicker } from "./plan-month-picker";
import { OrigenBadge } from "./origen-badge";
import { format_objetivo_date } from "../lib/display";
import { download_informe_pdf } from "../lib/informe-pdf";
import { create_informe_public_link } from "../actions/share-plan";
import type { InformeMonth } from "../actions/informe-actions";
import { format_month_label } from "../lib/plan-month";

export function InformeWorkspace({
  data,
  read_only = false,
  snapshot_at = null,
}: {
  data: InformeMonth;
  read_only?: boolean;
  snapshot_at?: string | null;
}) {
  const [pdf_busy, set_pdf_busy] = useState(false);
  const [share_url, set_share_url] = useState<string | null>(null);
  const [share_error, set_share_error] = useState<string | null>(null);
  const [share_busy, set_share_busy] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
            Informe
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {read_only
              ? `Foto · ${format_month_label(data.mes)}${
                  snapshot_at ? ` · ${snapshot_at.slice(0, 16).replace("T", " ")}` : ""
                }`
              : "Cierre automático del periodo"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {read_only ? null : <PlanMonthPicker mes={data.mes} />}
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={pdf_busy}
            onClick={() => {
              void (async () => {
                set_pdf_busy(true);
                await download_informe_pdf(data);
                set_pdf_busy(false);
              })();
            }}
          >
            <FileDown className="mr-1 h-4 w-4" />
            {pdf_busy ? "PDF…" : "PDF"}
          </Button>
          {read_only ? null : (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={share_busy}
              onClick={() => {
                void (async () => {
                  set_share_busy(true);
                  set_share_error(null);
                  const result = await create_informe_public_link(data.mes);
                  set_share_busy(false);
                  if (!result.ok) {
                    set_share_error(result.error);
                    return;
                  }
                  set_share_url(result.url);
                })();
              }}
            >
              <Link2 className="mr-1 h-4 w-4" />
              Foto pública
            </Button>
          )}
        </div>
      </div>

      {share_error ? (
        <p className="text-sm text-red-600">{share_error}</p>
      ) : null}
      {share_url ? (
        <p className="break-all rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          {share_url}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-200 bg-violet-600 px-4 py-4 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-100">
            Compromiso
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{data.compromiso_pct}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Plus adicional
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {data.plus_count}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Compromiso
        </h2>
        {data.objetivos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No hubo objetivos planteados este mes.
          </p>
        ) : (
          data.objetivos.map((objetivo) => (
            <article
              key={objetivo.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{objetivo.titulo}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {format_objetivo_date(objetivo.fecha_inicio)} –{" "}
                    {format_objetivo_date(objetivo.fecha_fin)}
                  </p>
                </div>
                <span className="text-2xl font-bold tabular-nums">{objetivo.avance}%</span>
              </div>
              {objetivo.tareas.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Sin tareas colgadas.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {objetivo.tareas.map((tarea) => (
                    <li
                      key={tarea.id}
                      className="flex flex-wrap items-center gap-2 text-sm text-slate-700"
                    >
                      <span className="min-w-0 flex-1">{tarea.titulo}</span>
                      <OrigenBadge origen={tarea.origen} />
                      <span className="text-xs font-semibold tabular-nums text-slate-500">
                        {tarea.avance}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Plus adicional
        </h2>
        {data.plus.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            Nada extra completado fuera de los objetivos.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.plus.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 font-medium text-slate-800">
                  {item.titulo}
                </span>
                <span className="text-xs text-slate-400">
                  {item.app_nombre} · {item.modulo_nombre}
                </span>
                <OrigenBadge origen={item.origen} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
