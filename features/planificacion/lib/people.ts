import type { PlanModulo, PlanParticipante, PlanTarea } from "./types";

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

export function given_name(nombre: string): string {
  return nombre.trim().split(/\s+/).filter(Boolean)[0] ?? nombre;
}
