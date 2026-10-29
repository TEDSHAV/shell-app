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
