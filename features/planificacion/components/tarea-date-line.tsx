import { format_objetivo_date } from "../lib/display";
import type { PlanTarea } from "../lib/types";

export function TareaDateLine({ tarea }: { tarea: PlanTarea }) {
  const created = format_objetivo_date(tarea.created_at);
  const start = format_objetivo_date(tarea.fecha_inicio);
  const end = format_objetivo_date(tarea.fecha_fin);
  if (!created && !start && !end) return null;
  const plan =
    start || end
      ? `Plan ${start || "—"}${end && end !== start ? ` → ${end}` : ""}`
      : null;
  return (
    <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
      {created ? `Creada ${created}` : null}
      {created && plan ? " · " : null}
      {plan}
    </p>
  );
}
