import type { PlanMes } from "./plan-mes";
import type { PlanObjetivoCover, PlanOrigen, PlanTarea } from "./types";

export type InformePlusItem = {
  id: number;
  titulo: string;
  origen: PlanOrigen;
  avance: number;
  app_nombre: string;
  modulo_nombre: string;
  asignado_ids: number[];
  /** Detalle completo para vista gerencia (opcional en fotos antiguas). */
  tarea?: PlanTarea;
};

export type InformeMonth = {
  mes: string;
  plan_mes?: PlanMes;
  unpublished_hidden?: boolean;
  compromiso_pct: number;
  plus_count: number;
  objetivos: PlanObjetivoCover[];
  plus: InformePlusItem[];
  analisis_texto: string | null;
};

export function as_informe_snapshot(value: unknown): InformeMonth | null {
  if (!value || typeof value !== "object") return null;
  const row = value as {
    kind?: string;
    mes?: string;
    objetivos?: unknown;
    plus?: unknown;
    analisis_texto?: unknown;
  };
  if (row.kind !== "informe") return null;
  if (
    typeof row.mes !== "string" ||
    !Array.isArray(row.objetivos) ||
    !Array.isArray(row.plus)
  ) {
    return null;
  }
  const data = value as InformeMonth;
  return {
    ...data,
    analisis_texto:
      typeof row.analisis_texto === "string" ? row.analisis_texto : null,
    plus: data.plus.map((item) => ({
      ...item,
      asignado_ids: Array.isArray(item.asignado_ids) ? item.asignado_ids : [],
    })),
  };
}
