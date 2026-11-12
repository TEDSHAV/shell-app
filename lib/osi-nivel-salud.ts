/**
 * Nivel de salud de la utilidad de la OSI (2026-11-12): N3 sana … N0 sin utilidad; bajar = ganar menos.
 * Mismas etiquetas que SGestion (features/osi/lib/osi-utility-pool.ts).
 */
export const NIVEL_SALUD_LABEL: Record<0 | 1 | 2 | 3, string> = {
  3: "N3 · Utilidad sana",
  2: "N2 · En alerta",
  1: "N1 · En riesgo",
  0: "N0 · Sin utilidad",
};

type AnalisisGuardado = {
  level?: number | null;
  escala?: string | null;
  extra?: number | null;
  needs_approval?: boolean | null;
  needs_justification?: boolean | null;
};

/**
 * Nivel de salud de un análisis guardado. Los análisis anteriores al cambio (sin `escala: "salud"`)
 * guardaban el tramo de consumo (0 base … 3 máximo): se traducen (0 → N3; si no, 4 − nivel).
 */
export function nivel_salud_de_analisis(a: AnalisisGuardado | null | undefined): 0 | 1 | 2 | 3 {
  if (!a || !(Number(a.extra ?? 0) > 0)) return 3;
  const raw = Math.min(3, Math.max(0, Math.floor(Number(a.level ?? 0))));
  if (a.escala === "salud") return raw as 0 | 1 | 2 | 3;
  return (raw === 0 ? 3 : 4 - raw) as 0 | 1 | 2 | 3;
}

/** Etiqueta del «Estado del costo» de una requisición. */
export function etiqueta_estado_costo(a: AnalisisGuardado | null | undefined): string {
  const base = NIVEL_SALUD_LABEL[nivel_salud_de_analisis(a)];
  if (a?.needs_approval) return `${base} · sujeta a aprobación`;
  if (a?.needs_justification) return `${base} · con justificación`;
  return base;
}
