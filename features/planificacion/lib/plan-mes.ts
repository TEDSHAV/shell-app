export type PlanMesEstado = "borrador" | "emitido";

export type PlanMesCambioKind = "anadido" | "quitado" | "editado" | "lote";

export type PlanMes = {
  mes: string;
  estado: PlanMesEstado;
  version: number;
  emitido_at: string | null;
  emitido_por: number | null;
};

export type PlanObjetivoResumen = {
  id: number;
  titulo: string;
  descripcion: string | null;
  apps: string[];
  autor: string | null;
};

export function empty_plan_mes(mes: string): PlanMes {
  return {
    mes,
    estado: "borrador",
    version: 0,
    emitido_at: null,
    emitido_por: null,
  };
}

export function is_plan_mes_emitido(plan: PlanMes | null | undefined): boolean {
  return (plan?.estado ?? "borrador") === "emitido";
}
