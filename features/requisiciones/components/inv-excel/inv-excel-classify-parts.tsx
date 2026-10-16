"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import {
  fold_inv_label,
  row_needs_ejecutante,
  type InvEjecutante,
  type InvExcelRow,
  type InvObedece,
} from "../../lib/excel-inventario";
import type { InvExcelDepartamento } from "../../actions/import-inv-excel";
import { InvExcelUnidadSelect } from "./inv-excel-unidad-select";
import type { InvExcelUnidad } from "../../actions/import-inv-excel";

export const EJECUTANTE_OPTIONS: Array<{
  id: InvEjecutante;
  label: string;
}> = [
  { id: "capacitacion", label: "Capacitación (Cap)" },
  { id: "tecnico", label: "Servicios técnicos (ST)" },
];

export type ClassifyFocus =
  | "ejecutante"
  | "obedece"
  | "particulares"
  | "periodicidad"
  | "unidad";

export function matches_inv_query(concepto: string, query: string): boolean {
  const needle = fold_inv_label(query);
  if (!needle) return true;
  return fold_inv_label(concepto).includes(needle);
}

export function ClassifySectionHeader({
  step,
  title,
  hint,
  badge,
}: {
  step: number;
  title: string;
  hint: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {badge ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      </div>
    </div>
  );
}

export function ClassifySearchField({
  value,
  on_change,
  placeholder,
}: {
  value: string;
  on_change: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <Input
        value={value}
        onChange={(event) => on_change(event.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8 text-sm"
      />
    </div>
  );
}

export function EjecutanteChecks({
  value,
  on_change,
  compact,
}: {
  value: InvEjecutante[];
  on_change: (next: InvEjecutante[]) => void;
  compact?: boolean;
}) {
  function toggle(id: InvEjecutante, checked: boolean) {
    if (checked) {
      on_change([...new Set([...value, id])]);
      return;
    }
    on_change(value.filter((item) => item !== id));
  }

  return (
    <div className={compact ? "flex flex-col gap-1.5" : "flex flex-wrap gap-3"}>
      {EJECUTANTE_OPTIONS.map((opt) => {
        const checked = value.includes(opt.id);
        return (
          <label
            key={opt.id}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-800"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(state) => toggle(opt.id, state === true)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function FocusCell({
  focus,
  active,
  children,
}: {
  focus: ClassifyFocus;
  active: ClassifyFocus | ClassifyFocus[];
  children: ReactNode;
}) {
  const list = Array.isArray(active) ? active : [active];
  const on = list.includes(focus);
  return (
    <td
      className={cn(
        "px-3 py-2 align-top",
        on && "bg-amber-50 ring-2 ring-inset ring-amber-300",
      )}
    >
      {children}
    </td>
  );
}

export function ClassifyTableHead({
  focus,
  show_unidad,
}: {
  focus: ClassifyFocus | ClassifyFocus[];
  show_unidad?: boolean;
}) {
  const list = Array.isArray(focus) ? focus : [focus];
  function th(key: ClassifyFocus, label: string) {
    const on = list.includes(key);
    return (
      <th
        className={cn(
          "px-3 py-2",
          on && "bg-amber-100 text-amber-900",
        )}
      >
        {label}
        {on ? " ★" : ""}
      </th>
    );
  }
  return (
    <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
      <tr>
        <th className="px-3 py-2">Concepto</th>
        {th("obedece", "Obedece")}
        {th("ejecutante", "Depto. ejecutante")}
        {th("particulares", "Particulares")}
        {th("periodicidad", "Periodicidad")}
        {show_unidad ? th("unidad", "Unidad") : null}
      </tr>
    </thead>
  );
}

export function ClassifyDataRow({
  row,
  focus,
  ejecutantes_default,
  departamentos,
  unidades,
  id_unidad_default,
  resolved,
  show_unidad,
  on_patch_row,
}: {
  row: InvExcelRow;
  focus: ClassifyFocus | ClassifyFocus[];
  ejecutantes_default: InvEjecutante[];
  departamentos: InvExcelDepartamento[];
  unidades?: InvExcelUnidad[];
  id_unidad_default?: number | null;
  resolved?: boolean;
  show_unidad?: boolean;
  on_patch_row: (row: number, patch: Partial<InvExcelRow>) => void;
}) {
  const needs_ejec = row_needs_ejecutante(row);
  const needs_dept = row.obedece === "no" || row.obedece === "ambos";
  const ejecutantes =
    row.ejecutantes.length > 0 ? row.ejecutantes : ejecutantes_default;
  const [editing_part, set_editing_part] = useState(
    row.id_departamentos.length > 0,
  );
  const is_particular =
    editing_part || row.id_departamentos.length > 0;

  return (
    <tr
      className={
        resolved
          ? "border-t border-emerald-50 bg-emerald-50/20"
          : "border-t border-gray-50"
      }
    >
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-gray-900">{row.concepto}</p>
          {resolved != null ? (
            resolved ? (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                Listo
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Pendiente
              </span>
            )
          ) : null}
        </div>
        <p className="text-[11px] text-gray-400">
          Fila {row.row}
          {row.id_item_match ? ` · #${row.id_item_match}` : " · crear"}
          {row.modo_compra === "recurrente" ? " · suscripción" : ""}
        </p>
        {row.warning ? (
          <p className="mt-0.5 text-[11px] text-amber-700">{row.warning}</p>
        ) : null}
      </td>

      <FocusCell focus="obedece" active={focus}>
        <Select
          value={row.obedece ?? "unset"}
          onValueChange={(value: string) =>
            on_patch_row(row.row, {
              obedece: value === "unset" ? null : (value as InvObedece),
              ...(value === "no" ? { ejecutantes: [] } : {}),
              ...(value === "si" ? { id_departamentos: [] } : {}),
            })
          }
        >
          <SelectTrigger className="h-8 w-[8.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">—</SelectItem>
            <SelectItem value="no">NO (depto)</SelectItem>
            <SelectItem value="si">SI (Cap/ST)</SelectItem>
            <SelectItem value="ambos">AMBOS</SelectItem>
          </SelectContent>
        </Select>
      </FocusCell>

      <FocusCell focus="ejecutante" active={focus}>
        {needs_ejec ? (
          <div className="space-y-1">
            <EjecutanteChecks
              compact
              value={ejecutantes}
              on_change={(next) =>
                on_patch_row(row.row, { ejecutantes: next })
              }
            />
            {row.ejecutantes.length > 0 ? (
              <button
                type="button"
                className="text-[11px] text-sky-700 hover:underline"
                onClick={() =>
                  on_patch_row(row.row, { ejecutantes: [] })
                }
              >
                Usar default del lote
              </button>
            ) : (
              <p className="text-[10px] text-gray-400">Hereda del lote</p>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </FocusCell>

      <FocusCell focus="particulares" active={focus}>
        {needs_dept ? (
          <div className="min-w-[12rem] space-y-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={is_particular}
                onCheckedChange={(state) => {
                  if (state === true) {
                    set_editing_part(true);
                    return;
                  }
                  set_editing_part(false);
                  on_patch_row(row.row, { id_departamentos: [] });
                }}
              />
              <span className="text-gray-700">Solo algunos</span>
            </label>
            {is_particular ? (
              <MultiSelect
                options={departamentos.map((dept) => ({
                  id: dept.id,
                  label: dept.nombre,
                }))}
                selectedIds={row.id_departamentos}
                onChange={(ids) => {
                  set_editing_part(true);
                  on_patch_row(row.row, { id_departamentos: ids });
                }}
                placeholder="Elegir departamentos…"
                searchPlaceholder="Buscar departamento…"
              />
            ) : (
              <p className="text-[10px] text-gray-400">Todos los deptos</p>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </FocusCell>

      <FocusCell focus="periodicidad" active={focus}>
        {row.modo_compra === "recurrente" ? (
          <Select
            value={row.periodicidad ?? "unset"}
            onValueChange={(value: string) =>
              on_patch_row(row.row, {
                periodicidad:
                  value === "unset"
                    ? null
                    : (value as InvExcelRow["periodicidad"]),
              })
            }
          >
            <SelectTrigger className="h-8 w-[7.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">—</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </FocusCell>

      {show_unidad && unidades ? (
        <FocusCell focus="unidad" active={focus}>
          <InvExcelUnidadSelect
            unidades={unidades}
            value={row.id_unidad ?? id_unidad_default ?? null}
            on_change={(id) => on_patch_row(row.row, { id_unidad: id })}
            className="h-8 min-w-[8rem]"
            allow_none
            hint={false}
          />
        </FocusCell>
      ) : null}
    </tr>
  );
}
