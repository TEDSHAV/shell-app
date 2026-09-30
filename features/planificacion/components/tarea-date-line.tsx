import { format_objetivo_date } from "../lib/display";
import { format_business_days } from "../lib/task-dates";
import type { PlanTarea } from "../lib/types";

export function TareaDateLine({ tarea }: { tarea: PlanTarea }) {
  const start = format_objetivo_date(tarea.fecha_inicio);
  const end = format_objetivo_date(tarea.fecha_fin);
  const work = format_business_days(tarea.fecha_inicio, tarea.fecha_fin);
  if (!start && !end) return null;
  const same_day = Boolean(start && end && start === end);
  const range = same_day || !end ? start || end : `${start} – ${end}`;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {range ? (
        <span className="text-[11px] text-slate-500">{range}</span>
      ) : null}
      {work ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {work}
        </span>
      ) : null}
    </div>
  );
}
