/** Clases tipográficas compartidas del documento OSI (pantalla + impresión). */
export const OSI_DOC_ROOT_TEXT_CLASS = "text-[12px]";

export const OSI_DOC_VALUE_CLASS =
  "osi-doc-value text-center font-semibold tabular-nums";

export const OSI_DOC_VALUE_BOLD_CLASS =
  "osi-doc-value text-center font-bold tabular-nums";

export const OSI_BOOLEAN_VALUE_CLASS =
  "osi-boolean-value text-center font-bold uppercase tabular-nums";

export function format_osi_si_no(value: boolean): "SÍ" | "NO" {
  return value ? "SÍ" : "NO";
}

/**
 * Certificado en dos celdas (2026-11-12). Sin certificado: una sola celda «NO».
 * Celda 1: horas y entrega. Celda 2: evaluación («PRE Y POST» o «SOLO POST», más «TEÓRICA Y PRÁCTICA»).
 */
export function format_certificado_celdas(params: {
  certificado: boolean;
  entrega: "retira_cliente" | "se_envia" | null | undefined;
  horas?: number | null;
  eval_pre_post?: boolean | null;
  eval_teorica_practica?: boolean | null;
}): { celda_1: string; celda_2: string | null } {
  if (!params.certificado) return { celda_1: "NO", celda_2: null };
  const partes = ["SÍ"];
  const horas_n = Math.trunc(Number(params.horas ?? 0));
  if (Number.isFinite(horas_n) && horas_n > 0) partes.push(`${horas_n} ${horas_n === 1 ? "hora" : "horas"}`);
  if (params.entrega === "retira_cliente") partes.push("RETIRA EL CLIENTE");
  if (params.entrega === "se_envia") partes.push("SE ENVÍA");
  const evaluacion = [params.eval_pre_post ? "PRE Y POST" : "SOLO POST"];
  if (params.eval_teorica_practica) evaluacion.push("TEÓRICA Y PRÁCTICA");
  return { celda_1: partes.join(" | "), celda_2: evaluacion.join(" | ") };
}

export function format_certificado_entrega_display(
  certificado: boolean,
  entrega: "retira_cliente" | "se_envia" | null | undefined,
  horas?: number | null,
): string {
  if (!certificado) return "NO";
  const parts = ["SÍ"];
  const horas_n = Number(horas ?? 0);
  if (Number.isFinite(horas_n) && horas_n > 0) {
    const n = Math.trunc(horas_n);
    parts.push(`${n} ${n === 1 ? "hora" : "horas"}`);
  }
  switch (entrega) {
    case "retira_cliente":
      parts.push("RETIRA EL CLIENTE");
      break;
    case "se_envia":
      parts.push("SE ENVÍA");
      break;
    default:
      break;
  }
  return parts.join(" | ");
}
