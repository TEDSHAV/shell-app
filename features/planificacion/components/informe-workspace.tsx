"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileDown, Link2, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlanMonthPicker } from "./plan-month-picker";
import { OrigenBadge } from "./origen-badge";
import { PlanAssigneeStack } from "./plan-assignee-chip";
import { InformeAnalisisFormView } from "./informe-analisis-form";
import { InformeTareaViewDialog } from "./informe-tarea-view-dialog";
import { download_informe_pdf } from "../lib/informe-pdf";
import { create_informe_public_link } from "../actions/share-plan";
import { save_informe_analisis } from "../actions/informe-actions";
import type { InformeMonth } from "../lib/informe-types";
import {
  export_informe_excel_kpi,
  export_informe_excel_sig,
} from "../actions/informe-export-actions";
import { download_base64_xlsx } from "../lib/download-informe-excel";
import {
  build_analisis_form_draft,
  format_analisis_for_display,
  merge_analisis_with_draft,
  parse_analisis_texto,
  serialize_analisis_form,
  type InformeAnalisisForm,
} from "../lib/informe-analisis";
import {
  compromiso_pct_from,
  filter_informe_objetivos,
  filter_informe_plus,
  informe_tabs,
  type InformeTabId,
} from "../lib/informe-scope";
import { format_month_label } from "../lib/plan-month";
import { empty_plan_mes } from "../lib/plan-mes";
import { PlanMesBadge } from "./plan-mes-badge";
import type { PlanTarea } from "../lib/types";

type ViewTarea = {
  tarea: PlanTarea;
  app_nombre?: string | null;
  modulo_nombre?: string | null;
};

type ExportKind = "pdf" | "kpi" | "sig";

