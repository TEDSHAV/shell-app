"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  commit_inv_excel,
  preview_inv_excel,
  type InvExcelDepartamento,
  type InvExcelUnidad,
} from "../../actions/import-inv-excel";
import {
  pick_unidad_default_id,
  type InvEjecutante,
  type InvExcelCatalogItem,
  type InvExcelRow,
} from "../../lib/excel-inventario";
import {
  build_inv_excel_conflicts,
  type InvExcelDupConflict,
} from "../../lib/inv-excel-similar";
import { InvExcelStepper } from "./inv-excel-stepper";
import { InvExcelStepFile } from "./inv-excel-step-file";
import { InvExcelStepSelect } from "./inv-excel-step-select";
import {
  apply_dup_decisions_to_rows,
  InvExcelStepDuplicates,
} from "./inv-excel-step-duplicates";
import { InvExcelStepClassify } from "./inv-excel-step-classify";
import { InvExcelStepDone } from "./inv-excel-step-done";

export function InvExcelImportWizard() {
  const [step, set_step] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, set_file] = useState<File | null>(null);
  const [rows, set_rows] = useState<InvExcelRow[]>([]);
  const [included, set_included] = useState<Set<number>>(new Set());
  const [catalog, set_catalog] = useState<InvExcelCatalogItem[]>([]);
  const [conflicts, set_conflicts] = useState<InvExcelDupConflict[]>([]);
  const [departamentos, set_departamentos] = useState<InvExcelDepartamento[]>(
    [],
  );
  const [unidades, set_unidades] = useState<InvExcelUnidad[]>([]);
  const [ejecutantes_default, set_ejecutantes_default] = useState<
    InvEjecutante[]
  >(["capacitacion"]);
  const [id_unidad_default, set_id_unidad_default] = useState<number | null>(
    null,
  );
  const [unidades_por_empaque_default, set_unidades_por_empaque_default] =
    useState<number | null>(null);
  const [error, set_error] = useState<string | null>(null);
  const [busy, set_busy] = useState(false);
  const [result, set_result] = useState<{
    created: number;
    updated: number;
    stocked: number;
    skipped_recurrente: number;
    failed: string[];
  } | null>(null);

  const selected = useMemo(
    () => rows.filter((row) => included.has(row.row) && !row.error),
    [rows, included],
  );

  async function on_preview() {
    if (!file) {
      set_error("Adjunta un archivo .xlsx.");
      return;
    }
    set_busy(true);
    set_error(null);
    const form = new FormData();
    form.set("file", file);
    const preview = await preview_inv_excel(form);
    set_busy(false);
    if (!preview.ok) {
      set_error(preview.error);
      return;
    }
    set_rows(preview.rows);
    set_catalog(preview.catalog);
    set_departamentos(preview.departamentos);
    set_unidades(preview.unidades);
    set_id_unidad_default(pick_unidad_default_id(preview.unidades));
    set_included(
      new Set(preview.rows.filter((row) => !row.error).map((row) => row.row)),
    );
    set_conflicts([]);
    set_step(2);
  }

  function go_duplicates() {
    if (selected.length === 0) {
      set_error("Marca al menos una fila válida.");
      return;
    }
    set_error(null);
    const next = build_inv_excel_conflicts({
      rows,
      included,
      catalog,
    });
    set_conflicts(next);
    set_step(3);
  }

  function go_classify() {
    const pending = conflicts.filter((c) => !c.decision);
    if (pending.length > 0) {
      set_error(
        `Decidí qué hacer en ${pending.length} conflicto(s) (ej. fila ${pending[0].row}).`,
      );
      return;
    }
    const applied = apply_dup_decisions_to_rows(rows, conflicts, included);
    set_rows(applied.rows);
    set_included(applied.included);
    if (
      applied.rows.filter((row) => applied.included.has(row.row) && !row.error)
        .length === 0
    ) {
      set_error("No quedan filas para cargar tras descartar duplicados.");
      return;
    }
    set_error(null);
    set_step(4);
  }

  async function on_commit() {
    if (ejecutantes_default.length === 0) {
      set_error("Marca al menos Cap o ST en el departamento ejecutante del lote.");
      return;
    }
    const batch = rows.filter((row) => included.has(row.row) && !row.error);
    const missing = batch.filter((row) => !row.obedece);
    if (missing.length > 0) {
      set_error(
        `Completa OBEDECE en ${missing.length} fila(s) (ej. fila ${missing[0].row}).`,
      );
      return;
    }
    const needs_ejec = batch.filter(
      (row) =>
        (row.obedece === "si" || row.obedece === "ambos") &&
        row.ejecutantes.length === 0 &&
        ejecutantes_default.length === 0,
    );
    if (needs_ejec.length > 0) {
      set_error(
        `Marca Cap y/o ST en ${needs_ejec.length} fila(s) (ej. ${needs_ejec[0].concepto}).`,
      );
      return;
    }
    set_busy(true);
    set_error(null);
    const saved = await commit_inv_excel({
      id_unidad_default,
      ejecutantes_default,
      rows: batch.map((row) => ({
        row: row.row,
        concepto: row.concepto,
        modo_compra: row.modo_compra,
        periodicidad: row.periodicidad,
        obedece: row.obedece!,
        ejecutantes: row.ejecutantes,
        id_departamentos: row.id_departamentos,
        id_unidad: row.id_unidad,
        id_item_match: row.force_create ? null : row.id_item_match,
        force_create: row.force_create,
        unidades_por_empaque:
          row.unidades_por_empaque ?? unidades_por_empaque_default,
      })),
    });
    set_busy(false);
    if (!saved.ok) {
      set_error(saved.error);
      return;
    }
    set_result(saved);
    set_step(5);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <Link
          href="/requisiciones/depositos"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Inventario
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Cargar Excel de inventario
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Valores del lote, duplicados, huecos y particulares por departamento.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-[#f8f9fb] px-6 py-4">
          <InvExcelStepper step={step} />
        </div>
        <div className="min-h-[22rem] px-6 py-6">
          {step === 1 ? <InvExcelStepFile file={file} on_file={set_file} /> : null}
          {step === 2 ? (
            <InvExcelStepSelect
              rows={rows}
              included={included}
              on_toggle={(row, checked) => {
                set_included((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(row);
                  else next.delete(row);
                  return next;
                });
              }}
              on_toggle_all={(checked) => {
                set_included(
                  checked
                    ? new Set(
                        rows.filter((row) => !row.error).map((row) => row.row),
                      )
                    : new Set(),
                );
              }}
              on_patch_row={(row, patch) => {
                set_rows((prev) =>
                  prev.map((item) =>
                    item.row === row ? { ...item, ...patch } : item,
                  ),
                );
                if (patch.error) {
                  set_included((ids) => {
                    const copy = new Set(ids);
                    copy.delete(row);
                    return copy;
                  });
                }
              }}
            />
          ) : null}
          {step === 3 ? (
            <InvExcelStepDuplicates
              conflicts={conflicts}
              catalog={catalog}
              on_change={(row, patch) => {
                set_conflicts((prev) =>
                  prev.map((item) =>
                    item.row === row ? { ...item, ...patch } : item,
                  ),
                );
              }}
            />
          ) : null}
          {step === 4 ? (
            <InvExcelStepClassify
              rows={rows}
              included={included}
              ejecutantes_default={ejecutantes_default}
              id_unidad_default={id_unidad_default}
              unidades_por_empaque_default={unidades_por_empaque_default}
              departamentos={departamentos}
              unidades={unidades}
              on_ejecutantes_default={set_ejecutantes_default}
              on_unidad_default={set_id_unidad_default}
              on_unidades_por_empaque_default={set_unidades_por_empaque_default}
              on_patch_row={(row, patch) => {
                set_rows((prev) =>
                  prev.map((item) =>
                    item.row === row ? { ...item, ...patch } : item,
                  ),
                );
              }}
            />
          ) : null}
          {step === 5 && result ? <InvExcelStepDone {...result} /> : null}

          {error ? (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          ) : null}

          {step < 5 ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={busy || step === 1}
                onClick={() =>
                  set_step((prev) =>
                    prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev,
                  )
                }
              >
                Atrás
              </Button>
              <div className="flex gap-2">
                {step === 1 ? (
                  <Button
                    type="button"
                    disabled={busy || !file}
                    onClick={() => void on_preview()}
                  >
                    {busy ? "Leyendo…" : "Continuar"}
                  </Button>
                ) : null}
                {step === 2 ? (
                  <Button type="button" disabled={busy} onClick={go_duplicates}>
                    Continuar
                  </Button>
                ) : null}
                {step === 3 ? (
                  <Button type="button" disabled={busy} onClick={go_classify}>
                    Continuar
                  </Button>
                ) : null}
                {step === 4 ? (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void on_commit()}
                  >
                    {busy ? "Guardando…" : "Cargar"}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
