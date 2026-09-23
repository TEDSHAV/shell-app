/**
 * Helpers for Venezuelan Cédula normalization and parsing.
 * Formats: 'V-12345678' or 'E-12345678'
 */

export type CedulaTipo = "V-" | "E-";

export interface ParsedCedula {
  tipo: CedulaTipo;
  numero: string;
}

/**
 * Parse an existing cedula string into its tipo ('V-' | 'E-') and numeric part.
 * Defaults to 'V-' if no prefix or if prefix is V.
 */
export function parseCedula(raw: string | null | undefined): ParsedCedula {
  if (!raw) return { tipo: "V-", numero: "" };
  const clean = raw.trim().toUpperCase();
  const tipo: CedulaTipo = clean.startsWith("E") ? "E-" : "V-";
  const numero = clean.replace(/\D/g, "");
  return { tipo, numero };
}

/**
 * Format a tipo and numeric part into the canonical Supabase format: 'V-12345678' or 'E-12345678'.
 * Returns null if numeric part is empty.
 */
export function formatCedula(tipo: CedulaTipo, numero: string | null | undefined): string | null {
  if (!numero) return null;
  const digits = numero.replace(/\D/g, "");
  if (!digits) return null;
  return `${tipo}${digits}`;
}

/**
 * Defensively normalize any raw cedula string into canonical format 'V-12345678'.
 */
export function normalizeCedula(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const { tipo, numero } = parseCedula(raw);
  return formatCedula(tipo, numero);
}
