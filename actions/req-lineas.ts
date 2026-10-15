"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createRequisicionRecord,
  updateRequisicionRecord,
} from "@/actions/requisiciones";
import type { RequisicionFormData, RequisicionItem } from "@/types/requisiciones";
import type { CajonPedido, CatalogAmbitoPedido } from "@/features/requisiciones/lib/req-destino";
import {
  catalogo_interno_visible,
  type CatalogoPedidoItem,
} from "@/features/requisiciones/lib/req-sugerir-reposicion";
import {
  linea_es_persistible,
  type ReqLineaDraft,
} from "@/features/requisiciones/lib/req-lineas-types";

export async function list_catalogo_pedido_action(
  cajon: CajonPedido,
  ambito: CatalogAmbitoPedido,
  id_departamento?: number | null,
  departamento_nombre?: string | null,
): Promise<CatalogoPedidoItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_catalogo_pedido")
    .select(
      "id,nombre_item,unidad,ambito_catalogo,rol,costo_unitario_base,id_departamentos",
    )
    .eq("rol", cajon)
    .in("ambito_catalogo", [ambito, "general"]);
  if (error) {
    console.error("[list_catalogo_pedido_action]", error.message);
    return [];
  }
  const rows = (data || []) as CatalogoPedidoItem[];
  if (cajon !== "interno") return rows;
  let depto_id = id_departamento ?? null;
  if (depto_id == null && departamento_nombre) {
    const { data: depto } = await supabase
      .from("departamentos")
      .select("id")
      .ilike("nombre", departamento_nombre)
      .maybeSingle();
    depto_id = depto?.id ?? null;
  }
  return rows.filter((row) =>
    catalogo_interno_visible(row.id_departamentos, depto_id),
  );
}

export async function list_req_lineas_action(
  id_requisicion: number,
): Promise<ReqLineaDraft[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("req_lineas")
    .select("*")
    .eq("id_requisicion", id_requisicion)
    .order("id");
  if (error) return [];
  return (data || []).map((row) => ({
    local_id: String(row.id),
    id: row.id as number,
    id_item_costo: (row.id_item_costo as number | null) ?? null,
    cajon: row.cajon as CajonPedido,
    nombre_item: String(row.nombre_item),
    unidad: String(row.unidad || "und"),
    cantidad: Number(row.cantidad || 1),
    costo_catalogo: Number(row.costo_catalogo || 0),
    costo_pagado:
      row.costo_pagado == null ? null : Number(row.costo_pagado),
    esta_suelto: Boolean(row.esta_suelto),
  }));
}

function dual_write_items(
  lineas: ReqLineaDraft[],
  id_osi?: number | null,
): RequisicionItem[] {
  return lineas
    .filter(
      (row) =>
        linea_es_persistible(row) && String(row.nombre_item || "").trim(),
    )
    .map((row) => {
      const unit = row.costo_pagado ?? row.costo_catalogo ?? 0;
      const cant = Number(row.cantidad || 0);
      return {
        id: row.local_id,
        cant,
        unidad: row.unidad || "und",
        descripcion: row.nombre_item,
        costo_unitario: unit,
        total: cant * unit,
        verificacion: "pendiente" as const,
        id_osi: id_osi ?? null,
      };
    });
}

async function replace_lineas(
  id_requisicion: number,
  lineas: ReqLineaDraft[],
  cajon: CajonPedido,
) {
  const supabase = await createClient();
  await supabase.from("req_lineas").delete().eq("id_requisicion", id_requisicion);
  if (lineas.length === 0) return;
  const { error } = await supabase.from("req_lineas").insert(
    lineas.map((row) => ({
      id_requisicion,
      id_item_costo: row.id_item_costo,
      cajon,
      nombre_item: row.nombre_item,
      unidad: row.unidad,
      cantidad: row.cantidad,
      costo_catalogo: row.costo_catalogo,
      costo_pagado: row.costo_pagado,
      esta_suelto: row.esta_suelto,
    })),
  );
  if (error) throw error;
}

