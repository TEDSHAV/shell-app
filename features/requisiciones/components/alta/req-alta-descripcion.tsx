"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { ReqCatalogPicker } from "../req-catalog-picker";
import { ReqItemSueltoDialog } from "../req-item-suelto-dialog";
import { useState } from "react";
import type { CajonPedido, CatalogAmbitoPedido } from "../../lib/req-destino";
import {
  linea_total,
  new_linea_id,
  type ReqLineaDraft,
} from "../../lib/req-lineas-types";
import type { CatalogoPedidoItem } from "../../lib/req-sugerir-reposicion";

export function ReqAltaDescripcion({
  cajon,
  ambito,
  departamento_nombre,
  id_departamento,
  lineas,
  on_change,
}: {
  cajon: CajonPedido;
  ambito: CatalogAmbitoPedido;
  departamento_nombre?: string | null;
  id_departamento?: number | null;
  lineas: ReqLineaDraft[];
  on_change: (next: ReqLineaDraft[]) => void;
}) {
  const [suelto, setSuelto] = useState(false);

  const add = (item: CatalogoPedidoItem) => {
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
        origen: "catalogo",
      },
    ]);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-gray-900">
          Escriba o elija del catálogo
        </p>
        <p className="mb-2 text-xs text-gray-600">
          {cajon === "interno"
            ? "Solo ve lo de su departamento (y lo compartido). Si no está, créelo suelto: Administración lo homologa al tramitar."
            : cajon === "inventario"
              ? "Ítems de depósito de este servicio. No se imputan a una OSI en este documento."
              : "Súmele lo directo del catálogo. Honorarios y traslado de la OSI ya vienen arriba si eligió el curso."}
        </p>
      </div>
      <ReqCatalogPicker
        cajon={cajon}
        ambito={ambito}
        id_departamento={id_departamento}
        departamento_nombre={departamento_nombre}
        on_pick={add}
      />
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
                {row.origen === "osi_recurso" ? (
                  <span className="ml-1 text-[10px] text-blue-700">OSI</span>
                ) : null}
                {row.esta_suelto ? (
                  <span className="ml-1 text-[10px] text-amber-700">suelto</span>
                ) : null}
              </td>
              <td className="p-1">{row.unidad}</td>
              <td className="p-1">
                <NumberInput
                  value={row.cantidad}
                  min={0.001}
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
                {row.origen === "osi_recurso" ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500"
                    onClick={() =>
                      on_change(
                        lineas.filter((item) => item.local_id !== row.local_id),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setSuelto(true)}
      >
        No está en el catálogo
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
              origen: "suelto",
            },
          ]);
          setSuelto(false);
        }}
      />
    </div>
  );
}
