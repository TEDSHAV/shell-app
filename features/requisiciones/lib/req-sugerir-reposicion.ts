export type CatalogoPedidoItem = {
  id: number;
  nombre_item: string;
  unidad: string | null;
  ambito_catalogo: string | null;
  rol: string | null;
  costo_unitario_base: number | null;
  id_departamentos?: number[] | null;
};

export function catalogo_interno_visible(
  id_departamentos: number[] | null | undefined,
  id_departamento: number | null,
): boolean {
  if (id_departamento == null) return true;
  const owned = (id_departamentos ?? []).map(Number).filter((n) => n > 0);
  if (owned.length === 0) return true;
  return owned.includes(id_departamento);
}

const HINT_RE =
  /refrigerio|agua|galleta|snack|cafe|café|comida|insumo/i;

export function sugerir_reposicion_fase2(
  items: CatalogoPedidoItem[],
  ambito: string,
): CatalogoPedidoItem[] {
  const in_ambito = items.filter(
    (row) =>
      row.rol === "inventario" &&
      (row.ambito_catalogo === ambito ||
        row.ambito_catalogo === "general"),
  );
  const hinted = in_ambito.filter((row) => HINT_RE.test(row.nombre_item));
  if (hinted.length > 0) return hinted.slice(0, 8);
  return in_ambito.slice(0, 8);
}
