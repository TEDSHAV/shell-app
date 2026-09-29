import { is_plan_mes_emitido, type PlanMes } from "../lib/plan-mes";

export function PlanMesBadge({ plan }: { plan: PlanMes }) {
  const emitido = is_plan_mes_emitido(plan);
  return (
    <span
      className={
        emitido
          ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
          : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
      }
    >
      {emitido ? `Emitido v${plan.version}` : "Borrador"}
    </span>
  );
}
