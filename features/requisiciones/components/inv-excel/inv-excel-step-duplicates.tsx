"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { InvExcelCatalogItem, InvExcelRow } from "../../lib/excel-inventario";
import type {
  InvExcelDupConflict,
  InvExcelDupDecision,
} from "../../lib/inv-excel-similar";

export function InvExcelStepDuplicates({
  conflicts,
  catalog,
  on_change,
}: {
  conflicts: InvExcelDupConflict[];
  catalog: InvExcelCatalogItem[];
  on_change: (row: number, patch: Partial<InvExcelDupConflict>) => void;
}) {
  if (conflicts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-8 text-center">
        <p className="text-base font-semibold text-emerald-900">
          Sin conflictos de duplicados
        </p>
        <p className="mt-1 text-sm text-emerald-800/80">
          No hay nombres similares ni colisiones en el Excel. Continúa a
          clasificar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Hay {conflicts.length} fila(s) con posibles duplicados. Elegí qué hacer
        en cada una antes de clasificar.
      </p>
      <ul className="space-y-4">
        {conflicts.map((conflict) => (
          <li
            key={conflict.row}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-gray-900">
              Fila {conflict.row}: {conflict.concepto}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {conflict.kind === "excel_collision"
                ? `Misma clave en filas ${conflict.excel_peers.join(", ")}`
                : conflict.kind === "exact"
                  ? "Match exacto (varios o inactivo)"
                  : "Nombre similar en catálogo"}
            </p>
            {conflict.candidates.length > 0 ? (
              <ul className="mt-2 space-y-1 rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
                {conflict.candidates.map((item) => (
                  <li key={item.id} className="flex flex-wrap gap-2">
                    <span className="font-medium">#{item.id}</span>
                    <span>{item.nombre_item}</span>
                    <span
                      className={
                        item.esta_activo ? "text-emerald-700" : "text-amber-700"
                      }
                    >
                      {item.esta_activo ? "Activo" : "Inactivo · reactivar"}
                    </span>
                    {item.unidad_label ? (
                      <span className="text-gray-500">{item.unidad_label}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <RadioGroup
              className="mt-3 gap-2"
              value={conflict.decision ?? ""}
              onValueChange={(value) => {
                const decision = value as InvExcelDupDecision;
                const chosen =
                  decision === "use_existing"
                    ? (conflict.chosen_id ??
                      conflict.candidates[0]?.id ??
                      null)
                    : null;
                on_change(conflict.row, { decision, chosen_id: chosen });
              }}
            >
              <label className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                <RadioGroupItem value="use_existing" className="mt-0.5" />
                <span>
                  <span className="font-medium">Usar / actualizar existente</span>
                  <span className="block text-xs text-gray-500">
                    Vincula al ítem del catálogo (reactiva si está inactivo).
                  </span>
                </span>
              </label>
              {conflict.decision === "use_existing" &&
              conflict.candidates.length > 1 ? (
                <div className="ml-7 space-y-1">
                  <Label className="text-xs">Cuál</Label>
                  <select
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={conflict.chosen_id ?? ""}
                    onChange={(event) =>
                      on_change(conflict.row, {
                        chosen_id: Number(event.target.value) || null,
                      })
                    }
                  >
                    {conflict.candidates.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} {item.nombre_item}
                        {item.esta_activo ? "" : " (inactivo)"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <label className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                <RadioGroupItem value="force_create" className="mt-0.5" />
                <span>
                  <span className="font-medium">Son conceptos distintos</span>
                  <span className="block text-xs text-gray-500">
                    Crear ítem nuevo aunque el nombre se parezca.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                <RadioGroupItem value="discard" className="mt-0.5" />
                <span>
                  <span className="font-medium">Descartar esta fila</span>
                  <span className="block text-xs text-gray-500">
                    No la carga en este lote.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400">
        Catálogo cargado: {catalog.length} ítems (activos e inactivos).
      </p>
    </div>
  );
}

export function apply_dup_decisions_to_rows(
  rows: InvExcelRow[],
  conflicts: InvExcelDupConflict[],
  included: Set<number>,
): { rows: InvExcelRow[]; included: Set<number> } {
  const by_row = new Map(conflicts.map((c) => [c.row, c]));
  const next_included = new Set(included);
  const next_rows = rows.map((row) => {
    const conflict = by_row.get(row.row);
    if (!conflict || !conflict.decision) return row;
    if (conflict.decision === "discard") {
      next_included.delete(row.row);
      return row;
    }
    if (conflict.decision === "force_create") {
      return {
        ...row,
        force_create: true,
        id_item_match: null,
        match_nombre: null,
        warning: null,
      };
    }
    const chosen =
      conflict.chosen_id ??
      conflict.candidates[0]?.id ??
      null;
    const hit = conflict.candidates.find((c) => c.id === chosen);
    return {
      ...row,
      force_create: false,
      id_item_match: chosen,
      match_nombre: hit?.nombre_item ?? row.match_nombre,
      id_unidad: row.id_unidad ?? hit?.id_unidad ?? null,
      warning: hit && !hit.esta_activo
        ? "Match inactivo: se reactivará al vincular"
        : null,
    };
  });
  return { rows: next_rows, included: next_included };
}
