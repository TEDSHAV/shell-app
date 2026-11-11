"use server";

import { load_informe_month } from "./informe-actions";
import { require_objetivos_read_context } from "./assert-ted";
import { parse_plan_month } from "../lib/plan-month";
import { TED_DEPARTMENT_ID } from "../lib/ted-department";
import type { PlanUsuarioOption } from "../lib/types";
import {
  MONTH_KEYS,
  build_fi_ted_year_rows,
  scopes_for_kpi_usuarios,
  year_from_mes,
  type FiTedReportScope,
} from "../lib/informe-fi-ted";
import {
  build_fi_ted_comparativo_workbook,
  build_fi_ted_sig_workbook,
} from "../lib/informe-excel-workbook";
import type { InformeMonth } from "../lib/informe-types";

async function load_year_informes(anio: number): Promise<InformeMonth[]> {
  const months: InformeMonth[] = [];
  for (const mm of MONTH_KEYS) {
    const mes = `${anio}-${mm}`;
    const loaded = await load_informe_month(mes, {
      unpublished_objetivos: "include",
    });
    if (loaded.ok) months.push(loaded.data);
  }
  return months;
}

type AdminClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createAdminClient>
>;

async function load_ted_usuarios(
  supabase: AdminClient,
): Promise<PlanUsuarioOption[]> {
  const { data, error } = await supabase
    .from("usuarios" as never)
    .select("id, nombre_apellido, esta_activo, departamento")
    .eq("departamento", TED_DEPARTMENT_ID);
  if (error) {
    console.error("[planificacion] ted users export:", error);
    return [];
  }
  const rows = (data ?? []) as Array<{
    id: number;
    nombre_apellido: string;
    esta_activo: boolean | null;
  }>;
  return rows
    .filter((u) => u.esta_activo !== false)
    .map((u) => ({ id: u.id, label: u.nombre_apellido }));
}

async function reporter_name(
  supabase: AdminClient,
  user_id: number | null,
): Promise<string> {
  if (!user_id) return "TED";
  const { data } = await supabase
    .from("usuarios" as never)
    .select("nombre_apellido")
    .eq("id", user_id)
    .maybeSingle();
  const row = data as { nombre_apellido?: string } | null;
  return row?.nombre_apellido?.trim() || "TED";
}

export type InformeExcelExport =
  | {
      ok: true;
      filename: string;
      base64: string;
    }
  | { ok: false; error: string };

export async function export_informe_excel_sig(
  mes_raw: string,
): Promise<InformeExcelExport> {
  const gate = await require_objetivos_read_context();
  if (!gate.ok) return gate;
  const mes = parse_plan_month(mes_raw);
  const anio = year_from_mes(mes);
  const months = await load_year_informes(anio);
  const scope: FiTedReportScope = {
    kind: "sig",
    label: "Indicador general SIG",
  };
  const rows = build_fi_ted_year_rows(months, scope, anio);
  const reportado_por = await reporter_name(
    gate.ctx.supabase,
    gate.ctx.user_id,
  );
  try {
    const buffer = await build_fi_ted_sig_workbook({
      anio,
      rows,
      reportado_por,
    });
    return {
      ok: true,
      filename: `FI-TED-objetivos-SIG-${anio}.xlsx`,
      base64: buffer.toString("base64"),
    };
  } catch (error) {
    console.error("[planificacion] excel sig:", error);
    return { ok: false, error: "No se pudo generar el Excel SIG." };
  }
}

export async function export_informe_excel_kpi(
  mes_raw: string,
): Promise<InformeExcelExport> {
  const gate = await require_objetivos_read_context();
  if (!gate.ok) return gate;
  const mes = parse_plan_month(mes_raw);
  const anio = year_from_mes(mes);
  const months = await load_year_informes(anio);
  const usuarios = await load_ted_usuarios(gate.ctx.supabase);
  if (usuarios.length === 0) {
    return {
      ok: false,
      error: "No hay usuarios TED para el KPI de control interno.",
    };
  }
  const scopes = scopes_for_kpi_usuarios(usuarios, months);
  const users = scopes.map((scope) => ({
    label: scope.label,
    rows: build_fi_ted_year_rows(months, scope, anio),
  }));
  const reportado_por = await reporter_name(
    gate.ctx.supabase,
    gate.ctx.user_id,
  );
  try {
    const buffer = await build_fi_ted_comparativo_workbook({
      anio,
      users,
      reportado_por,
    });
    return {
      ok: true,
      filename: `FI-TED-objetivos-KPI-comparativo-${anio}.xlsx`,
      base64: buffer.toString("base64"),
    };
  } catch (error) {
    console.error("[planificacion] excel kpi:", error);
    return {
      ok: false,
      error: "No se pudo generar el Excel de control interno.",
    };
  }
}
