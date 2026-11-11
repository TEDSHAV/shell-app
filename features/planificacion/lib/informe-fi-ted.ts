import type { InformeMonth, InformePlusItem } from "./informe-types";
import type { PlanObjetivoCover, PlanOrigen, PlanUsuarioOption } from "./types";
import {
  is_informe_objetivo_cumplido,
  is_prisma_ene_sep_month,
  PRISMA_ENE_SEP_OBSERVACION,
} from "./informe-analisis-draft";
import {
  format_analisis_for_display,
  parse_analisis_texto,
} from "./informe-analisis";

const REQ_ORIGINS = new Set<PlanOrigen>(["REQUERIMIENTO", "USUARIO"]);

export const FI_TED_META = 0.9;

export const MONTH_KEYS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
] as const;

export const MONTH_LABELS_ES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
] as const;

export type FiTedMonthRow = {
  mes_key: string;
  mes_label: string;
  objetivos_cumplidos: number;
  objetivos_planteados: number;
  extras_ticket: number;
  extras_requerimiento: number;
  meta: number;
  cumplimiento: number | null;
  observaciones: string;
};

export type FiTedReportScope =
  | { kind: "sig"; label: string }
  | { kind: "usuario"; usuario_id: number; label: string };

function filter_objetivos_for_scope(
  objetivos: PlanObjetivoCover[],
  scope: FiTedReportScope,
): PlanObjetivoCover[] {
  if (scope.kind === "sig") return objetivos;
  return objetivos.filter((o) =>
    o.responsables.some((r) => r.usuario_id === scope.usuario_id),
  );
}

function filter_plus_for_scope(
  plus: InformePlusItem[],
  scope: FiTedReportScope,
): InformePlusItem[] {
  if (scope.kind === "sig") return plus;
  return plus.filter((p) => p.asignado_ids.includes(scope.usuario_id));
}

function count_extras_ticket(plus: InformePlusItem[]): number {
  return plus.filter((p) => p.origen === "TICKET").length;
}

function count_extras_req(plus: InformePlusItem[]): number {
  return plus.filter((p) => REQ_ORIGINS.has(p.origen)).length;
}

function observacion_celda(
  mes: string,
  objetivos: PlanObjetivoCover[],
  plus: InformePlusItem[],
  analisis_texto: string | null | undefined,
): string {
  const has_activity = objetivos.length > 0 || plus.length > 0;
  if (!has_activity && is_prisma_ene_sep_month(mes)) {
    return PRISMA_ENE_SEP_OBSERVACION;
  }
  if (analisis_texto?.trim()) {
    const form = parse_analisis_texto(analisis_texto);
    if (form) return format_analisis_for_display(form);
  }
  if (!has_activity) {
    return "Sin objetivos ni extras registrados en este mes.";
  }
  const cumplidos = objetivos.filter(is_informe_objetivo_cumplido).length;
  return `Planteados ${objetivos.length}, cumplidos ${cumplidos}.`;
}

export function build_fi_ted_month_row(
  data: InformeMonth,
  scope: FiTedReportScope,
): FiTedMonthRow {
  const month = data.mes.slice(5, 7);
  const idx = MONTH_KEYS.indexOf(month as (typeof MONTH_KEYS)[number]);
  const objetivos = filter_objetivos_for_scope(data.objetivos, scope);
  const plus = filter_plus_for_scope(data.plus, scope);
  const cumplidos = objetivos.filter(is_informe_objetivo_cumplido).length;
  const planteados = objetivos.length;
  const cumplimiento =
    planteados === 0 ? null : Math.round((cumplidos / planteados) * 100) / 100;

  const observaciones = observacion_celda(
    data.mes,
    objetivos,
    plus,
    scope.kind === "sig" ? data.analisis_texto : null,
  );

  return {
    mes_key: data.mes,
    mes_label: MONTH_LABELS_ES[idx >= 0 ? idx : 0],
    objetivos_cumplidos: cumplidos,
    objetivos_planteados: planteados,
    extras_ticket: count_extras_ticket(plus),
    extras_requerimiento: count_extras_req(plus),
    meta: FI_TED_META,
    cumplimiento,
    observaciones,
  };
}

export function build_fi_ted_year_rows(
  months: InformeMonth[],
  scope: FiTedReportScope,
  anio: number,
): FiTedMonthRow[] {
  const by_mes = new Map(months.map((m) => [m.mes, m]));
  return MONTH_KEYS.map((mm, idx) => {
    const key = `${anio}-${mm}`;
    const data = by_mes.get(key);
    if (!data) {
      return {
        mes_key: key,
        mes_label: MONTH_LABELS_ES[idx],
        objetivos_cumplidos: 0,
        objetivos_planteados: 0,
        extras_ticket: 0,
        extras_requerimiento: 0,
        meta: FI_TED_META,
        cumplimiento: null,
        observaciones: observacion_celda(key, [], [], null),
      };
    }
    return build_fi_ted_month_row(data, scope);
  });
}

export function scopes_for_kpi_usuarios(
  usuarios: PlanUsuarioOption[],
  months: InformeMonth[],
): FiTedReportScope[] {
  const with_data = usuarios.filter((u) =>
    months.some((m) => {
      const objs = m.objetivos.some((o) =>
        o.responsables.some((r) => r.usuario_id === u.id),
      );
      const plus = m.plus.some((p) => p.asignado_ids.includes(u.id));
      return objs || plus;
    }),
  );
  const list = with_data.length > 0 ? with_data : usuarios;
  return list.map((u) => ({
    kind: "usuario" as const,
    usuario_id: u.id,
    label: u.label,
  }));
}

export function year_from_mes(mes: string): number {
  return Number(mes.slice(0, 4));
}
