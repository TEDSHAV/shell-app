import type { OSIFixedItem } from "@/types/requisiciones";

const EPS = 0.02;

function money(value: number | null | undefined): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function osi_fixed_line_total(item: Pick<
  OSIFixedItem,
  | "dias_traslado"
  | "costo_traslado"
  | "impresion_total"
  | "honorarios_total"
  | "informe_final_total"
>): number {
  return money(
    money(item.dias_traslado) * money(item.costo_traslado) +
      money(item.impresion_total) +
      money(item.honorarios_total) +
      money(item.informe_final_total),
  );
}

export function osi_fixed_clone_differs(
  current: OSIFixedItem,
  original: OSIFixedItem,
): boolean {
  const keys: Array<keyof OSIFixedItem> = [
    "dias_traslado",
    "costo_traslado",
    "impresion_total",
    "honorarios_horas",
    "honorarios_costo_hora",
    "honorarios_total",
    "informe_final_total",
  ];
  return keys.some(
    (key) => Math.abs(money(Number(current[key])) - money(Number(original[key]))) >= EPS,
  );
}