export function InformeWorkspace({
  data,
  read_only = false,
  snapshot_at = null,
}: {
  data: InformeMonth;
  read_only?: boolean;
  snapshot_at?: string | null;
}) {
  const [tab, set_tab] = useState<InformeTabId>("general");
  const [export_busy, set_export_busy] = useState<ExportKind | null>(null);
  const [share_url, set_share_url] = useState<string | null>(null);
  const [share_error, set_share_error] = useState<string | null>(null);
  const [share_busy, set_share_busy] = useState(false);
  const [export_error, set_export_error] = useState<string | null>(null);
  const [view_tarea, set_view_tarea] = useState<ViewTarea | null>(null);

  const tabs = useMemo(() => informe_tabs(data), [data]);
  const objetivos = useMemo(
    () => filter_informe_objetivos(data.objetivos, tab),
    [data.objetivos, tab],
  );
  const plus = useMemo(
    () => filter_informe_plus(data.plus, tab),
    [data.plus, tab],
  );
  const compromiso_pct = useMemo(
    () => compromiso_pct_from(objetivos),
    [objetivos],
  );
  const plus_count = plus.length;

  const draft = useMemo(
    () =>
      build_analisis_form_draft(data.mes, data.objetivos, data.plus),
    [data.mes, data.objetivos, data.plus],
  );

  const [form, set_form] = useState<InformeAnalisisForm>(() =>
    merge_analisis_with_draft(parse_analisis_texto(data.analisis_texto), draft),
  );
  const [analisis_saved, set_analisis_saved] = useState(() =>
    Boolean(data.analisis_texto?.trim()),
  );
  const [analisis_busy, set_analisis_busy] = useState(false);
  const [analisis_error, set_analisis_error] = useState<string | null>(null);
  const [analisis_ok, set_analisis_ok] = useState<string | null>(null);
  const plan_mes = data.plan_mes ?? empty_plan_mes(data.mes);

  const analisis_display = format_analisis_for_display(form);
  const busy = export_busy !== null;
  const tab_btn =
    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ease-out";

  async function run_export(kind: ExportKind) {
    set_export_busy(kind);
    set_export_error(null);
    try {
      if (kind === "pdf") {
        await download_informe_pdf({
          ...data,
          analisis_texto: serialize_analisis_form(form),
        });
        return;
      }
      const result =
        kind === "kpi"
          ? await export_informe_excel_kpi(data.mes)
          : await export_informe_excel_sig(data.mes);
      if (!result.ok) {
        set_export_error(result.error);
        return;
      }
      download_base64_xlsx(result.filename, result.base64);
    } finally {
      set_export_busy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
              Informe
            </h1>
            {read_only ? null : <PlanMesBadge plan={plan_mes} />}
          </div>
          <p className="mt-0.5 text-sm text-slate-400">
            {read_only
              ? `Foto · ${format_month_label(data.mes)}${
                  snapshot_at
                    ? ` · ${snapshot_at.slice(0, 16).replace("T", " ")}`
                    : ""
                }`
              : "Cierre automático del periodo"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {read_only ? null : <PlanMonthPicker mes={data.mes} />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={busy}
              >
                <FileDown className="mr-1 h-4 w-4" />
                {busy ? "Exportando…" : "Exportar"}
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-1.5">
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Formatos
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5"
                disabled={busy}
                onSelect={() => void run_export("pdf")}
              >
                <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <span className="min-w-0 space-y-0.5">
                  <span className="block font-medium text-slate-900">
                    PDF del informe
                  </span>
                  <span className="block text-xs leading-snug text-slate-500">
                    Vista del mes con compromiso, plus y observaciones para
                    compartir o imprimir.
                  </span>
                </span>
              </DropdownMenuItem>

              {read_only ? null : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Excel FI-TED
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5"
                    disabled={busy}
                    onSelect={() => void run_export("kpi")}
                  >
                    <Sheet className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block font-medium text-slate-900">
                        KPI comparativo (analistas)
                      </span>
                      <span className="block text-xs leading-snug text-slate-500">
                        Tablero anual lado a lado por analista TED: % vs meta,
                        gráfica y análisis por persona.
                      </span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5"
                    disabled={busy}
                    onSelect={() => void run_export("sig")}
                  >
                    <Sheet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block font-medium text-slate-900">
                        Indicador SIG
                      </span>
                      <span className="block text-xs leading-snug text-slate-500">
                        Cumplimiento agregado del departamento (SIG) con
                        gráfica y observaciones del mes.
                      </span>
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
      {export_error ? (
        <p className="text-sm text-red-600">{export_error}</p>
      ) : null}
      {share_url ? (
        <p className="break-all rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          {share_url}
        </p>
      ) : null}

      {tabs.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100/80 p-1.5">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={String(item.id)}
                type="button"
                onClick={() => set_tab(item.id)}
                className={`${tab_btn} ${
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {data.unpublished_hidden ? (
        <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-6 py-10 text-center text-sm text-amber-800">
          Gerencia aún no emitió el plan de este mes. El compromiso se muestra
          cuando el plan está publicado.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-200 bg-violet-600 px-4 py-4 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-100">
            Compromiso
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {compromiso_pct}%
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Plus adicional
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {plus_count}
          </p>
        </div>
      </div>

      {read_only && analisis_display ? (
        <p className="sr-only">{analisis_display}</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Compromiso
        </h2>
        {data.unpublished_hidden ? (
          <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-8 text-center text-sm text-amber-800">
            Gerencia aún no emitió el plan.
          </p>
        ) : objetivos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            {tab === "general"
              ? "No hubo objetivos planteados este mes."
              : "Este responsable no tiene objetivos en el mes."}
          </p>
        ) : (
          objetivos.map((objetivo) => (
            <article
              key={objetivo.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">
                    {objetivo.titulo}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {format_month_label(objetivo.fecha_inicio.slice(0, 7))}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-2xl font-bold tabular-nums">
                    {objetivo.avance}%
                  </span>
                  <PlanAssigneeStack people={objetivo.responsables} max={4} />
                </div>
              </div>
              {objetivo.tareas.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  Sin tareas colgadas.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {objetivo.tareas.map((tarea) => (
                    <li key={tarea.id}>
                      <button
                        type="button"
                        className="flex w-full flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                        onClick={() =>
                          set_view_tarea({
                            tarea: {
                              ...tarea,
                              objetivo_titulo:
                                tarea.objetivo_titulo ?? objetivo.titulo,
                            },
                            app_nombre: objetivo.app_nombre,
                          })
                        }
                      >
                        <span className="min-w-0 flex-1 font-medium">
                          {tarea.titulo}
                        </span>
                        <OrigenBadge origen={tarea.origen} />
                        <span className="text-xs font-semibold tabular-nums text-slate-500">
                          {tarea.avance}%
                        </span>
                      </button>
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
        {plus.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            {tab === "general"
              ? "Nada extra completado fuera de los objetivos."
              : "Sin plus adicional para este responsable."}
          </p>
        ) : (
          <ul className="space-y-2">
            {plus.map((item) => {
              const can_open = Boolean(item.tarea);
              const row = (
                <>
                  <span className="min-w-0 flex-1 font-medium text-slate-800">
                    {item.titulo}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.app_nombre} · {item.modulo_nombre}
                  </span>
                  <OrigenBadge origen={item.origen} />
                </>
              );
              return (
                <li key={item.id}>
                  {can_open ? (
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm transition hover:border-violet-200 hover:bg-violet-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                      onClick={() =>
                        set_view_tarea({
                          tarea: item.tarea!,
                          app_nombre: item.app_nombre,
                          modulo_nombre: item.modulo_nombre,
                        })
                      }
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      {row}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <InformeAnalisisFormView
        mes={data.mes}
        form={form}
        read_only={read_only}
        busy={analisis_busy}
        error={analisis_error}
        ok={analisis_ok}
        default_open={!read_only}
        on_change={(next) => {
          set_form(next);
          set_analisis_ok(null);
        }}
        on_reset_draft={() => {
          if (
            analisis_saved &&
            !window.confirm(
              "¿Restaurar el borrador? Se perderán los cambios no guardados.",
            )
          ) {
            return;
          }
          set_form(draft);
          set_analisis_ok(null);
        }}
        on_save={() => {
          void (async () => {
            set_analisis_busy(true);
            set_analisis_error(null);
            set_analisis_ok(null);
            const result = await save_informe_analisis(
              data.mes,
              serialize_analisis_form(form),
            );
            set_analisis_busy(false);
            if (!result.ok) {
              set_analisis_error(result.error);
              return;
            }
            set_analisis_saved(Boolean(result.analisis_texto.trim()));
            set_analisis_ok("Análisis guardado.");
          })();
        }}
      />

      <InformeTareaViewDialog
        open={Boolean(view_tarea)}
        tarea={view_tarea?.tarea ?? null}
        app_nombre={view_tarea?.app_nombre}
        modulo_nombre={view_tarea?.modulo_nombre}
        onClose={() => set_view_tarea(null)}
      />
    </div>
  );
}
