import { load_cubrir_workspace, type PlanObjetivoCover } from "./objetivo-actions";
import { flatten_plan_tasks, type FlatPlanTask } from "../lib/flatten-plan-tasks";
import { is_tarea_done, is_tarea_no_solicitada } from "../lib/task-progress";
import { iso_date } from "../lib/task-dates";
import { month_bounds, parse_plan_month } from "../lib/plan-month";

export type InformePlusItem = {
  id: number;
  titulo: string;
  origen: FlatPlanTask["tarea"]["origen"];
  avance: number;
  app_nombre: string;
  modulo_nombre: string;
};

export type InformeMonth = {
  mes: string;
  compromiso_pct: number;
  plus_count: number;
  objetivos: PlanObjetivoCover[];
  plus: InformePlusItem[];
};

function in_month(iso: string | null | undefined, start: string, end: string): boolean {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return day >= start && day <= end;
}

export async function load_informe_month(
  mes_raw: string,
): Promise<{ ok: true; data: InformeMonth } | { ok: false; error: string }> {
  const cover = await load_cubrir_workspace(mes_raw);
  if (!cover.ok) return cover;
  const mes = parse_plan_month(cover.data.mes);
  const { start, end } = month_bounds(mes);
  const plus: InformePlusItem[] = flatten_plan_tasks(cover.data.plan_apps)
    .filter(({ tarea }) => {
      if (tarea.objetivo_id) return false;
      if (is_tarea_no_solicitada(tarea)) return false;
      if (!is_tarea_done(tarea)) return false;
      const fecha_inicio = iso_date(tarea.fecha_inicio);
      const fecha_fin = iso_date(tarea.fecha_fin);
      if (!fecha_inicio && !fecha_fin) return false;
      return in_month(fecha_fin ?? fecha_inicio, start, end);
    })
    .map(({ tarea, app_nombre, modulo_nombre }) => ({
      id: tarea.id,
      titulo: tarea.titulo,
      origen: tarea.origen,
      avance: tarea.avance,
      app_nombre,
      modulo_nombre,
    }));

  const objetivos = cover.data.objetivos;
  const compromiso_pct =
    objetivos.length === 0
      ? 0
      : Math.round(
          objetivos.reduce((sum, item) => sum + item.avance, 0) / objetivos.length,
        );

  return {
    ok: true,
    data: {
      mes,
      compromiso_pct,
      plus_count: plus.length,
      objetivos,
      plus,
    },
  };
}

export async function load_public_informe(
  token: string,
): Promise<
  | { ok: true; data: InformeMonth; captured_at: string }
  | { ok: false; error: string }
> {
  const { is_public_snapshot_token } = await import("../lib/public-plan-snapshot");
  if (!is_public_snapshot_token(token)) {
    return { ok: false, error: "Este enlace no es válido." };
  }
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("ted_plan_public_snapshots" as never)
    .select("payload, created_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: "Este enlace no existe o ya no está disponible." };
  }
  const row = data as { payload: unknown; created_at: string };
  const payload = as_informe_snapshot(row.payload);
  if (!payload) {
    return { ok: false, error: "Esta foto no es un informe." };
  }
  return { ok: true, data: payload, captured_at: row.created_at };
}

export function as_informe_snapshot(value: unknown): InformeMonth | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { kind?: string; mes?: string; objetivos?: unknown; plus?: unknown };
  if (row.kind !== "informe") return null;
  if (typeof row.mes !== "string" || !Array.isArray(row.objetivos) || !Array.isArray(row.plus)) {
    return null;
  }
  return value as InformeMonth;
}