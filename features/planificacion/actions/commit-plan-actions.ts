"use server";

import { revalidatePath } from "next/cache";
import { plan_commit_schema } from "../schemas";
import { require_objetivos_write_context } from "./assert-ted";
import { month_bounds, parse_plan_month } from "../lib/plan-month";
import { is_plan_mes_emitido, type PlanMesCambioKind } from "../lib/plan-mes";
import { bump_plan_mes_version, ensure_plan_mes, fetch_plan_mes } from "../lib/plan-mes-db";
import { notify_plan_mes_actualizado } from "../lib/plan-mes-notify";
import type { PlanObjetivoEstado } from "../lib/types";

function revalidate_objetivos() {
  revalidatePath("/ted/planificacion");
  revalidatePath("/ted/planificacion/tareas");
  revalidatePath("/ted/planificacion/objetivos");
  revalidatePath("/ted/planificacion/informe");
  revalidatePath("/ted/planificacion/cubrir");
}

function sorted_ids(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

function same_id_list(a: number[], b: number[]): boolean {
  const left = sorted_ids(a);
  const right = sorted_ids(b);
  return left.length === right.length && left.every((id, i) => id === right[i]);
}

type ExistingRow = {
  id: number;
  titulo: string;
  descripcion: string | null;
  estado: PlanObjetivoEstado;
  app_id: number | null;
  solicitado_por: number | null;
};

async function replace_objetivo_apps(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createAdminClient>>,
  objetivo_id: number,
  app_ids: number[],
) {
  const { error: del_err } = await supabase
    .from("ted_plan_objetivo_apps" as never)
    .delete()
    .eq("objetivo_id", objetivo_id);
  if (del_err) return del_err;
  if (app_ids.length === 0) return null;
  const { error } = await supabase.from("ted_plan_objetivo_apps" as never).insert(
    app_ids.map((app_id) => ({ objetivo_id, app_id })) as never,
  );
  return error;
}

function cambio_from_counts(input: {
  added: number;
  removed: number;
  edited: number;
  sample: string;
}): { kind: PlanMesCambioKind; titulo: string } {
  const kinds = [
    input.added > 0 ? "anadido" : null,
    input.removed > 0 ? "quitado" : null,
    input.edited > 0 ? "editado" : null,
  ].filter((value): value is "anadido" | "quitado" | "editado" => Boolean(value));
  if (kinds.length === 1) {
    const kind = kinds[0];
    if (kind === "anadido") {
      return {
        kind,
        titulo:
          input.added === 1
            ? input.sample
            : `${input.added} objetivos nuevos`,
      };
    }
    if (kind === "quitado") {
      return {
        kind,
        titulo:
          input.removed === 1
            ? input.sample
            : `${input.removed} objetivos`,
      };
    }
    if (kind === "editado") {
      return {
        kind: "editado",
        titulo:
          input.edited === 1 ? input.sample : `${input.edited} objetivos`,
      };
    }
    const _never: never = kind;
    return _never;
  }
  const parts: string[] = [];
  if (input.added) parts.push(`${input.added} alta${input.added === 1 ? "" : "s"}`);
  if (input.removed) parts.push(`${input.removed} baja${input.removed === 1 ? "" : "s"}`);
  if (input.edited) parts.push(`${input.edited} edición${input.edited === 1 ? "" : "es"}`);
  return { kind: "lote", titulo: `Se actualizó el plan (${parts.join(", ")}).` };
}

export async function commit_plan_objetivos(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = plan_commit_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_objetivos_write_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const mes = parse_plan_month(parsed.data.mes);
  const bounds = month_bounds(mes);
  await ensure_plan_mes(supabase, mes);
  const plan_before = await fetch_plan_mes(supabase, mes);

  const { data: existing_rows } = await supabase
    .from("ted_plan_objetivos" as never)
    .select("id, titulo, descripcion, estado, app_id, solicitado_por")
    .lte("fecha_inicio", bounds.end)
    .gte("fecha_fin", bounds.start);
  const existing = (existing_rows ?? []) as ExistingRow[];
  const existing_by_id = new Map(existing.map((row) => [row.id, row]));
  const apps_by_id = new Map<number, number[]>();
  if (existing.length > 0) {
    const { data: link_rows } = await supabase
      .from("ted_plan_objetivo_apps" as never)
      .select("objetivo_id, app_id")
      .in(
        "objetivo_id",
        existing.map((row) => row.id),
      );
    for (const link of (link_rows ?? []) as Array<{
      objetivo_id: number;
      app_id: number;
    }>) {
      const list = apps_by_id.get(link.objetivo_id) ?? [];
      if (!list.includes(link.app_id)) list.push(link.app_id);
      apps_by_id.set(link.objetivo_id, list);
    }
  }
  for (const row of existing) {
    const list = apps_by_id.get(row.id) ?? [];
    if (list.length === 0 && row.app_id) list.push(row.app_id);
    apps_by_id.set(row.id, list);
  }

  const deleted_ids = [...new Set(parsed.data.deleted_ids)].filter((id) =>
    existing_by_id.has(id),
  );
  let added = 0;
  let edited = 0;
  let sample = "";

  for (const id of deleted_ids) {
    sample = existing_by_id.get(id)?.titulo ?? sample;
    const { error } = await supabase
      .from("ted_plan_objetivos" as never)
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[planificacion] commit delete:", error);
      return { ok: false, error: "No se pudo quitar un objetivo." };
    }
  }

  for (const item of parsed.data.items) {
    const app_ids = [...new Set(item.app_ids ?? [])];
    const solicitado_por =
      item.solicitado_por && item.solicitado_por > 0
        ? item.solicitado_por
        : user_id;
    const payload = {
      titulo: item.titulo,
      descripcion: item.descripcion || null,
      fecha_inicio: bounds.start,
      fecha_fin: bounds.end,
      app_id: app_ids[0] ?? null,
      estado: item.estado ?? "abierto",
      solicitado_por,
    };

    if (item.id && existing_by_id.has(item.id) && !deleted_ids.includes(item.id)) {
      const prev = existing_by_id.get(item.id)!;
      const prev_apps = apps_by_id.get(item.id) ?? [];
      const changed =
        (prev.titulo ?? "") !== payload.titulo ||
        (prev.descripcion ?? null) !== payload.descripcion ||
        (prev.estado ?? "abierto") !== payload.estado ||
        (prev.solicitado_por ?? null) !== (payload.solicitado_por ?? null) ||
        !same_id_list(prev_apps, app_ids);
      if (!changed) continue;
      const { error } = await supabase
        .from("ted_plan_objetivos" as never)
        .update(payload as never)
        .eq("id", item.id);
      if (error) {
        console.error("[planificacion] commit update:", error);
        return { ok: false, error: "No se pudo actualizar un objetivo." };
      }
      const links = await replace_objetivo_apps(supabase, item.id, app_ids);
      if (links) {
        return { ok: false, error: "No se pudieron guardar las apps." };
      }
      edited += 1;
      sample = payload.titulo;
      continue;
    }

    const { data, error } = await supabase
      .from("ted_plan_objetivos" as never)
      .insert({ ...payload, created_by: user_id } as never)
      .select("id")
      .single();
    if (error || !data) {
      console.error("[planificacion] commit insert:", error);
      return { ok: false, error: "No se pudo crear un objetivo." };
    }
    const id = Number((data as { id: number }).id);
    const links = await replace_objetivo_apps(supabase, id, app_ids);
    if (links) {
      return { ok: false, error: "No se pudieron guardar las apps." };
    }
    added += 1;
    sample = payload.titulo;
  }

  const removed = deleted_ids.length;
  const changed = added + removed + edited > 0;
  if (!changed) {
    return { ok: false, error: "No hay cambios para guardar." };
  }

  if (is_plan_mes_emitido(plan_before)) {
    const plan = await bump_plan_mes_version(supabase, mes);
    await notify_plan_mes_actualizado(
      supabase,
      plan,
      cambio_from_counts({ added, removed, edited, sample }),
    );
  }
  revalidate_objetivos();
  return { ok: true };
}
