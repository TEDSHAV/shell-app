"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const AVANCE_PRESETS = [0, 25, 50, 75, 100];

export function TareaAvanceCard({
  pct,
  label,
  tone,
  icon,
  no_solicitada,
  can_write,
  saving,
  error,
  on_change,
  on_save,
  on_cancel,
  dirty,
}: {
  pct: number;
  label: string;
  tone: string;
  icon: ReactNode;
  no_solicitada: boolean;
  can_write: boolean;
  saving: boolean;
  error: string | null;
  on_change: (value: number) => void;
  on_save: () => void;
  on_cancel: () => void;
  dirty: boolean;
}) {
  const show_actions = can_write && !no_solicitada && dirty;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Avance
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
            {no_solicitada ? "—" : `${pct}%`}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}
        >
          {icon}
          {label}
        </span>
      </div>
      {no_solicitada ? (
        <p className="mt-3 text-sm text-slate-500">
          Esta tarea no cuenta en el porcentaje del plan.
        </p>
      ) : (
        <>
          <div className="relative mt-4 h-6">
            <div className="absolute top-1/2 h-2.5 w-full -translate-y-1/2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-violet-600"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-600 shadow"
              style={{ left: `${pct}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              disabled={!can_write || saving}
              value={pct}
              onChange={(event) => on_change(Number(event.target.value))}
              className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-default"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {can_write
              ? AVANCE_PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={saving}
                    onClick={() => on_change(value)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      pct === value
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {value}%
                  </button>
                ))
              : null}
            {show_actions ? (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="px-4"
                  disabled={saving}
                  onClick={on_cancel}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-violet-600 px-4 text-white hover:bg-violet-500"
                  disabled={saving}
                  onClick={on_save}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            100% deja la tarea como completada.
          </p>
        </>
      )}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
