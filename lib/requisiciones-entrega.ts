import type {
  CierreEntrega,
  OSIFixedItem,
  RequisicionItem,
} from "@/types/requisiciones";

export function item_pedido(item: RequisicionItem): number {
  const n = Number(item.cant);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function item_entregado(item: RequisicionItem): number | null {
  if (item.cant_entregada == null) return null;
  const n = Number(item.cant_entregada);
  return Number.isFinite(n) ? n : null;
}

export function item_faltante(item: RequisicionItem): number | null {
  const entregado = item_entregado(item);
  if (entregado == null) return null;
  return Math.max(0, item_pedido(item) - entregado);
}

/** Ítem cerrado: entrega completa o corto con decisión de no esperar más. */
export function item_is_resolved(item: RequisicionItem): boolean {
  if (item.cierre_entrega === "resto_pendiente") return false;
  if (
    item.cierre_entrega === "completo" ||
    item.cierre_entrega === "cerrado_corto"
  ) {
    return true;
  }
  return item.verificacion === "listo";
}

export function item_has_entrega_progress(item: RequisicionItem): boolean {
  if (item_is_resolved(item)) return true;
  const entregado = item_entregado(item);
  return item.cierre_entrega === "resto_pendiente" && (entregado ?? 0) > 0;
}

export function resolve_cierre_entrega(
  pedido: number,
  cant_entregada: number,
  decision: "cerrado_corto" | "resto_pendiente" | null,
): CierreEntrega {
  if (cant_entregada >= pedido) return "completo";
  if (decision === "resto_pendiente") return "resto_pendiente";
  return "cerrado_corto";
}

export function apply_item_entrega(
  item: RequisicionItem,
  cant_entregada: number,
  cierre: CierreEntrega,
  userId: string | null,
  at: string,
): RequisicionItem {
  const resolved = cierre !== "resto_pendiente";
  return {
    ...item,
    cant_entregada,
    cierre_entrega: cierre,
    verificacion: resolved ? "listo" : "pendiente",
    verificado_por: resolved ? userId : item.verificado_por ?? null,
    verificado_en: resolved ? at : item.verificado_en ?? null,
  };
}

export function clear_item_entrega(item: RequisicionItem): RequisicionItem {
  return {
    ...item,
    cant_entregada: null,
    cierre_entrega: null,
    verificacion: "pendiente",
    verificado_por: null,
    verificado_en: null,
  };
}

export function count_items_resolved(items: RequisicionItem[]): number {
  return items.filter(item_is_resolved).length;
}

export function all_items_resolved(items: RequisicionItem[]): boolean {
  return items.length > 0 && items.every(item_is_resolved);
}

export function countRequisicionVerificacion(
  additionalItems: RequisicionItem[] | null | undefined,
  osiFixedItems: OSIFixedItem[] | null | undefined,
  tipo_solicitud?: string | null,
): { verified: number; total: number } {
  const fixed = osiFixedItems || [];
  const additional = additionalItems || [];
  const isInterna = tipo_solicitud === "Interno";
  const fixedVerified = isInterna
    ? 0
    : fixed.reduce(
        (sum, fi) =>
          sum +
          (fi.verificacion_traslado === "listo" ? 1 : 0) +
          (fi.verificacion_impresion === "listo" ? 1 : 0) +
          (fi.verificacion_honorarios === "listo" ? 1 : 0) +
          (fi.verificacion_informe_final === "listo" ? 1 : 0),
        0,
      );
  const additionalVerified = isInterna
    ? count_items_resolved(additional)
    : additional.filter((item) => item.verificacion === "listo").length;
  return {
    verified: fixedVerified + additionalVerified,
    total: (isInterna ? 0 : fixed.length * 4) + additional.length,
  };
}

export function interna_has_process_progress(
  items: RequisicionItem[],
): boolean {
  return items.some(item_has_entrega_progress);
}

export function item_has_resto_pendiente(item: RequisicionItem): boolean {
  return item.cierre_entrega === "resto_pendiente";
}

export function show_columna_entregado(items: RequisicionItem[]): boolean {
  return items.some(item_has_resto_pendiente);
}

/** Ratio `2/5` solo para ítems con resto pendiente. */
export function format_entregado_ratio(item: RequisicionItem): string | null {
  if (!item_has_resto_pendiente(item)) return null;
  const entregado = item_entregado(item);
  if (entregado == null) return null;
  return `${entregado}/${item_pedido(item)}`;
}
