"use server";

import { createClient } from "@/lib/supabase/server";
import type { CajonPedido } from "@/features/requisiciones/lib/req-destino";

export async function homologar_req_linea_action(params: {
  id_linea: number;
  ambito_catalogo: string;
  cajon: CajonPedido;
  id_categoria?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: linea, error: line_err } = await supabase
    .from("req_lineas")
    .select(
      "id,nombre_item,unidad,id_item_costo,esta_suelto,costo_pagado,costo_catalogo,id_requisicion,cajon",
    )
    .eq("id", params.id_linea)
    .single();
  if (line_err || !linea) {
    return { ok: false, error: "Línea no encontrada." };
  }
  if (linea.id_item_costo) {
    return { ok: true };
  }

  const costo_base = Number(
    linea.costo_pagado ?? linea.costo_catalogo ?? 0,
  );
  let id_departamentos: number[] = [];
  if ((linea.cajon as string) === "interno") {
    const { data: req } = await supabase
      .from("requisiciones")
      .select("departamento")
      .eq("id", linea.id_requisicion)
      .maybeSingle();
    if (req?.departamento) {
      const { data: depto } = await supabase
        .from("departamentos")
        .select("id")
        .ilike("nombre", String(req.departamento))
        .maybeSingle();
      if (depto?.id) id_departamentos = [Number(depto.id)];
    }
  }

  const { data: rol } = await supabase
    .from("conf_clasificadores")
    .select("id")
    .eq("tabla_referencia", "ecc_catalogo_costos")
    .eq("atributo_referencia", "id_rol")
    .eq("definicion", params.cajon)
    .maybeSingle();

  const { data: unidad } = await supabase
    .from("conf_clasificadores")
    .select("id")
    .ilike("definicion", String(linea.unidad || "und"))
    .limit(1)
    .maybeSingle();

  const { data: inserted, error: ins_err } = await supabase
    .from("ecc_catalogo_costos")
    .insert({
      nombre_item: linea.nombre_item,
      costo_unitario_base: costo_base,
      id_categoria: params.id_categoria ?? null,
      id_unidad: unidad?.id ?? null,
      esta_activo: true,
      ambito_catalogo: params.ambito_catalogo,
      id_rol: rol?.id ?? null,
      id_departamentos,
    } as never)
    .select("id")
    .single();

  if (ins_err || !inserted) {
    return { ok: false, error: ins_err?.message || "No se pudo homologar." };
  }

  const { error: up_err } = await supabase
    .from("req_lineas")
    .update({
      id_item_costo: inserted.id,
      homologado_en: inserted.id,
      esta_suelto: false,
    })
    .eq("id", params.id_linea);

  if (up_err) return { ok: false, error: up_err.message };
  return { ok: true };
}

export async function update_req_linea_pagado_action(params: {
  id_linea: number;
  costo_pagado: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("req_lineas")
    .update({ costo_pagado: params.costo_pagado })
    .eq("id", params.id_linea);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
