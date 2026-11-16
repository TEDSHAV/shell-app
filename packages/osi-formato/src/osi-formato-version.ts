export type OsiDocumentFormatVersion = 1 | 2;

export type OsiFormMeta = {
  codigo: string;
  fecha: string;
  revision: string;
};

/** Código único del formato OSI (capacitación y servicios técnicos). */
export const OSI_FORM_CODIGO = "RG-NEG-0001";

/** Inicio de la revisión 2: 05/10/2026 00:00 hora de Caracas. */
const OSI_REVISION_2_DESDE_MS = Date.parse("2026-10-05T04:00:00Z");

/** Revisión 1: OSI emitidas antes del 05/10/2026 (o sin fecha de emisión). */
const OSI_FORM_META_REV_1: OsiFormMeta = {
  codigo: OSI_FORM_CODIGO,
  fecha: "14/08/2026",
  revision: "1",
};

/** Revisión 2: OSI emitidas del 05/10/2026 hasta el despliegue del 16/11/2026. */
const OSI_FORM_META_REV_2: OsiFormMeta = {
  codigo: OSI_FORM_CODIGO,
  fecha: "05/10/2026",
  revision: "2",
};

/** Revisión 3: OSI con el formato nuevo (sello 2), desde el 16/11/2026. */
const OSI_FORM_META_REV_3: OsiFormMeta = {
  codigo: OSI_FORM_CODIGO,
  fecha: "16/11/2026",
  revision: "3",
};

/** Si falta sello, conservador = v1 (solicitudes llenadas con formulario viejo). */
export function resolve_osi_document_format_version(
  value: unknown,
): OsiDocumentFormatVersion {
  const n = Number(value);
  return n === 2 ? 2 : 1;
}

/**
 * Encabezado (código, fecha, revisión) de la OSI.
 * Sello 2 (formato nuevo) → revisión 3. Sello 1 → revisión 2 si se emitió
 * desde el 05/10/2026; si no (o sin fecha), revisión 1.
 */
export function osi_form_meta(input: {
  sello: OsiDocumentFormatVersion;
  fecha_emision?: string | null;
}): OsiFormMeta {
  if (input.sello === 2) {
    return OSI_FORM_META_REV_3;
  }
  const ms = input.fecha_emision ? Date.parse(input.fecha_emision) : Number.NaN;
  return Number.isFinite(ms) && ms >= OSI_REVISION_2_DESDE_MS
    ? OSI_FORM_META_REV_2
    : OSI_FORM_META_REV_1;
}
