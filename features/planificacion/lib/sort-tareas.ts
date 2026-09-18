import type { PlanOrigen, PlanTarea } from "./types";

export function sort_adicional_last<T extends { origen: PlanOrigen }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const extra_a = a.origen === "ADICIONAL" ? 1 : 0;
    const extra_b = b.origen === "ADICIONAL" ? 1 : 0;
    if (extra_a !== extra_b) return extra_a - extra_b;
    return 0;
  });
}

export function sort_flat_adicional_last<
  T extends { tarea: { origen: PlanOrigen } },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const extra_a = a.tarea.origen === "ADICIONAL" ? 1 : 0;
    const extra_b = b.tarea.origen === "ADICIONAL" ? 1 : 0;
    if (extra_a !== extra_b) return extra_a - extra_b;
    return 0;
  });
}

export function sort_tareas_adicional_last(tareas: PlanTarea[]): PlanTarea[] {
  return sort_adicional_last(tareas);
}

export function is_general_modulo_name(nombre: string): boolean {
  return nombre.trim().toLowerCase() === "general";
}

export function sort_modulos_general_first<T extends { nombre: string }>(
  modulos: T[],
): T[] {
  return [...modulos].sort((a, b) => {
    const ga = is_general_modulo_name(a.nombre) ? 0 : 1;
    const gb = is_general_modulo_name(b.nombre) ? 0 : 1;
    if (ga !== gb) return ga - gb;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}