export async function save_req_with_lineas_action(params: {
  form: RequisicionFormData;
  lineas: ReqLineaDraft[];
  cajon: CajonPedido;
  edit_id?: number | null;
  hermana?: {
    form: RequisicionFormData;
    lineas: ReqLineaDraft[];
  } | null;
}): Promise<{ id: number; hermana_id: number | null }> {
  const lote =
    params.form.id_lote_pedido ||
    (params.hermana ? crypto.randomUUID() : null);
  const persist_lineas =
    (params.form.osi_fixed_items || []).length > 0
      ? params.lineas.filter(
          (row) =>
            linea_es_persistible(row) && String(row.nombre_item || "").trim(),
        )
      : params.lineas.filter((row) => String(row.nombre_item || "").trim());
  const id_osi_pdf = params.form.selectedOSIs[0]?.id_osi ?? null;
  const payload: RequisicionFormData = {
    ...params.form,
    id_lote_pedido: lote,
    additional_items: dual_write_items(persist_lineas, id_osi_pdf),
  };

  let id = params.edit_id || 0;
  if (params.edit_id) {
    await updateRequisicionRecord(params.edit_id, payload);
  } else {
    const created = await createRequisicionRecord(payload);
    id = Number((created as { id?: number })?.id);
  }
  if (!id) throw new Error("No se pudo guardar la requisición.");
  await replace_lineas(id, persist_lineas, params.cajon);

  let hermana_id: number | null = null;
  if (params.hermana && params.hermana.lineas.length > 0 && !params.edit_id) {
    const hermana_form: RequisicionFormData = {
      ...params.hermana.form,
      id_lote_pedido: lote,
      additional_items: dual_write_items(params.hermana.lineas, null),
    };
    const created_h = await createRequisicionRecord(hermana_form);
    hermana_id = Number((created_h as { id?: number })?.id);
    if (hermana_id) {
      await replace_lineas(hermana_id, params.hermana.lineas, "inventario");
      const supabase = await createClient();
      await supabase
        .from("requisiciones")
        .update({ id_requisicion_hermana: hermana_id })
        .eq("id", id);
      await supabase
        .from("requisiciones")
        .update({ id_requisicion_hermana: id })
        .eq("id", hermana_id);
    }
  }

  return { id, hermana_id };
}

export async function attach_req_hermana_action(params: {
  id_requisicion: number;
  form: RequisicionFormData;
  lineas: ReqLineaDraft[];
}): Promise<{ hermana_id: number | null }> {
  if (params.lineas.length === 0) return { hermana_id: null };
  const supabase = await createClient();
  const { data: parent } = await supabase
    .from("requisiciones")
    .select("id,id_lote_pedido,id_requisicion_hermana")
    .eq("id", params.id_requisicion)
    .maybeSingle();
  if (!parent) throw new Error("Requisición no encontrada.");
  if (parent.id_requisicion_hermana) {
    return { hermana_id: Number(parent.id_requisicion_hermana) };
  }
  const lote = parent.id_lote_pedido || crypto.randomUUID();
  if (!parent.id_lote_pedido) {
    await supabase
      .from("requisiciones")
      .update({ id_lote_pedido: lote } as never)
      .eq("id", params.id_requisicion);
  }
  return save_req_with_lineas_action({
    form: {
      ...params.form,
      id_lote_pedido: lote,
      clase_pedido: "servicio_inventario",
      is_general: true,
      tipo_solicitud: "Interno",
      osi_fixed_items: [],
      selectedOSIs: [],
    },
    lineas: params.lineas,
    cajon: "inventario",
  }).then(async (created) => {
    const hermana_id = created.id;
    await supabase
      .from("requisiciones")
      .update({ id_requisicion_hermana: hermana_id } as never)
      .eq("id", params.id_requisicion);
    await supabase
      .from("requisiciones")
      .update({
        id_requisicion_hermana: params.id_requisicion,
        id_lote_pedido: lote,
      } as never)
      .eq("id", hermana_id);
    return { hermana_id };
  });
}
