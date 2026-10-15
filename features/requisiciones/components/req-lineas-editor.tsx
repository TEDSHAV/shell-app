"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import type { CajonPedido, CatalogAmbitoPedido } from "../lib/req-destino";
import {
  linea_total,
  new_linea_id,
  type ReqLineaDraft,
} from "../lib/req-lineas-types";
import type { CatalogoPedidoItem } from "../lib/req-sugerir-reposicion";
import { ReqCatalogPicker } from "./req-catalog-picker";
import { ReqItemSueltoDialog } from "./req-item-suelto-dialog";

export function ReqLineasEditor({
  cajon,
  ambito,
  id_departamento,
  departamento_nombre,
  lineas,
  disabled,
  on_change,
}: {
  cajon: CajonPedido;
  ambito: CatalogAmbitoPedido;
  id_departamento?: number | null;
  departamento_nombre?: string | null;
  lineas: ReqLineaDraft[];
  disabled?: boolean;
  on_change: (next: ReqLineaDraft[]) => void;
}) {
  const [suelto, setSuelto] = useState(false);

  const add_from_catalog = (item: CatalogoPedidoItem) => {
    on_change([
      ...lineas,
      {
        local_id: new_linea_id(),
        id_item_costo: item.id,
        cajon,
        nombre_item: item.nombre_item,
        unidad: item.unidad || "und",
        cantidad: 1,
        costo_catalogo: Number(item.costo_unitario_base || 0),
        costo_pagado: null,
        esta_suelto: false,
      },
    ]);
  };

  return (
    <div className="border-b border-gray-300 p-3 space-y-2">
      <p className="text-xs font-bold uppercase text-gray-600">
        Líneas del catálogo ({cajon})
      </p>
      <ReqCatalogPicker
        cajon={cajon}
        ambito={ambito}
        id_departamento={id_departamento}
        departamento_nombre={departamento_nombre}
        disabled={disabled}
        on_pick={add_from_catalog}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-1">Ítem</th>
              <th className="p-1 w-16">Und</th>
              <th className="p-1 w-20">Cant</th>
              <th className="p-1 w-24">Base</th>
              <th className="p-1 w-24">Total</th>
              <th className="p-1 w-8" />
            </tr>
          </thead>
          <tbody>
            {lineas.map((row) => (
              <tr key={row.local_id} className="border-t">
                <td className="p-1">
                  {row.nombre_item}
                  {row.esta_suelto ? (
                    <span className="ml-1 text-[10px] text-amber-700">
                      suelto
                    </span>
                  ) : null}
                </td>
                <td className="p-1">{row.unidad}</td>
                <td className="p-1">
                  <NumberInput
                    value={row.cantidad}
                    min={0.001}
                    disabled={disabled}
                    className="h-7 text-xs"
                    onValueChange={(n) =>
                      on_change(
                        lineas.map((item) =>
                          item.local_id === row.local_id
                            ? { ...item, cantidad: n }
                            : item,
                        ),
                      )
                    }
                  />
                </td>
                <td className="p-1 text-right">
                  {Number(row.costo_catalogo || 0).toFixed(2)}
                </td>
                <td className="p-1 text-right font-bold">
                  {linea_total(row).toFixed(2)}
                </td>
                <td className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500"
                    disabled={disabled}
                    onClick={() =>
                      on_change(
                        lineas.filter((item) => item.local_id !== row.local_id),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        disabled={disabled}
        onClick={() => setSuelto(true)}
      >
        <Plus size={14} className="mr-1" />
        Ítem suelto
      </Button>
      <ReqItemSueltoDialog
        open={suelto}
        on_close={() => setSuelto(false)}
        on_confirm={(draft) => {
          on_change([
            ...lineas,
            {
              local_id: new_linea_id(),
              id_item_costo: null,
              cajon,
              nombre_item: draft.nombre_item,
              unidad: draft.unidad,
              cantidad: draft.cantidad,
              costo_catalogo: 0,
              costo_pagado: null,
              esta_suelto: true,
            },
          ]);
          setSuelto(false);
        }}
      />
    </div>
  );
}
