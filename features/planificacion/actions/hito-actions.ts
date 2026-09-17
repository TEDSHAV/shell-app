"use server";

import { revalidatePath } from "next/cache";
import { hito_schema, type HitoInput } from "../schemas";
import { require_ted_plan_context } from "./assert-ted";

function revalidate_plan() {
  revalidatePath("/ted/planificacion");
}

export async function save_plan_hito(
  raw: HitoInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const parsed = hito_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const input = parsed.data;
  const payload = {
    app_id: input.app_id,
    modulo_id: input.modulo_id || null,
    titulo: input.titulo,
    descripcion: input.descripcion || null,
    trimestre: input.trimestre,
    anio: input.anio,
    icono: input.icono,
  };

  if (input.id) {
    const { error } = await supabase
      .from("ted_plan_hitos" as never)
      .update(payload as never)
      .eq("id", input.id);
    if (error) {
      console.error("[planificacion] update hito:", error);
      return { ok: false, error: "No se pudo actualizar el hito." };
    }
    revalidate_plan();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("ted_plan_hitos" as never)
    .insert({ ...payload, created_by: user_id } as never)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[planificacion] insert hito:", error);
    return { ok: false, error: "No se pudo crear el hito." };
  }
  revalidate_plan();
  return { ok: true, id: Number((data as { id: number }).id) };
}

export async function delete_plan_hito(
  hito_id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(hito_id) || hito_id <= 0) {
    return { ok: false, error: "Hito inválido." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { error } = await gate.ctx.supabase
    .from("ted_plan_hitos" as never)
    .delete()
    .eq("id", hito_id);
  if (error) {
    console.error("[planificacion] delete hito:", error);
    return { ok: false, error: "No se pudo eliminar el hito." };
  }
  revalidate_plan();
  return { ok: true };
}
