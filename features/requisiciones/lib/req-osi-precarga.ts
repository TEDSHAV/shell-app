import type { OSIFixedItem, OSIFullData, OSISesion } from "@/types/requisiciones";

export function build_osi_fixed_item(
  osi: OSIFullData,
  sesion?: OSISesion | null,
): OSIFixedItem {
  const honorarios_horas =
    sesion?.horas_honorarios_instructor ?? osi.horas_honorarios_instructor ?? 0;
  const honorarios_costo_hora =
    sesion?.tarifa_hora_honorarios ?? osi.tarifa_hora_honorarios ?? 0;
  const honorarios_from_rate =
    Number(honorarios_horas || 0) * Number(honorarios_costo_hora || 0);
  const honorarios_total =
    honorarios_from_rate > 0
      ? honorarios_from_rate
      : (sesion?.costo_honorarios_instructor ??
        osi.costo_honorarios_instructor ??
        0);
  return {
    id_osi: osi.id_osi,
    nro_osi: osi.nro_osi,
    dias_traslado: 1,
    costo_traslado: sesion?.costo_traslado ?? osi.costo_traslado ?? 0,
    impresion_total:
      sesion?.costo_impresion_material ?? osi.costo_impresion_material ?? 0,
    honorarios_horas,
    honorarios_costo_hora,
    honorarios_total,
    informe_final_total: 0,
    verificacion_traslado: "pendiente",
    verificacion_impresion: "pendiente",
    verificacion_honorarios: "pendiente",
    verificacion_informe_final: "pendiente",
  };
}

export function patch_osi_fixed(
  current: OSIFixedItem,
  updates: Partial<OSIFixedItem>,
): OSIFixedItem {
  const next = { ...current, ...updates };
  if ("honorarios_horas" in updates || "honorarios_costo_hora" in updates) {
    next.honorarios_total =
      Number(next.honorarios_horas || 0) * Number(next.honorarios_costo_hora || 0);
  }
  return next;
}
