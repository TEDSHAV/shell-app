"use client";

import { useMemo } from "react";
import {
  ambito_from_departamento,
  deposito_stock_from_clase,
  type CajonPedido,
  type ClasePedido,
} from "../lib/req-destino";
import {
  type ReqLineaDraft,
  new_linea_id,
} from "../lib/req-lineas-types";
import { ReqAltaStockAnalisis } from "./alta/req-alta-stock-analisis";

type ReqLineaRow = {
  id?: number;
  id_item_costo?: number | null;
  nombre_item?: string | null;
  unidad?: string | null;
  cantidad?: number | null;
  costo_catalogo?: number | null;
  costo_pagado?: number | null;
  esta_suelto?: boolean | null;
  cajon?: CajonPedido | null;
};

function drafts_from_req_lineas(rows: ReqLineaRow[]): ReqLineaDraft[] {
  return (rows || [])
    .filter((row) => typeof row.id_item_costo === "number" && row.id_item_costo > 0)
    .map((row) => ({
      local_id: row.id != null ? `linea-${row.id}` : new_linea_id(),
      id: row.id,
      id_item_costo: row.id_item_costo as number,
      cajon: (row.cajon || "inventario") as CajonPedido,
      nombre_item: row.nombre_item || "",
      unidad: row.unidad || "und",
      cantidad: Number(row.cantidad || 0),
      costo_catalogo: Number(row.costo_catalogo || 0),
      costo_pagado:
        row.costo_pagado == null ? null : Number(row.costo_pagado),
      esta_suelto: Boolean(row.esta_suelto),
      origen: "catalogo" as const,
    }));
}

/**
 * Análisis de stock en la vista de procesar / detalle.
 * Solo lectura del pedido (sin stepper de req); sí permite consumo si hay permiso.
 */
export function ReqViewStockAnalisis({
  clase_pedido,
  departamento,
  id_departamento,
  req_lineas,
}: {
  clase_pedido: string | null | undefined;
  departamento: string | null | undefined;
  id_departamento?: number | null;
  req_lineas: ReqLineaRow[] | null | undefined;
}) {
  const clase = clase_pedido as ClasePedido | null;
  const show =
    clase === "departamento" || clase === "servicio_inventario";

  const lineas = useMemo(
    () => drafts_from_req_lineas(req_lineas || []),
    [req_lineas],
  );

  if (!show || lineas.length === 0) return null;

  const ambito = ambito_from_departamento(
    departamento || "",
    clase,
  );
  const deposito = deposito_stock_from_clase(clase, ambito);

  return (
    <div className="border-b border-gray-300 bg-slate-50/60 p-3">
      <ReqAltaStockAnalisis
        deposito={deposito}
        id_departamento={
          deposito === "departamento" ? id_departamento ?? null : null
        }
        lineas={lineas}
      />
    </div>
  );
}
