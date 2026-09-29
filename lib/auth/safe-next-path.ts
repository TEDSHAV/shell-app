const MAX_LEN = 512;

/** Ruta interna relativa. Evita open-redirect (//, http, etc.). */
export function safe_internal_next_path(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  value = value.trim();
  if (!value || value.length > MAX_LEN) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("://") || value.includes("\\")) return null;
  if (/[\s<>'"`]/.test(value)) return null;
  return value;
}
