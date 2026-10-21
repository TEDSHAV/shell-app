/** Convierte cantidad de UI a cantidad de stock (siempre en unidad de empaque). */
export function cantidad_ui_a_stock(params: {
  cantidad: number;
  modo: "empaque" | "contenido";
  unidades_por_empaque: number | null | undefined;
}): number {
  const qty = Number(params.cantidad);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (params.modo === "empaque") return qty;
  const factor = Number(params.unidades_por_empaque);
  if (!Number.isFinite(factor) || factor <= 0) return qty;
  return Math.round((qty / factor) * 1000) / 1000;
}

export function stock_tiene_escalera(params: {
  unidades_por_empaque?: number | null;
  unidad_contenido?: string | null;
}): boolean {
  const factor = Number(params.unidades_por_empaque);
  return Number.isFinite(factor) && factor > 0;
}
