/** Alineado con writers runtime (ilike en departamentos.nombre). */
export function department_nombre_matches_admin(nombre: string | null | undefined): boolean {
  if (!nombre?.trim()) return false;
  return nombre.toLowerCase().includes("admin");
}

export function department_nombre_matches_capacitacion(
  nombre: string | null | undefined,
): boolean {
  if (!nombre?.trim()) return false;
  return nombre.toLowerCase().includes("capacitacion");
}

export function resolve_user_department_nombre(
  departamento_id: number | null,
  departamento_names: Map<number, string>,
): string | null {
  if (departamento_id == null) return null;
  return departamento_names.get(departamento_id) ?? null;
}
