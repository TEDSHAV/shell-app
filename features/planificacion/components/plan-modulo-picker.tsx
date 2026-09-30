"use client";

import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppGlyph } from "./plan-app-glyph";
import { plan_app_visual } from "../lib/plan-app-visual";
import type { PlanApp, PlanModulo } from "../lib/types";

function modulo_app_ids(modulo: PlanModulo): number[] {
  return modulo.app_ids.length > 0 ? modulo.app_ids : [modulo.app_id];
}

export function PlanModuloPicker({
  apps,
  modulos,
  app_ids,
  value,
  onChange,
}: {
  apps: PlanApp[];
  modulos: PlanModulo[];
  app_ids: number[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const selected = new Set(value);
  const filtered = modulos.filter((modulo) => {
    const ids = modulo_app_ids(modulo);
    if (app_ids.length === 0) return true;
    return ids.some((id) => app_ids.includes(id));
  });
  const unique = filtered.filter(
    (modulo, index, list) => list.findIndex((item) => item.id === modulo.id) === index,
  );

  function toggle(id: number) {
    if (selected.has(id)) onChange(value.filter((item) => item !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange([])}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition",
          value.length === 0
            ? "border-violet-200 bg-violet-50 text-violet-800"
            : "border-slate-200 bg-white text-slate-600 hover:border-violet-200",
        )}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Plus className="h-4 w-4" />
        </span>
        Nuevo módulo
        {value.length === 0 ? <Check className="h-4 w-4" /> : null}
      </button>
      {unique.map((modulo) => {
        const ids = modulo_app_ids(modulo);
        const linked = apps.filter((app) => ids.includes(app.id));
        const active = selected.has(modulo.id);
        const accent = plan_app_visual(linked[0]?.slug).brandColor;
        return (
          <button
            key={modulo.id}
            type="button"
            onClick={() => toggle(modulo.id)}
            className={cn(
              "inline-flex max-w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm font-medium transition",
              active
                ? "border-slate-300 bg-slate-50"
                : "border-slate-200 bg-white hover:border-violet-200",
            )}
            style={
              active
                ? { boxShadow: `inset 0 0 0 1px ${accent}33` }
                : undefined
            }
          >
            <span className="flex -space-x-1.5">
              {(linked.length > 0 ? linked.slice(0, 3) : [null]).map((app, index) => (
                <span key={app?.id ?? `empty-${index}`} className="relative">
                  <AppGlyph slug={app?.slug ?? null} size="sm" />
                </span>
              ))}
            </span>
            <span className="min-w-0 truncate">{modulo.nombre}</span>
            {active ? (
              <Check className="h-4 w-4 shrink-0" style={{ color: accent }} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
