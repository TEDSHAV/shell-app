export type OsiDocumentFormatVersion = 1 | 2;

const OSI_FORM_META_CAP_V1 = {
  codigo: "RG-NEG-003",
  fecha: "14/08/2026",
  revision: "1",
} as const;

const OSI_FORM_META_CAP_V2 = {
  codigo: "RG-NEG-003",
  fecha: "05/10/2026",
  revision: "2",
} as const;

export const OSI_FORM_META_ST = {
  codigo: "RG-NEG-004",
  fecha: "14/08/2026",
  revision: "1",
} as const;

/** Si falta sello, conservador = v1 (solicitudes llenadas con formulario viejo). */
export function resolve_osi_document_format_version(
  value: unknown,
): OsiDocumentFormatVersion {
  const n = Number(value);
  return n === 2 ? 2 : 1;
}

export function osi_form_meta_cap(version: OsiDocumentFormatVersion): {
  codigo: string;
  fecha: string;
  revision: string;
} {
  return version === 2 ? OSI_FORM_META_CAP_V2 : OSI_FORM_META_CAP_V1;
}
