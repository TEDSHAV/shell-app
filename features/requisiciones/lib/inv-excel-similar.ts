import { fold_inv_label, type InvExcelCatalogItem } from "./excel-inventario";

function score_hay(hay: string, term: string): number {
  if (!hay || !term) return 0;
  if (hay === term) return 100;
  if (hay.startsWith(term) || term.startsWith(hay)) return 80;
  if (hay.includes(term) || term.includes(hay)) return 60;
  const tokens = term.split(" ").filter((part) => part.length > 1);
  const hits = tokens.filter((part) => hay.includes(part)).length;
  if (hits === 0) return 0;
  return 20 + hits * 10;
}

export function similar_inv_catalog_items(
  query: string,
  items: InvExcelCatalogItem[],
  params?: { excludeIds?: number[]; limit?: number },
): Array<InvExcelCatalogItem & { score: number }> {
  const term = fold_inv_label(query);
  if (term.length < 2) return [];
  const excluded = new Set(params?.excludeIds ?? []);
  return items
    .filter((item) => !excluded.has(item.id))
    .map((item) => {
      const name = fold_inv_label(item.nombre_item);
      const score = score_hay(name, term);
      if (score < 60) return null;
      return { ...item, score };
    })
    .filter(
      (row): row is InvExcelCatalogItem & { score: number } => row !== null,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.esta_activo) - Number(a.esta_activo) ||
        a.nombre_item.localeCompare(b.nombre_item, "es"),
    )
    .slice(0, params?.limit ?? 6);
}

export type InvExcelDupDecision =
  | "use_existing"
  | "force_create"
  | "discard"
  | null;

export type InvExcelDupConflict = {
  row: number;
  concepto: string;
  kind: "exact" | "similar" | "excel_collision";
  candidates: Array<InvExcelCatalogItem & { score?: number }>;
  excel_peers: number[];
  decision: InvExcelDupDecision;
  chosen_id: number | null;
};

export function build_inv_excel_conflicts(params: {
  rows: Array<{
    row: number;
    concepto: string;
    error: string | null;
    id_item_match: number | null;
  }>;
  included: Set<number>;
  catalog: InvExcelCatalogItem[];
}): InvExcelDupConflict[] {
  const selected = params.rows.filter(
    (row) => params.included.has(row.row) && !row.error && row.concepto.trim(),
  );
  const by_fold = new Map<string, number[]>();
  for (const row of selected) {
    const key = fold_inv_label(row.concepto);
    const list = by_fold.get(key) ?? [];
    list.push(row.row);
    by_fold.set(key, list);
  }

  const out: InvExcelDupConflict[] = [];
  for (const row of selected) {
    const key = fold_inv_label(row.concepto);
    const peers = (by_fold.get(key) ?? []).filter((n) => n !== row.row);
    const exact = params.catalog.filter(
      (item) => fold_inv_label(item.nombre_item) === key,
    );
    const similar =
      exact.length === 0
        ? similar_inv_catalog_items(row.concepto, params.catalog, { limit: 5 })
        : [];
    const candidates =
      exact.length > 0
        ? exact.map((item) => ({ ...item, score: 100 }))
        : similar;
    if (candidates.length === 0 && peers.length === 0) continue;
    // Exact single match without peers: auto-resolved, no UI conflict.
    if (exact.length === 1 && peers.length === 0 && row.id_item_match) {
      continue;
    }
    if (exact.length <= 1 && similar.length === 0 && peers.length === 0) {
      continue;
    }
    out.push({
      row: row.row,
      concepto: row.concepto,
      kind:
        peers.length > 0
          ? "excel_collision"
          : exact.length > 0
            ? "exact"
            : "similar",
      candidates,
      excel_peers: peers,
      decision: null,
      chosen_id:
        exact.length === 1
          ? exact[0].id
          : row.id_item_match,
    });
  }
  return out;
}
