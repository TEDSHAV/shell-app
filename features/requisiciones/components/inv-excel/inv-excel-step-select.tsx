"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fold_inv_label,
  revalidate_inv_row,
  type InvExcelRow,
  type InvModoCompra,
  type InvObedece,
  type InvPeriodicidad,
} from "../../lib/excel-inventario";

export function InvExcelStepSelect({
  rows,
  included,
  on_toggle,
  on_toggle_all,
  on_patch_row,
}: {
  rows: InvExcelRow[];
  included: Set<number>;
  on_toggle: (row: number, checked: boolean) => void;
  on_toggle_all: (checked: boolean) => void;
  on_patch_row: (row: number, patch: Partial<InvExcelRow>) => void;
}) {
  const [query, set_query] = useState("");

  const selectable = rows.filter((row) => !row.error);
  const all_on =
    selectable.length > 0 && selectable.every((row) => included.has(row.row));

  const visible = useMemo(() => {
    const needle = fold_inv_label(query);
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        fold_inv_label(row.concepto).includes(needle) ||
        String(row.row).includes(needle),
    );
  }, [rows, query]);

  function patch(row: InvExcelRow, partial: Partial<InvExcelRow>) {
    const next = revalidate_inv_row({ ...row, ...partial });
    on_patch_row(row.row, next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {included.size} de {selectable.length} filas marcadas
          {rows.some((row) => row.error)
            ? ` · ${rows.filter((row) => row.error).length} con error`
            : ""}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={all_on}
            onCheckedChange={(checked) => on_toggle_all(Boolean(checked))}
          />
          Todas las válidas
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Marca qué filas cargar. Si algo viene mal del Excel, edítalo aquí
        (concepto, modo, OBEDECE, periodicidad) antes de clasificar.
      </p>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(event) => set_query(event.target.value)}
          placeholder="Buscar concepto o nº de fila…"
          className="h-9 pl-8 text-sm"
        />
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2"> </th>
              <th className="px-3 py-2">Fila</th>
              <th className="min-w-[12rem] px-3 py-2">Concepto</th>
              <th className="px-3 py-2">Modo</th>
              <th className="px-3 py-2">Periodicidad</th>
              <th className="px-3 py-2">Obedece</th>
              <th className="px-3 py-2">Match</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const has_error = Boolean(row.error);
              return (
                <tr
                  key={row.row}
                  className={
                    has_error
                      ? "border-t border-red-50 bg-red-50/30 align-top"
                      : "border-t border-gray-50 align-top"
                  }
                >
                  <td className="px-3 py-2">
                    <Checkbox
                      disabled={has_error}
                      checked={included.has(row.row)}
                      onCheckedChange={(checked) =>
                        on_toggle(row.row, Boolean(checked))
                      }
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gray-500">
                    {row.row}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.concepto}
                      onChange={(event) =>
                        patch(row, { concepto: event.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.modo_compra}
                      onValueChange={(value: string) =>
                        patch(row, {
                          modo_compra: value as InvModoCompra,
                          periodicidad:
                            value === "recurrente" ? row.periodicidad : null,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[7.5rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unidad">Unidad</SelectItem>
                        <SelectItem value="recurrente">Suscripción</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    {row.modo_compra === "recurrente" ? (
                      <Select
                        value={row.periodicidad ?? "unset"}
                        onValueChange={(value: string) =>
                          patch(row, {
                            periodicidad:
                              value === "unset"
                                ? null
                                : (value as InvPeriodicidad),
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
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={row.obedece ?? "unset"}
                      onValueChange={(value: string) =>
                        patch(row, {
                          obedece:
                            value === "unset" ? null : (value as InvObedece),
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[7.5rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">—</SelectItem>
                        <SelectItem value="no">NO</SelectItem>
                        <SelectItem value="si">SI</SelectItem>
                        <SelectItem value="ambos">AMBOS</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {row.id_item_match
                      ? `#${row.id_item_match}`
                      : has_error
                        ? "—"
                        : "nuevo"}
                  </td>
                  <td className="px-3 py-2">
                    {row.error ? (
                      <span className="text-xs text-red-600">{row.error}</span>
                    ) : row.warning ? (
                      <span className="text-xs text-amber-600">
                        {row.warning}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600">ok</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-500">
            Ninguna fila coincide con la búsqueda.
          </p>
        ) : null}
      </div>
    </div>
  );
}
