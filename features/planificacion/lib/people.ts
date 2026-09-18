import type { PlanModulo, PlanParticipante, PlanTarea } from "./types";
import { is_tarea_no_solicitada, tarea_avance } from "./task-progress";

export function unique_people(list: PlanParticipante[]): PlanParticipante[] {
  const seen = new Map<number, PlanParticipante>();
  for (const person of list) {
    if (!seen.has(person.usuario_id)) seen.set(person.usuario_id, person);
  }
  return [...seen.values()];
}

export function people_on_tarea(tarea: PlanTarea): PlanParticipante[] {
  const from_list = unique_people(tarea.asignados ?? []);
  if (from_list.length) return from_list;
  return tarea.asignado ? [tarea.asignado] : [];
}

export function people_on_modulo(modulo: PlanModulo): PlanParticipante[] {
  return unique_people([
    ...modulo.participantes,
    ...modulo.tareas.flatMap(people_on_tarea),
  ]);
}

export function people_on_modulos(modulos: PlanModulo[]): PlanParticipante[] {
  return unique_people(modulos.flatMap(people_on_modulo));
}

export function top_contributor_on_modulos(
  modulos: PlanModulo[],
): PlanParticipante | null {
  const scores = new Map<
    number,
    { person: PlanParticipante; avance: number; tasks: number }
  >();
  for (const modulo of modulos) {
    for (const tarea of modulo.tareas) {
      if (is_tarea_no_solicitada(tarea)) continue;
      const avance = tarea_avance(tarea);
      for (const person of people_on_tarea(tarea)) {
        const prev = scores.get(person.usuario_id);
        if (prev) {
          prev.avance += avance;
          prev.tasks += 1;
        } else {
          scores.set(person.usuario_id, {
            person,
            avance,
            tasks: 1,
          });
        }
      }
    }
  }
  let best: { person: PlanParticipante; avance: number; tasks: number } | null =
    null;
  for (const row of scores.values()) {
    if (
      !best ||
      row.avance > best.avance ||
      (row.avance === best.avance && row.tasks > best.tasks)
    ) {
      best = row;
    }
  }
  return best?.person ?? null;
}

export function given_name(nombre: string): string {
  return nombre.trim().split(/\s+/).filter(Boolean)[0] ?? nombre;
}
