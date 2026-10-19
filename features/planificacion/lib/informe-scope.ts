import type { InformeMonth, InformePlusItem } from "./informe-types";
import type { PlanObjetivoCover, PlanParticipante } from "./types";
import { given_name, unique_people } from "./people";

export type InformeTabId = "general" | number;

export type InformeTab = {
  id: InformeTabId;
  label: string;
};

/** Responsables únicos del mes (objetivos + plus), ordenados por nombre. */
export function informe_responsables(data: InformeMonth): PlanParticipante[] {
  const from_objetivos = data.objetivos.flatMap((o) => o.responsables);
  const from_plus: PlanParticipante[] = [];
  for (const item of data.plus) {
    for (const tarea of item.tarea ? [item.tarea] : []) {
      for (const person of tarea.asignados ?? []) {
        from_plus.push(person);
      }
      if (tarea.asignado) from_plus.push(tarea.asignado);
    }
  }
  return unique_people([...from_objetivos, ...from_plus]).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}

export function informe_tabs(data: InformeMonth): InformeTab[] {
  return [
    { id: "general", label: "General" },
    ...informe_responsables(data).map((person) => ({
      id: person.usuario_id as InformeTabId,
      label: given_name(person.nombre),
    })),
  ];
}

export function filter_informe_objetivos(
  objetivos: PlanObjetivoCover[],
  tab: InformeTabId,
): PlanObjetivoCover[] {
  if (tab === "general") return objetivos;
  return objetivos.filter((o) =>
    o.responsables.some((r) => r.usuario_id === tab),
  );
}

export function filter_informe_plus(
  plus: InformePlusItem[],
  tab: InformeTabId,
): InformePlusItem[] {
  if (tab === "general") return plus;
  return plus.filter((p) => p.asignado_ids.includes(tab));
}

export function compromiso_pct_from(objetivos: PlanObjetivoCover[]): number {
  if (objetivos.length === 0) return 0;
  return Math.round(
    objetivos.reduce((sum, item) => sum + item.avance, 0) / objetivos.length,
  );
}
