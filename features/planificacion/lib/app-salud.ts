import type { PlanModulo, PlanSalud } from "./types";

export function derive_app_salud(modulos: PlanModulo[]): PlanSalud {
  if (modulos.length === 0) return "Planificado";
  if (modulos.some((m) => m.salud === "En Riesgo")) return "En Riesgo";
  if (modulos.every((m) => m.salud === "Completado")) return "Completado";
  if (modulos.every((m) => m.salud === "Planificado")) return "Planificado";
  return "En Marcha";
}

export function sum_app_progress(modulos: PlanModulo[]): {
  done_count: number;
  left_count: number;
  progress: number;
} {
  const done_count = modulos.reduce((sum, m) => sum + m.done_count, 0);
  const left_count = modulos.reduce((sum, m) => sum + m.left_count, 0);
  const total = done_count + left_count;
  const weighted = modulos.reduce((sum, m) => {
    const n = m.done_count + m.left_count;
    return sum + m.progress * n;
  }, 0);
  return {
    done_count,
    left_count,
    progress: total === 0 ? 0 : Math.round(weighted / total),
  };
}
