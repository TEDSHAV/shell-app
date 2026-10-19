import { stock_nivel, type StockNivel } from "./req-stock-status";
import type { ReqDeposito, ReqStockRow } from "./req-stock-types";

export type ReqStockDeptCard = {
  id_departamento: number;
  nombre: string;
  con_saldo: number;
  alertas: number;
  total_items: number;
};

export type ReqStockGroupedItem = {
  id_item_costo: number;
  nombre_item: string;
  unidad: string | null;
  categoria: string | null;
  id_categoria: number | null;
  cantidad_total: number;
  minimo: number;
  nivel: StockNivel;
  /** Peor fila (para seleccionar / inspector). */
  representative: ReqStockRow;
  departamentos: Array<{
    id: number;
    nombre: string;
    id_stock: number;
    cantidad: number;
    nivel: StockNivel;
  }>;
};

const NIVEL_RANK: Record<StockNivel, number> = {
  agotado: 0,
  bajo: 1,
  en_stock: 2,
};

export function build_dept_cards(rows: ReqStockRow[]): ReqStockDeptCard[] {
  const map = new Map<number, ReqStockDeptCard>();
  for (const row of rows) {
    if (row.deposito !== "departamento") continue;
    const id = Number(row.id_departamento);
    if (!Number.isFinite(id) || id <= 0) continue;
    const nombre = row.departamento || `Depto #${id}`;
    const cur = map.get(id) ?? {
      id_departamento: id,
      nombre,
      con_saldo: 0,
      alertas: 0,
      total_items: 0,
    };
    cur.total_items += 1;
    if (Number(row.cantidad) > 0) cur.con_saldo += 1;
    const nivel = stock_nivel(Number(row.cantidad), row.minimo ?? 1);
    if (nivel === "bajo" || nivel === "agotado") cur.alertas += 1;
    map.set(id, cur);
  }
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}

export function group_departamental_by_item(
  rows: ReqStockRow[],
): ReqStockGroupedItem[] {
  const map = new Map<number, ReqStockGroupedItem>();
  for (const row of rows) {
    if (row.deposito !== "departamento") continue;
    const key = row.id_item_costo;
    const nivel = stock_nivel(Number(row.cantidad), row.minimo ?? 1);
    const dept_id = Number(row.id_departamento);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id_item_costo: key,
        nombre_item: row.nombre_item,
        unidad: row.unidad,
        categoria: row.categoria ?? null,
        id_categoria: row.id_categoria ?? null,
        cantidad_total: Number(row.cantidad),
        minimo: row.minimo ?? 1,
        nivel,
        representative: row,
        departamentos:
          Number.isFinite(dept_id) && dept_id > 0
            ? [
                {
                  id: dept_id,
                  nombre: row.departamento || `Depto #${dept_id}`,
                  id_stock: row.id,
                  cantidad: Number(row.cantidad),
                  nivel,
                },
              ]
            : [],
      });
      continue;
    }
    existing.cantidad_total += Number(row.cantidad);
    if (NIVEL_RANK[nivel] < NIVEL_RANK[existing.nivel]) {
      existing.nivel = nivel;
      existing.representative = row;
    }
    if (Number.isFinite(dept_id) && dept_id > 0) {
      existing.departamentos.push({
        id: dept_id,
        nombre: row.departamento || `Depto #${dept_id}`,
        id_stock: row.id,
        cantidad: Number(row.cantidad),
        nivel,
      });
    }
  }
  for (const item of map.values()) {
    item.departamentos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
  return [...map.values()].sort((a, b) =>
    a.nombre_item.localeCompare(b.nombre_item, "es"),
  );
}

export function filter_stock_by_deposito(
  rows: ReqStockRow[],
  deposito: ReqDeposito,
): ReqStockRow[] {
  return rows.filter((row) => row.deposito === deposito);
}

export function filter_stock_by_departamento(
  rows: ReqStockRow[],
  id_departamento: number,
): ReqStockRow[] {
  return rows.filter(
    (row) =>
      row.deposito === "departamento" &&
      Number(row.id_departamento) === id_departamento,
  );
}
