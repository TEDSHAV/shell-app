"use server";

import { revalidatePath } from "next/cache";
import { require_ted_plan_context } from "./assert-ted";

function revalidate_cubrir() {
  revalidatePath("/ted/planificacion/cubrir");
  revalidatePath("/ted/planificacion/objetivos");
  revalidatePath("/ted/planificacion/informe");
}

export async function toggle_objetivo_para_mi(
  objetivo_id: number,
  take: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(objetivo_id) || objetivo_id <= 0) {
    return { ok: false, error: "Objetivo inválido." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  if (!user_id) {
    return { ok: false, error: "No se pudo identificar tu usuario." };
  }

  if (take) {
    const { error } = await supabase
      .from("ted_plan_objetivo_responsables" as never)
      .upsert(
        { objetivo_id, usuario_id: user_id } as never,
        { onConflict: "objetivo_id,usuario_id" },
      );
    if (error) {
      console.error("[planificacion] claim objetivo:", error);
      return { ok: false, error: "No se pudo asignar el objetivo." };
    }
  } else {
    const { error } = await supabase
      .from("ted_plan_objetivo_responsables" as never)
      .delete()
      .eq("objetivo_id", objetivo_id)
      .eq("usuario_id", user_id);
    if (error) {
      console.error("[planificacion] unclaim objetivo:", error);
      return { ok: false, error: "No se pudo quitar la asignación." };
    }
  }
  revalidate_cubrir();
  return { ok: true };
}
