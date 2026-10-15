import type { CajonPedido } from "./req-destino";

export type ReqLineaOrigen = "catalogo" | "osi_recurso" | "suelto";

export type ReqLineaDraft = {
  local_id: string;
  id?: number;
  id_item_costo: number | null;
  cajon: CajonPedido;
  nombre_item: string;
  unidad: string;
  cantidad: number;
  costo_catalogo: number;
  costo_pagado: number | null;
  esta_suelto: boolean;
  origen?: ReqLineaOrigen;
};

export function linea_es_persistible(row: ReqLineaDraft): boolean {
  return row.origen !== "osi_recurso";
}

export function new_linea_id(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function empty_linea_draft(cajon: CajonPedido): ReqLineaDraft {
  return {
    local_id: new_linea_id(),
    id_item_costo: null,
    cajon,
    nombre_item: "",
    unidad: "und",
    cantidad: 1,
    costo_catalogo: 0,
    costo_pagado: null,
    esta_suelto: true,
    origen: "suelto",
  };
}

export function linea_total(row: ReqLineaDraft): number {
  const unit = row.costo_pagado ?? row.costo_catalogo ?? 0;
  return Number(row.cantidad || 0) * Number(unit || 0);
}

export function lineas_as_additional_items(lineas: ReqLineaDraft[]) {
  return lineas
    .filter(
      (row) =>
        linea_es_persistible(row) && String(row.nombre_item || "").trim(),
    )
    .map((row) => {
      const total = linea_total(row);
      const cant = Number(row.cantidad || 0);
      return {
        id: row.local_id,
        cant,
        unidad: row.unidad || "und",
        descripcion: row.nombre_item,
        costo_unitario: cant > 0 ? total / cant : 0,
        total,
        verificacion: "pendiente" as const,
      };
    });
}
