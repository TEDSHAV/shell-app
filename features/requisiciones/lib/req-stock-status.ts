export type StockNivel = "en_stock" | "bajo" | "agotado";

export const FALLBACK_STOCK_MINIMO = 1;

export function resolve_stock_minimo(params: {
  id_item_costo: number;
  id_categoria: number | null;
  rules: Array<{
    alcance: "general" | "categoria" | "item";
    id_item_costo: number | null;
    id_categoria: number | null;
    cantidad_minima: number;
  }>;
}): number {
  const item = params.rules.find(
    (row) =>
      row.alcance === "item" && row.id_item_costo === params.id_item_costo,
  );
  if (item) return Number(item.cantidad_minima);
  if (params.id_categoria != null) {
    const cat = params.rules.find(
      (row) =>
        row.alcance === "categoria" &&
        row.id_categoria === params.id_categoria,
    );
    if (cat) return Number(cat.cantidad_minima);
  }
  const general = params.rules.find((row) => row.alcance === "general");
  if (general) return Number(general.cantidad_minima);
  return FALLBACK_STOCK_MINIMO;
}

export function stock_nivel(cantidad: number, minimo: number): StockNivel {
  if (cantidad <= 0) return "agotado";
  if (cantidad < minimo) return "bajo";
  return "en_stock";
}

export const STOCK_NIVEL_LABEL: Record<StockNivel, string> = {
  en_stock: "En stock",
  bajo: "Bajo stock",
  agotado: "Agotado",
};

export const STOCK_NIVEL_CLASS: Record<StockNivel, string> = {
  en_stock: "bg-emerald-100 text-emerald-900 border-emerald-300",
  bajo: "bg-amber-100 text-amber-950 border-amber-300",
  agotado: "bg-rose-100 text-rose-950 border-rose-300",
};

export function kardex_label(tipo: string): string {
  if (tipo === "entrada") return "Ingreso";
  if (tipo === "gastado") return "Consumo";
  if (tipo === "danado") return "Daño / roto";
  if (tipo === "entregado") return "Entrega";
  if (tipo === "cambiado") return "Cambio";
  return tipo;
}
