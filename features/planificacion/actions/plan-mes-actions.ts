"use server";

import { revalidatePath } from "next/cache";
import { require_objetivos_write_context, require_objetivos_read_context } from "./assert-ted";
import { as_plan_mes, ensure_plan_mes, fetch_plan_mes } from "../lib/plan-mes-db";
import { notify_plan_mes_emitido } from "../lib/plan-mes-notify";
import { month_bounds, parse_plan_month } from "../lib/plan-month";
import type { PlanMes } from "../lib/plan-mes";

function revalidate_plan() {
  revalidatePath("/ted/planificacion");
  revalidatePath("/ted/planificacion/tareas");
  revalidatePath("/ted/planificacion/objetivos");
  revalidatePath("/ted/planificacion/informe");
  revalidatePath("/ted/planificacion/cubrir");
}

export async function load_plan_mes(
  mes_raw: string,
): Promise<{ ok: true; plan: PlanMes } | { ok: false; error: string }> {
  const gate = await require_objetivos_read_context();
  if (!gate.ok) return gate;
  const plan = await fetch_plan_mes(gate.ctx.supabase, mes_raw);
  return { ok: true, plan };
}

export async function emit_plan_mes(
  mes_raw: string,
): Promise<{ ok: true; plan: PlanMes } | { ok: false; error: string }> {
  const gate = await require_objetivos_write_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const current = await ensure_plan_mes(supabase, mes_raw);
  if (current.estado === "emitido") {
    return { ok: false, error: "Este plan ya está emitido." };
  }
  const mes = parse_plan_month(mes_raw);
  const bounds = month_bounds(mes);
  const { count, error: count_error } = await supabase
    .from("ted_plan_objetivos" as never)
    .select("id", { count: "exact", head: true })
    .lte("fecha_inicio", bounds.end)
    .gte("fecha_fin", bounds.start);
  if (count_error) {
    console.error("[planificacion] emitir count:", count_error);
  }
  if (!count || count < 1) {
    return {
      ok: false,
      error: "Guarda al menos un objetivo en el borrador antes de emitir.",
    };
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ted_plan_mes" as never)
    .update({
      estado: "emitido",
      version: Math.max(current.version, 0) + 1,
      emitido_at: now,
      emitido_por: user_id,
    } as never)
    .eq("mes", current.mes)
    .select("mes, estado, version, emitido_at, emitido_por, analisis_texto")
    .single();
  if (error || !data) {
    console.error("[planificacion] emitir plan:", error);
    return { ok: false, error: "No se pudo emitir el plan del mes." };
  }
  const plan = as_plan_mes(
    data as {
      mes: string;
      estado: PlanMes["estado"];
      version: number;
      emitido_at: string | null;
      emitido_por: number | null;
      analisis_texto?: string | null;
    },
    current.mes,
  );
  await notify_plan_mes_emitido(supabase, plan);
  revalidate_plan();
  return { ok: true, plan };
}
