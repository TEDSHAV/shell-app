"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { InformeAnalisisForm } from "../lib/informe-analisis";
import { format_analisis_for_display } from "../lib/informe-analisis";
import { format_month_label } from "../lib/plan-month";

export function InformeAnalisisFormView({
  mes,
  form,
  read_only,
  busy,
  error,
  ok,
  on_change,
  on_save,
  on_reset_draft,
  default_open = false,
}: {
  mes: string;
  form: InformeAnalisisForm;
  read_only?: boolean;
  busy?: boolean;
  error?: string | null;
  ok?: string | null;
  on_change: (next: InformeAnalisisForm) => void;
  on_save: () => void;
  on_reset_draft: () => void;
  /** En el informe interno suele ir cerrado al final; se abre al editar. */
  default_open?: boolean;
}) {
  const [open, set_open] = useState(default_open);
  const preview = format_analisis_for_display(form);

  function patch(partial: Partial<InformeAnalisisForm>) {
    on_change({ ...form, ...partial });
  }

  function patch_razon(objetivo_id: number, razones: string) {
    on_change({
      ...form,
      incumplimientos: form.incumplimientos.map((item) =>
        item.objetivo_id === objetivo_id ? { ...item, razones } : item,
      ),
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => set_open((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Análisis y evaluación
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {format_month_label(mes)} · Autocompletado · Campos opcionales
            {preview.trim() ? " · Con observaciones" : ""}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
          <div className="w-full rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-sm font-semibold text-violet-900">
              Vista previa de observaciones
            </p>
            <p className="mt-0.5 text-xs text-violet-700/80">
              Así quedará en Excel / PDF / foto según lo completado.
            </p>
            <pre className="mt-3 w-full whitespace-pre-wrap break-words rounded-lg bg-white px-4 py-3 font-sans text-sm leading-relaxed text-slate-700 ring-1 ring-violet-100">
              {preview.trim() ||
                "Aún no hay contenido. Regenera el auto-relleno o completa algún campo."}
            </pre>
          </div>

          {read_only ? null : (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={on_reset_draft}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Regenerar auto
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={on_save}
              >
                <Save className="mr-1 h-3.5 w-3.5" />
                {busy ? "Guardando…" : "Guardar análisis"}
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock
              title="Cumplimiento"
              hint="Autocompletado. Editable (opcional)."
            >
              {read_only ? (
                <ReadValue value={form.notas_cumplimiento} />
              ) : (
                <Textarea
                  value={form.notas_cumplimiento}
                  onChange={(e) =>
                    patch({ notas_cumplimiento: e.target.value })
                  }
                  rows={3}
                  className="rounded-xl border-slate-200 bg-slate-50/70 text-sm"
                  placeholder="Opcional — se rellena solo al regenerar"
                />
              )}
            </FieldBlock>

            <FieldBlock
              title="Extras"
              hint="Autocompletado. Editable (opcional)."
            >
              {read_only ? (
                <ReadValue value={form.notas_extras} />
              ) : (
                <Textarea
                  value={form.notas_extras}
                  onChange={(e) => patch({ notas_extras: e.target.value })}
                  rows={3}
                  className="rounded-xl border-slate-200 bg-slate-50/70 text-sm"
                  placeholder="Opcional"
                />
              )}
            </FieldBlock>
          </div>

          <FieldBlock
            title="Incumplimientos"
            hint="Objetivos pendientes. La razón es opcional."
          >
            {form.incumplimientos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-6 text-center text-sm text-emerald-800">
                No hay incumplimientos en este mes.
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {form.incumplimientos.map((item) => (
                  <li
                    key={item.objetivo_id}
                    className="rounded-xl border border-amber-100 bg-amber-50/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">
                        {item.titulo}
                      </p>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-800 ring-1 ring-amber-200">
                        {item.avance}%
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <Label className="text-xs text-slate-500">
                        Razones{" "}
                        <span className="font-normal text-slate-400">
                          (opcional)
                        </span>
                      </Label>
                      {read_only ? (
                        <ReadValue
                          value={item.razones}
                          empty="Sin razones añadidas"
                        />
                      ) : (
                        <Input
                          value={item.razones}
                          onChange={(e) =>
                            patch_razon(item.objetivo_id, e.target.value)
                          }
                          className="rounded-lg border-slate-200 bg-white text-sm"
                          placeholder="Recurso, dependencia, alcance…"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </FieldBlock>

          <FieldBlock
            title="Observaciones adicionales"
            hint="Campo libre opcional."
          >
            {read_only ? (
              <ReadValue
                value={form.observaciones}
                empty="Sin observaciones."
              />
            ) : (
              <Textarea
                value={form.observaciones}
                onChange={(e) => patch({ observaciones: e.target.value })}
                rows={3}
                className="rounded-xl border-slate-200 bg-slate-50/70 text-sm"
                placeholder="Cierre, riesgos, acuerdos…"
              />
            )}
          </FieldBlock>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function FieldBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/40 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function ReadValue({
  value,
  empty = "—",
}: {
  value: string;
  empty?: string;
}) {
  return (
    <p className="rounded-lg bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
      {value.trim() || empty}
    </p>
  );
}
