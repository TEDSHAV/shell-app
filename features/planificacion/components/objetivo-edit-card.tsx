"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlanAppPicker, type PlanAppPickerItem } from "./plan-app-picker";
import { PlanField, PLAN_INPUT_CLASS } from "./plan-form-ui";
import { SearchSelect } from "./search-select";
import type { ObjetivoDraft } from "../lib/objetivo-draft";
import type { PlanObjetivoEstado, PlanUsuarioOption } from "../lib/types";
import { cn } from "@/lib/utils";

const ESTADOS: Array<{ value: PlanObjetivoEstado; label: string }> = [
  { value: "abierto", label: "Abierto" },
  { value: "cumplido", label: "Cumplido" },
  { value: "cancelado", label: "Cancelado" },
];

export function ObjetivoEditCard({
  draft,
  apps,
  usuarios,
  numero,
  index,
  onChange,
  onRemove,
  onMove,
}: {
  draft: ObjetivoDraft;
  apps: PlanAppPickerItem[];
  usuarios: PlanUsuarioOption[];
  numero: number;
  index: number;
  onChange: (patch: Partial<ObjetivoDraft>) => void;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const [over, set_over] = useState(false);
  return (
    <article
      onDragOver={(event) => {
        event.preventDefault();
        set_over(true);
      }}
      onDragLeave={() => set_over(false)}
      onDrop={(event) => {
        event.preventDefault();
        set_over(false);
        const from = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(from)) onMove(from, index);
      }}
      className={cn(
        "space-y-4 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm ring-1 ring-violet-50",
        over ? "ring-2 ring-violet-400" : "",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          draggable
          aria-label={`Arrastrar objetivo ${numero}`}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", String(index));
            event.dataTransfer.effectAllowed = "move";
          }}
          className="inline-flex h-9 w-8 cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-violet-700 px-2 text-sm font-bold tabular-nums text-white">
          {numero}
        </span>
        <p className="text-xs font-medium text-slate-400">Objetivo {numero}</p>
      </div>
      <PlanField label="Título" htmlFor={`obj-t-${draft.key}`}>
        <Input
          id={`obj-t-${draft.key}`}
          required
          className={PLAN_INPUT_CLASS}
          value={draft.titulo}
          onChange={(event) => onChange({ titulo: event.target.value })}
          placeholder="Qué hay que lograr"
        />
      </PlanField>
      <PlanField label="Descripción" htmlFor={`obj-d-${draft.key}`}>
        <Textarea
          id={`obj-d-${draft.key}`}
          value={draft.descripcion}
          onChange={(event) => onChange({ descripcion: event.target.value })}
          rows={4}
          placeholder="Contexto o criterio de éxito"
          className="rounded-xl border-slate-200 bg-slate-50"
        />
      </PlanField>
      <div className="grid gap-4 sm:grid-cols-2">
        <PlanField label="App" hint="Vacío = transversal">
          <PlanAppPicker
            apps={apps}
            value={draft.app_ids}
            onChange={(app_ids) => onChange({ app_ids })}
          />
        </PlanField>
        <PlanField label="Solicitado por" hint="Gerencia (Liliana / Pedro). Vacío = tú.">
          <SearchSelect
            value={draft.solicitado_por ? String(draft.solicitado_por) : ""}
            placeholder="Quién lo pidió"
            searchPlaceholder="Buscar persona…"
            onChange={(value) =>
              onChange({
                solicitado_por: value ? Number(value) : null,
              })
            }
            options={[
              { value: "", label: "Yo (quien registra)" },
              ...usuarios.map((user) => ({
                value: String(user.id),
                label: user.label,
              })),
            ]}
          />
        </PlanField>
      </div>
      <PlanField label="Estado">
        <div className="grid grid-cols-3 gap-2">
          {ESTADOS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange({ estado: item.value })}
              className={cn(
                "rounded-xl px-2 py-2 text-xs font-bold",
                draft.estado === item.value
                  ? "bg-violet-700 text-white"
                  : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </PlanField>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs font-semibold text-red-600 hover:underline"
      >
        Quitar de este plan
      </button>
    </article>
  );
}
