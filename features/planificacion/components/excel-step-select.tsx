"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import type { ExcelAppCatalog } from "../actions/import-excel";
import {
  apps_for_excel_row,
  unique_excel_app_groups,
  type ExcelPlanRow,
} from "../lib/excel-plan";

export function ExcelStepSelect({
  rows,
  catalog,
  included,
  on_toggle,
  on_toggle_all,
  on_toggle_rows,
  on_row_dates,
  on_row_apps,
  on_apply_apps,
}: {
  rows: ExcelPlanRow[];
  catalog: ExcelAppCatalog[];
  included: Set<number>;
  on_toggle: (row: number, checked: boolean) => void;
  on_toggle_all: (checked: boolean) => void;
  on_toggle_rows: (row_ids: number[], checked: boolean) => void;
  on_row_dates: (
    row: number,
    field: "fecha_inicio" | "fecha_fin",
    value: string,
  ) => void;
  on_row_apps: (row: number, app_ids: number[]) => void;
  on_apply_apps: (app_ids: number[]) => void;
}) {
  const [bulk_apps, set_bulk_apps] = useState<number[]>([]);
  const [collapsed, set_collapsed] = useState<Set<string>>(new Set());
  const options = catalog.map((app) => ({ id: app.id, label: app.nombre }));
  const groups = useMemo(() => unique_excel_app_groups(rows), [rows]);
  const usable = rows.filter((row) => !row.error);
  const marked = usable.filter((row) => included.has(row.row)).length;
  const all_on = usable.length > 0 && marked === usable.length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Tareas</h2>
        <p className="mt-1 text-sm text-gray-500">
          Una fila por tarea. Las fechas son opcionales: si las dejas vacías
          se guarda el orden de la lista y las pones después.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-[#f8f9fb] p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-medium text-gray-500">
            Apps para las {marked} marcadas
          </p>
          <MultiSelect
            options={options}
            selectedIds={bulk_apps}
            onChange={set_bulk_apps}
            placeholder="Una o varias apps"
          />
        </div>
        <Button
          type="button"
          className="bg-gray-900 text-white hover:bg-gray-800"
          disabled={marked === 0 || bulk_apps.length === 0}
          onClick={() => on_apply_apps(bulk_apps)}
        >
          Aplicar
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={all_on}
          onChange={(event) => on_toggle_all(event.target.checked)}
        />
        Marcar todas
      </label>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        {groups.map((group) => {
          const valid = group.items.filter((row) => !row.error);
          const group_ids = valid.map((row) => row.row);
          const group_on =
            valid.length > 0 && valid.every((row) => included.has(row.row));
          const open = !collapsed.has(group.label);
          return (
            <div
              key={group.label}
              className="border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={group_on}
                  onChange={(event) =>
                    on_toggle_rows(group_ids, event.target.checked)
                  }
                />
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() =>
                    set_collapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.label)) next.delete(group.label);
                      else next.add(group.label);
                      return next;
                    })
                  }
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <span className="truncate text-sm font-semibold text-gray-800">
                    {group.label}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {valid.filter((row) => included.has(row.row)).length}/
                    {valid.length}
                  </span>
                </button>
              </div>
              {open ? (
                <div className="divide-y divide-gray-50">
                  {group.items.map((row) => {
                    const blocked = Boolean(row.error);
                    return (
                      <div
                        key={row.row}
                        className="grid gap-2 px-3 py-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(12rem,16rem)] sm:items-start"
                      >
                        <input
                          className="mt-1"
                          type="checkbox"
                          disabled={blocked}
                          checked={!blocked && included.has(row.row)}
                          onChange={(event) =>
                            on_toggle(row.row, event.target.checked)
                          }
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] text-gray-400">
                            {row.excel_modulo}
                          </p>
                          <p
                            className={`text-sm ${
                              blocked ? "text-red-500" : "text-gray-800"
                            }`}
                          >
                            {row.excel_id ? `[${row.excel_id}] ` : ""}
                            {row.excel_titulo || row.error}
                          </p>
                          {row.no_solicitada ? (
                            <p className="text-[11px] text-gray-500">
                              No solicitado · no cuenta en el %
                            </p>
                          ) : !blocked ? (
                            <p className="text-[11px] text-gray-400">
                              {row.avance}%
                            </p>
                          ) : null}
                          {blocked && row.error ? (
                            <p className="text-[11px] text-red-500">
                              {row.error}
                            </p>
                          ) : null}
                          {row.warning ? (
                            <p className="text-[11px] text-amber-600">
                              {row.warning}
                            </p>
                          ) : null}
                          {!blocked ? (
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-gray-400">
                              <input
                                type="date"
                                className="h-7 rounded border border-gray-200 px-1 text-xs text-gray-700"
                                value={row.fecha_inicio ?? ""}
                                onChange={(event) =>
                                  on_row_dates(
                                    row.row,
                                    "fecha_inicio",
                                    event.target.value,
                                  )
                                }
                              />
                              <span>—</span>
                              <input
                                type="date"
                                className="h-7 rounded border border-gray-200 px-1 text-xs text-gray-700"
                                value={row.fecha_fin ?? row.fecha_inicio ?? ""}
                                onChange={(event) =>
                                  on_row_dates(
                                    row.row,
                                    "fecha_fin",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                        {!blocked ? (
                          <MultiSelect
                            options={options}
                            selectedIds={apps_for_excel_row(row)}
                            onChange={(ids) => on_row_apps(row.row, ids)}
                            placeholder="Apps"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
