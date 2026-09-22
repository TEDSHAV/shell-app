export type CostItem = {
  cant?: number | null;
  costo_unitario?: number | null;
  total?: number | null;
};

export function money2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function money4(n: number): number {
  return Math.round((Number(n) || 0) * 10000) / 10000;
}

/** Recalc unit from total, or total from unit×qty. Qty change keeps unit. */
export function sync_item_money<T extends CostItem>(
  item: T,
  field: "cant" | "costo_unitario" | "total",
  value: number,
): T {
  const qty_raw = field === "cant" ? Number(value) || 0 : Number(item.cant) || 0;
  const qty = qty_raw > 0 ? qty_raw : 0;
  if (field === "total") {
    const total = money2(value);
    return {
      ...item,
      total,
      costo_unitario: qty > 0 ? money4(total / qty) : 0,
    };
  }
  if (field === "costo_unitario") {
    const unit = Number(value) || 0;
    return {
      ...item,
      costo_unitario: unit,
      total: money2(qty * unit),
    };
  }
  return {
    ...item,
    cant: value,
    total: money2(qty * (Number(item.costo_unitario) || 0)),
  };
}

export function apply_item_money_updates<T extends CostItem>(
  item: T,
  updates: Partial<T>,
): T {
  const keys = Object.keys(updates);
  if (keys.length === 1 && keys[0] === "total") {
    return sync_item_money(item, "total", Number(updates.total) || 0);
  }
  const merged = { ...item, ...updates };
  if (updates.costo_unitario != null) {
    return sync_item_money(merged, "costo_unitario", Number(merged.costo_unitario) || 0);
  }
  if (updates.cant != null) {
    return sync_item_money(merged, "cant", Number(merged.cant) || 0);
  }
  return merged;
}

export function requisicion_items_total(items: CostItem[] | null | undefined): number {
  let sum = 0;
  for (const item of items || []) {
    const line =
      Number(item.total) ||
      (Number(item.cant) || 0) * (Number(item.costo_unitario) || 0);
    sum += line;
  }
  return money2(sum);
}

export function interna_needs_lider(
  total: number,
  umbral_lider_usd: number,
): boolean {
  return total > Number(umbral_lider_usd);
}
