import type { PlanObjetivoEstado } from "./types";

/** Meses ene–sep: remiten a la foto Prisma del plan anual. */
export const PRISMA_ENE_SEP_OBSERVACION =
  "Las actividades de este periodo pueden observarse en la planificación de enero a septiembre de Prisma (foto pública del plan).";

export function is_informe_objetivo_cumplido(objetivo: {
  estado: PlanObjetivoEstado;
  avance: number;
}): boolean {
  return objetivo.estado === "cumplido" || objetivo.avance >= 100;
}

export function is_prisma_ene_sep_month(mes: string): boolean {
  const m = Number(mes.slice(5, 7));
  return m >= 1 && m <= 9;
}
