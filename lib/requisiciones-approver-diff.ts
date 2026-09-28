/** Diff de contenido (no verificación Admin) para el sello "modificada por el aprobador". */

type SnapshotItem = {
  id?: string;
  cant?: number;
  unidad?: string;
  descripcion?: string;
  costo_unitario?: number;
  total?: number;
};

const SCALAR_KEYS = [
  "observaciones_compras",
  "prioridad",
  "corresponde_a",
  "fecha_solicitud",
  "solicitante",
  "departamento",
  "gerencia_solicitante",
  "tipo_servicio",
] as const;

function normText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function itemsContentEqual(a: SnapshotItem, b: SnapshotItem): boolean {
  return (
    Number(a.cant || 0) === Number(b.cant || 0) &&
    normText(a.unidad) === normText(b.unidad) &&
    normText(a.descripcion) === normText(b.descripcion) &&
    Number(a.costo_unitario || 0) === Number(b.costo_unitario || 0) &&
    Number(a.total || 0) === Number(b.total || 0)
  );
}

export function hasApproverMaterialDiff(
  originalSnapshot: Record<string, unknown> | null | undefined,
  currentRecord: Record<string, unknown> | null | undefined,
): boolean {
  if (!originalSnapshot || !currentRecord) return false;

  for (const key of SCALAR_KEYS) {
    if (normText(originalSnapshot[key]) !== normText(currentRecord[key])) {
      return true;
    }
  }

  const oldItems = (originalSnapshot.additional_items as SnapshotItem[] | undefined) || [];
  const newItems = (currentRecord.additional_items as SnapshotItem[] | undefined) || [];
  if (oldItems.length !== newItems.length) return true;

  const oldById = new Map(oldItems.map((item, index) => [item.id || `idx-${index}`, item]));
  for (let i = 0; i < newItems.length; i++) {
    const newItem = newItems[i];
    const oldItem = oldById.get(newItem.id || `idx-${i}`);
    if (!oldItem || !itemsContentEqual(oldItem, newItem)) return true;
  }

  return false;
}
