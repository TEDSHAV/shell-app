/**
 * ¿La sesión se dicta en las instalaciones de SHA (Av. Paseo Colón con Calle Monagas, CC Hotel Rasil, Puerto La Cruz)?
 *
 * No hay un id de dirección único para SHA: cada empresa guarda su propia copia en direcciones_cliente,
 * casi siempre como texto libre ("SHA DE VENEZUELA", "INSTALACIONES DE SHA…", "SHA - HOTEL RASIL…", "SHA").
 * Se reconoce por texto normalizado. "rasil" se exige como palabra para no confundir con "Brasil";
 * se excluyen direcciones en Caracas ("instalaciones de Siemens y SHA de Venezuela" en Caracas no es la sede).
 * Revisado contra prod el 2026-11-04: 170 de 457 OSIs.
 */
const PATRONES_SHA = [
  /\binstalaciones de sha\b/,
  /\boficina de sha\b/,
  /\bsha de venezuela\b/,
  /\bhotel rasil\b/,
  /\bpaseo colon con calle monagas\b/,
];

export function normalizar_direccion(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function es_en_sha(direccion: string | null | undefined): boolean {
  if (!direccion) return false;
  const t = normalizar_direccion(direccion);
  if (!t || /\bcaracas\b/.test(t)) return false;
  if (t === "sha") return true;
  return PATRONES_SHA.some((re) => re.test(t));
}
