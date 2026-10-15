"use client";

import { Fragment } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import type { OSIFixedItem } from "@/types/requisiciones";
import { osi_fixed_line_total } from "@/lib/requisicion-osi-clone";
import type { CajonPedido, CatalogAmbitoPedido } from "../../lib/req-destino";
import {
  empty_linea_draft,
  linea_total,
  type ReqLineaDraft,
} from "../../lib/req-lineas-types";
import { patch_osi_fixed } from "../../lib/req-osi-precarga";
import type { CatalogoPedidoItem } from "../../lib/req-sugerir-reposicion";
import { ReqAltaOsiBlock } from "./req-alta-osi-block";
import { ReqDescripcionCombo } from "./req-descripcion-combo";

export function ReqAltaTablaDetalles({
  modo,
  mostrar_osi,
  osi_fixed,
  on_fixed,
  lineas,
  on_lineas,
  cajon,
  ambito,
  id_departamento,
  departamento_nombre,
}: {
  modo: "editar" | "ver";
  mostrar_osi: boolean;
  osi_fixed: OSIFixedItem[];
  on_fixed?: (next: OSIFixedItem[]) => void;
  lineas: ReqLineaDraft[];
  on_lineas?: (next: ReqLineaDraft[]) => void;
  cajon: CajonPedido;
  ambito: CatalogAmbitoPedido;
  id_departamento?: number | null;
  departamento_nombre?: string | null;
}) {
  const edit = modo === "editar";
  const extras = lineas.filter((row) => row.origen !== "osi_recurso");
  const osi_sum = osi_fixed.reduce((s, row) => s + osi_fixed_line_total(row), 0);
  const extra_sum = extras.reduce((s, row) => s + linea_total(row), 0);
  let n = 1;

  const patch_linea = (id: string, updates: Partial<ReqLineaDraft>) => {
    on_lineas?.(
      lineas.map((row) => (row.local_id === id ? { ...row, ...updates } : row)),
    );
  };

  const pick_catalog = (id: string, item: CatalogoPedidoItem) => {
    patch_linea(id, {
      id_item_costo: item.id,
      nombre_item: item.nombre_item,
      unidad: item.unidad || "und",
      costo_catalogo: Number(item.costo_unitario_base || 0),
      esta_suelto: false,
      origen: "catalogo",
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="border border-gray-300 bg-gray-200 py-1 text-center text-sm font-bold uppercase">
        Detalles de la solicitud
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-300 bg-gray-50 text-center">
            <th className="w-12 border-r border-gray-300 p-2">ITEM</th>
            <th className="w-20 border-r border-gray-300 p-2">UNIDAD/ CONCEPTO</th>
            <th className="w-16 border-r border-gray-300 p-2">CANT</th>
            <th className="border-r border-gray-300 p-2">DESCRIPCIÓN</th>
            <th className="w-28 border-r border-gray-300 p-2">PRECIO U.</th>
            <th className="w-28 p-2">TOTAL</th>
            {edit ? <th className="w-10" /> : null}
          </tr>
        </thead>
        <tbody>
          {mostrar_osi
            ? osi_fixed.map((fi) => {
                const start = n;
                n += 4;
                return (
                  <Fragment key={fi.id_osi}>
                    <ReqAltaOsiBlock
                      fi={fi}
                      item_start={start}
                      edit={edit}
                      on_patch={(updates) =>
                        on_fixed?.(
                          osi_fixed.map((row) =>
                            row.id_osi === fi.id_osi
                              ? patch_osi_fixed(row, updates)
                              : row,
                          ),
                        )
                      }
                    />
                  </Fragment>
                );
              })
            : null}
          {extras.map((row) => {
            const idx = n++;
            const unit = row.costo_pagado ?? row.costo_catalogo ?? 0;
            return (
              <tr key={row.local_id} className="border-b border-gray-300">
                <td className="border-r border-gray-300 p-2 text-center font-bold">
                  {idx}
                </td>
                <td className="border-r border-gray-300 p-2">
                  {edit ? (
                    <Input
                      className="h-6 w-full border-gray-300 p-1 text-center font-bold uppercase"
                      value={row.unidad}
                      onChange={(e) =>
                        patch_linea(row.local_id, { unidad: e.target.value })
                      }
                    />
                  ) : (
                    <span className="block text-center font-bold uppercase">
                      {row.unidad}
                    </span>
                  )}
                </td>
                <td className="border-r border-gray-300 p-2">
                  {edit ? (
                    <NumberInput
                      value={row.cantidad}
                      min={0.001}
                      className="h-6 w-full border-gray-300 p-1 text-center"
                      onValueChange={(v) =>
                        patch_linea(row.local_id, { cantidad: v })
                      }
                    />
                  ) : (
                    <span className="block text-center font-bold">
                      {row.cantidad}
                    </span>
                  )}
                </td>
                <td className="border-r border-gray-300 p-2">
                  {edit ? (
                    <div>
                      <ReqDescripcionCombo
                        value={row.nombre_item}
                        cajon={cajon}
                        ambito={ambito}
                        id_departamento={id_departamento}
                        departamento_nombre={departamento_nombre}
                        on_text={(nombre) =>
                          patch_linea(row.local_id, {
                            nombre_item: nombre,
                            id_item_costo: null,
                            esta_suelto: true,
                            origen: "suelto",
                          })
                        }
                        on_pick={(item) => pick_catalog(row.local_id, item)}
                      />
                      {row.esta_suelto ? (
                        <p className="mt-0.5 text-[10px] text-amber-700">
                          Suelto: Administración decide si entra al catálogo.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="uppercase">
                      {row.nombre_item || "—"}
                      {row.esta_suelto ? " (suelto)" : ""}
                    </span>
                  )}
                </td>
                <td className="border-r border-gray-300 p-2 text-center font-bold">
                  {edit ? (
                    <NumberInput
                      value={unit}
                      allowDecimal
                      min={0}
                      className="h-6 w-full border-gray-300 p-1 text-center font-bold"
                      onValueChange={(v) =>
                        patch_linea(row.local_id, { costo_catalogo: v })
                      }
                    />
                  ) : (
                    `$${Number(unit).toFixed(2)}`
                  )}
                </td>
                <td className="bg-yellow-50 p-2 text-center font-bold">
                  ${linea_total(row).toFixed(2)}
                </td>
                {edit ? (
                  <td className="p-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500"
                      onClick={() =>
                        on_lineas?.(
                          lineas.filter((item) => item.local_id !== row.local_id),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                ) : null}
              </tr>
            );
          })}
          <tr className="border-b border-gray-300">
            <td
              colSpan={4}
              className="p-2 text-right text-[10px] font-bold uppercase"
            >
              Total general:
            </td>
            <td className="border-r border-gray-300 p-2" />
            <td className="bg-yellow-50 p-2 text-center font-bold">
              ${(osi_sum + extra_sum).toFixed(2)}
            </td>
            {edit ? <td /> : null}
          </tr>
        </tbody>
      </table>
      {edit ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700"
          onClick={() =>
            on_lineas?.([...lineas, empty_linea_draft(cajon)])
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar ítem
        </button>
      ) : null}
    </div>
  );
}
