const DEFAULT_DAYS = 5;

export function req_interna_fuera_ventana(
  fecha: string,
  ventana_dias = DEFAULT_DAYS,
): boolean {
  const day = Number(String(fecha || "").slice(8, 10));
  if (!Number.isFinite(day) || day <= 0) return false;
  return day > ventana_dias;
}

export function texto_aviso_ventana(ventana_dias = DEFAULT_DAYS): string {
  return (
    `La ventana habitual de pedido interno es los primeros ${ventana_dias} ` +
    "días del mes. Puede continuar; Administración y el líder verán el aviso."
  );
}
