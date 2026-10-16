"use client";

import { useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  row_has_hueco,
  row_is_departamental,
  row_needs_ejecutante,
  type InvEjecutante,
  type InvExcelRow,
} from "../../lib/excel-inventario";
import type {
  InvExcelDepartamento,
  InvExcelUnidad,
} from "../../actions/import-inv-excel";
import {
  ClassifyDataRow,
  ClassifySearchField,
  ClassifySectionHeader,
  ClassifyTableHead,
  EjecutanteChecks,
  matches_inv_query,
  type ClassifyFocus,
} from "./inv-excel-classify-parts";
import { InvExcelUnidadSelect } from "./inv-excel-unidad-select";

function focus_for_hueco(row: InvExcelRow): ClassifyFocus[] {
  const keys: ClassifyFocus[] = [];
  if (!row.obedece) keys.push("obedece");
  if (row.modo_compra === "recurrente" && !row.periodicidad) {
    keys.push("periodicidad");
  }
  if (keys.length === 0) keys.push("obedece");
  return keys;
}

export function InvExcelStepClassify({
  rows,
  included,
  ejecutantes_default,
  id_unidad_default,
  departamentos,
  unidades,
  on_ejecutantes_default,
  on_unidad_default,
  on_patch_row,
}: {
  rows: InvExcelRow[];
  included: Set<number>;
  ejecutantes_default: InvEjecutante[];
  id_unidad_default: number | null;
  departamentos: InvExcelDepartamento[];
  unidades: InvExcelUnidad[];
  on_ejecutantes_default: (value: InvEjecutante[]) => void;
  on_unidad_default: (value: number | null) => void;
  on_patch_row: (row: number, patch: Partial<InvExcelRow>) => void;
}) {
  const [q_cap, set_q_cap] = useState("");
  const [q_huecos, set_q_huecos] = useState("");
  const [q_part, set_q_part] = useState("");

  const selected = useMemo(
    () => rows.filter((row) => included.has(row.row) && !row.error),
    [rows, included],
  );

  const tracked_ids = useRef<Set<number>>(new Set());
  const tracked_huecos = useMemo(() => {
    for (const row of selected) {
      if (row_has_hueco(row)) tracked_ids.current.add(row.row);
    }
    return selected.filter((row) => tracked_ids.current.has(row.row));
  }, [selected]);

  const pendientes = useMemo(
    () => tracked_huecos.filter(row_has_hueco),
    [tracked_huecos],
  );
  const resueltos = tracked_huecos.length - pendientes.length;
  const huecos_total = tracked_huecos.length;
  const pct =
    huecos_total === 0
      ? 100
      : Math.round((resueltos / huecos_total) * 100);

  const cap_st_rows = useMemo(
    () => selected.filter(row_needs_ejecutante),
    [selected],
  );

  const departamentales = useMemo(
    () => selected.filter(row_is_departamental),
    [selected],
  );

  const particulares_count = departamentales.filter(
    (row) => row.id_departamentos.length > 0,
  ).length;

  const cap_filtered = cap_st_rows.filter((row) =>
    matches_inv_query(row.concepto, q_cap),
  );
  const huecos_filtered = tracked_huecos.filter((row) =>
    matches_inv_query(row.concepto, q_huecos),
  );
  const part_filtered = departamentales.filter((row) =>
    matches_inv_query(row.concepto, q_part),
  );

  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-gray-100 bg-[#f8f9fb] px-4 py-3 text-sm text-gray-600">
        Clasifica en 3 bloques. En cada tabla el campo de ese bloque va
        resaltado (★); el resto de la fila sigue editable.
      </p>

      <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <ClassifySectionHeader
          step={1}
          title="Valores del lote y Cap / ST"
          hint="Default del lote + listado SI/AMBOS. Resaltado: departamento ejecutante."
          badge={`${cap_st_rows.length} con Cap/ST`}
        />

        <div className="grid gap-4 rounded-xl border border-gray-100 bg-[#f8f9fb] p-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Default · Departamento ejecutante</Label>
            <EjecutanteChecks
              value={ejecutantes_default}
              on_change={on_ejecutantes_default}
            />
            <p className="text-xs text-gray-500">
              Cap, ST o ambos. Las filas sin excepción usan esto.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Default · Unidad</Label>
            <InvExcelUnidadSelect
              unidades={unidades}
              value={id_unidad_default}
              on_change={on_unidad_default}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">
            Excepciones Cap / ST (opcional)
          </p>
          <ClassifySearchField
            value={q_cap}
            on_change={set_q_cap}
            placeholder="Buscar ítem SI o AMBOS…"
          />
          {cap_st_rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
              Aún no hay filas SI/AMBOS. Aparecen al completar OBEDECE en el
              bloque 2 o si ya vienen del Excel.
            </p>
          ) : (
            <div className="max-h-[18rem] overflow-auto rounded-xl border border-gray-100">
              <table className="w-full text-left text-sm">
                <ClassifyTableHead focus="ejecutante" show_unidad />
                <tbody>
                  {cap_filtered.map((row) => (
                    <ClassifyDataRow
                      key={row.row}
                      row={row}
                      focus="ejecutante"
                      ejecutantes_default={ejecutantes_default}
                      departamentos={departamentos}
                      unidades={unidades}
                      id_unidad_default={id_unidad_default}
                      show_unidad
                      on_patch_row={on_patch_row}
                    />
                  ))}
                </tbody>
              </table>
              {cap_filtered.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500">
                  Ningún ítem coincide con «{q_cap}».
                </p>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50/30 p-4">
        <ClassifySectionHeader
          step={2}
          title="Huecos por completar"
          hint="Filas incompletas. Al completar OBEDECE quedan como Listo (no se quitan). Resaltado: lo que falta."
          badge={
            huecos_total === 0
              ? "Sin huecos"
              : `${pendientes.length} pendientes`
          }
        />

        <div className="space-y-2 rounded-xl border border-amber-100 bg-white p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-medium text-gray-900">Progreso de este bloque</p>
            <p className="tabular-nums text-gray-600">
              {huecos_total === 0
                ? "0 pendientes"
                : `${resueltos} de ${huecos_total} resueltos · ${pendientes.length} pendientes`}
            </p>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-amber-100"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <ClassifySearchField
          value={q_huecos}
          on_change={set_q_huecos}
          placeholder="Buscar en huecos…"
        />

        {huecos_total === 0 ? (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            No hay huecos. Las {selected.length} filas ya vienen completas.
          </p>
        ) : (
          <div className="max-h-[20rem] overflow-auto rounded-xl border border-amber-100 bg-white">
            <table className="w-full text-left text-sm">
              <ClassifyTableHead focus={["obedece", "periodicidad"]} />
              <tbody>
                {huecos_filtered.map((row) => (
                  <ClassifyDataRow
                    key={row.row}
                    row={row}
                    focus={focus_for_hueco(row)}
                    ejecutantes_default={ejecutantes_default}
                    departamentos={departamentos}
                    resolved={!row_has_hueco(row)}
                    on_patch_row={on_patch_row}
                  />
                ))}
              </tbody>
            </table>
            {huecos_filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">
                Ningún ítem coincide con «{q_huecos}».
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
        <ClassifySectionHeader
          step={3}
          title="Particulares por departamento"
          hint="Ítems NO/AMBOS. Resaltado: particulares. El resto de la fila sigue editable."
          badge={`${particulares_count} particulares · ${departamentales.length} en lista`}
        />

        <ClassifySearchField
          value={q_part}
          on_change={set_q_part}
          placeholder="Buscar ítem departamental…"
        />

        {departamentales.length === 0 ? (
          <p className="rounded-xl border border-dashed border-sky-200 bg-white px-4 py-3 text-sm text-gray-500">
            No hay filas NO/AMBOS todavía.
          </p>
        ) : (
          <div className="max-h-[20rem] overflow-auto rounded-xl border border-sky-100 bg-white">
            <table className="w-full text-left text-sm">
              <ClassifyTableHead focus="particulares" />
              <tbody>
                {part_filtered.map((row) => (
                  <ClassifyDataRow
                    key={row.row}
                    row={row}
                    focus="particulares"
                    ejecutantes_default={ejecutantes_default}
                    departamentos={departamentos}
                    on_patch_row={on_patch_row}
                  />
                ))}
              </tbody>
            </table>
            {part_filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">
                Ningún ítem coincide con «{q_part}».
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
