import type { CajonPedido } from "./req-destino";

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
};

export function new_linea_id(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function linea_total(row: ReqLineaDraft): number {
  const unit = row.costo_pagado ?? row.costo_catalogo ?? 0;
  return Number(row.cantidad || 0) * Number(unit || 0);
}
