export function count_sesiones_programadas(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const fecha = String((item as Record<string, unknown>).fecha ?? "").trim();
    return fecha.length > 0;
  }).length;
}

export function resolve_osi_override_number(
  osi_value: unknown,
  solped_value: number,
): number {
  if (osi_value !== null && osi_value !== undefined) {
    const parsed = Number(osi_value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const solped = Number(solped_value) || 0;
  return solped > 0 ? solped : 0;
}

export function resolve_osi_sesiones_count(
  row: Record<string, unknown>,
  solped_sesiones: number,
): number {
  const from_column = resolve_osi_override_number(row.sesiones_ejecucion, 0);
  if (row.sesiones_ejecucion !== null && row.sesiones_ejecucion !== undefined) {
    return from_column;
  }
  const from_programadas = count_sesiones_programadas(row.sesiones_programadas);
  if (from_programadas > 0) return from_programadas;
  return Number(solped_sesiones) || 0;
}

export function resolve_osi_participantes_count(
  row: Record<string, unknown>,
  solped_participantes: number,
): number {
  return resolve_osi_override_number(
    row.participantes_ejecucion,
    solped_participantes,
  );
}

export function resolve_osi_horas_count(
  row: Record<string, unknown>,
  solped_horas: number,
): number {
  return resolve_osi_override_number(
    row.horas_academicas_ejecucion,
    solped_horas,
  );
}
