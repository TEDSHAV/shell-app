import type { createAdminClient } from "@/lib/supabase/server";
import { fanOutNotifyByConfig } from "@/lib/notification-recipient/runtime-resolve";
import { format_month_label, month_bounds, parse_plan_month } from "./plan-month";
import type { PlanMes, PlanMesCambioKind, PlanObjetivoResumen } from "./plan-mes";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;

function excerpt(text: string | null | undefined, max = 140): string {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function format_objetivo_line(item: PlanObjetivoResumen): string {
  const apps = item.apps.length > 0 ? item.apps.join(" · ") : "Sin app";
  const autor = item.autor ? ` — ${item.autor}` : "";
  const extra = excerpt(item.descripcion);
  return extra
    ? `• ${item.titulo} (${apps}${autor})\n  ${extra}`
    : `• ${item.titulo} (${apps}${autor})`;
}

export async function list_plan_objetivos_resumen(
  supabase: Admin,
  mes_raw: string,
): Promise<PlanObjetivoResumen[]> {
  const mes = parse_plan_month(mes_raw);
  const { start, end } = month_bounds(mes);
  const { data: obj_rows, error } = await supabase
    .from("ted_plan_objetivos" as never)
    .select("id, titulo, descripcion, app_id, created_by, solicitado_por")
    .lte("fecha_inicio", end)
    .gte("fecha_fin", start)
    .order("id");
  if (error) {
    console.error("[planificacion] resumen objetivos:", error);
    return [];
  }
  const rows = (obj_rows ?? []) as Array<{
    id: number;
    titulo: string;
    descripcion: string | null;
    app_id: number | null;
    created_by: number | null;
    solicitado_por: number | null;
  }>;
  if (rows.length === 0) return [];

  const apps_by_obj = new Map<number, number[]>();
  const { data: links } = await supabase
    .from("ted_plan_objetivo_apps" as never)
    .select("objetivo_id, app_id")
    .in(
      "objetivo_id",
      rows.map((row) => row.id),
    );
  for (const link of (links ?? []) as Array<{
    objetivo_id: number;
    app_id: number;
  }>) {
    const list = apps_by_obj.get(link.objetivo_id) ?? [];
    if (!list.includes(link.app_id)) list.push(link.app_id);
    apps_by_obj.set(link.objetivo_id, list);
  }

  const app_ids = [
    ...new Set(
      rows.flatMap((row) => {
        const linked = apps_by_obj.get(row.id);
        if (linked && linked.length > 0) return linked;
        return row.app_id ? [row.app_id] : [];
      }),
    ),
  ];
  const app_name = new Map<number, string>();
  if (app_ids.length > 0) {
    const { data: apps } = await supabase
      .from("ted_plan_apps" as never)
      .select("id, nombre")
      .in("id", app_ids);
    for (const app of (apps ?? []) as Array<{ id: number; nombre: string }>) {
      app_name.set(app.id, app.nombre);
    }
  }

  const author_ids = [
    ...new Set(
      rows
        .flatMap((row) => [row.solicitado_por, row.created_by])
        .filter((id): id is number => Boolean(id)),
    ),
  ];
  const authors = new Map<number, string>();
  if (author_ids.length > 0) {
    const { data: users } = await supabase
      .from("usuarios")
      .select("id, nombre_apellido")
      .in("id", author_ids);
    for (const user of (users ?? []) as Array<{
      id: number;
      nombre_apellido: string;
    }>) {
      authors.set(user.id, user.nombre_apellido);
    }
  }

  return rows.map((row) => {
    const ids = apps_by_obj.get(row.id) ?? (row.app_id ? [row.app_id] : []);
    return {
      id: row.id,
      titulo: row.titulo,
      descripcion: row.descripcion,
      apps: ids.map((id) => app_name.get(id)).filter((name): name is string => Boolean(name)),
      autor: (() => {
        const sid = row.solicitado_por ?? row.created_by;
        return sid ? (authors.get(sid) ?? null) : null;
      })(),
    };
  });
}

function list_body(items: PlanObjetivoResumen[]): string {
  if (items.length === 0) return "No hay objetivos vigentes en este mes.";
  return items.map(format_objetivo_line).join("\n");
}

export async function notify_plan_mes_emitido(
  supabase: Admin,
  plan: PlanMes,
): Promise<void> {
  const items = await list_plan_objetivos_resumen(supabase, plan.mes);
  const label = format_month_label(plan.mes);
  await fanOutNotifyByConfig(supabase, {
    appSlug: "ted",
    eventKey: "plan_mes_emitido",
    title: `Plan de ${label} emitido`,
    body: `Gerencia emitió el plan de ${label} (v${plan.version}).\n\n${list_body(items)}`,
    linkPath: `/ted/planificacion/objetivos?mes=${plan.mes}`,
    metadata: { mes: plan.mes, version: plan.version },
    dedupeKey: `plan-mes:${plan.mes}:emitido:v${plan.version}`,
    priority: 2,
  });
  const { email_plan_mes } = await import("./plan-mes-email");
  await email_plan_mes({ plan, kind: "emitido", items });
}

export async function notify_plan_mes_actualizado(
  supabase: Admin,
  plan: PlanMes,
  cambio: { kind: PlanMesCambioKind; titulo: string },
): Promise<void> {
  const items = await list_plan_objetivos_resumen(supabase, plan.mes);
  const label = format_month_label(plan.mes);
  const headline = ((): string => {
    switch (cambio.kind) {
      case "anadido":
        return `Se añadió «${cambio.titulo}»`;
      case "quitado":
        return `Se quitó «${cambio.titulo}»`;
      case "editado":
        return `Se editó «${cambio.titulo}»`;
      case "lote":
        return cambio.titulo;
      default: {
        const _never: never = cambio.kind;
        return _never;
      }
    }
  })();
  await fanOutNotifyByConfig(supabase, {
    appSlug: "ted",
    eventKey: "plan_mes_actualizado",
    title: `Cambio en el plan de ${label}`,
    body: `${headline}.\nPlan vigente (v${plan.version}):\n\n${list_body(items)}`,
    linkPath: `/ted/planificacion/objetivos?mes=${plan.mes}`,
    metadata: { mes: plan.mes, version: plan.version, kind: cambio.kind },
    dedupeKey: `plan-mes:${plan.mes}:upd:v${plan.version}`,
    priority: 2,
  });
  const { email_plan_mes } = await import("./plan-mes-email");
  await email_plan_mes({
    plan,
    kind: cambio.kind,
    cambio_titulo: cambio.titulo,
    items,
  });
}
