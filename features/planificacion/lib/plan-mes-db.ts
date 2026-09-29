import type { createAdminClient } from "@/lib/supabase/server";
import { empty_plan_mes, type PlanMes, type PlanMesEstado } from "./plan-mes";
import { parse_plan_month } from "./plan-month";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

type PlanMesRow = {
  mes: string;
  estado: PlanMesEstado;
  version: number;
  emitido_at: string | null;
  emitido_por: number | null;
};

export function as_plan_mes(row: PlanMesRow | null | undefined, mes: string): PlanMes {
  if (!row) return empty_plan_mes(mes);
  return {
    mes: row.mes,
    estado: row.estado === "emitido" ? "emitido" : "borrador",
    version: Number(row.version ?? 0),
    emitido_at: row.emitido_at ?? null,
    emitido_por: row.emitido_por ?? null,
  };
}

export async function fetch_plan_mes(
  supabase: Admin,
  mes_raw: string,
): Promise<PlanMes> {
  const mes = parse_plan_month(mes_raw);
  const { data } = await supabase
    .from("ted_plan_mes" as never)
    .select("mes, estado, version, emitido_at, emitido_por")
    .eq("mes", mes)
    .maybeSingle();
  return as_plan_mes(data as PlanMesRow | null, mes);
}

export async function ensure_plan_mes(
  supabase: Admin,
  mes_raw: string,
): Promise<PlanMes> {
  const mes = parse_plan_month(mes_raw);
  const existing = await fetch_plan_mes(supabase, mes);
  if (existing.version > 0 || existing.estado === "emitido" || existing.emitido_at) {
    return existing;
  }
  const { data } = await supabase
    .from("ted_plan_mes" as never)
    .select("mes")
    .eq("mes", mes)
    .maybeSingle();
  if (data) return fetch_plan_mes(supabase, mes);
  const { error } = await supabase.from("ted_plan_mes" as never).insert({
    mes,
    estado: "borrador",
    version: 0,
  } as never);
  if (error && error.code !== "23505") {
    console.error("[planificacion] ensure plan mes:", error);
  }
  return fetch_plan_mes(supabase, mes);
}

export async function bump_plan_mes_version(
  supabase: Admin,
  mes_raw: string,
): Promise<PlanMes> {
  const current = await ensure_plan_mes(supabase, mes_raw);
  if (current.estado !== "emitido") return current;
  const next = current.version + 1;
  const { error } = await supabase
    .from("ted_plan_mes" as never)
    .update({ version: next } as never)
    .eq("mes", current.mes);
  if (error) {
    console.error("[planificacion] bump plan mes:", error);
    return current;
  }
  return { ...current, version: next };
}
