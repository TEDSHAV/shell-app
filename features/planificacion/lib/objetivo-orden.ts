import type { PlanObjetivo, PlanUsuarioOption } from "./types";

export type OrdenScope = "todos" | "none" | number;

export function parse_orden_scope(raw: string): OrdenScope {
  if (raw === "todos" || raw === "none") return raw;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : "todos";
}

export function orden_scope_key(scope: OrdenScope): string {
  return String(scope);
}

export function objetivo_numero(
  objetivo: PlanObjetivo,
  scope: OrdenScope,
): number {
  if (typeof scope === "number") {
    const found = objetivo.responsables.find(
      (person) => person.usuario_id === scope,
    );
    return found?.orden && found.orden > 0 ? found.orden : objetivo.orden;
  }
  return objetivo.orden;
}

export function objetivos_en_scope<T extends PlanObjetivo>(
  objetivos: T[],
  scope: OrdenScope,
): T[] {
  if (scope === "todos") {
    return [...objetivos].sort((a, b) => a.orden - b.orden || a.id - b.id);
  }
  if (scope === "none") {
    return objetivos
      .filter((item) => item.responsables.length === 0)
      .sort((a, b) => a.orden - b.orden || a.id - b.id);
  }
  return objetivos
    .filter((item) =>
      item.responsables.some((person) => person.usuario_id === scope),
    )
    .sort(
      (a, b) =>
        objetivo_numero(a, scope) - objetivo_numero(b, scope) || a.id - b.id,
    );
}

export function orden_scopes(
  objetivos: PlanObjetivo[],
  equipo: PlanUsuarioOption[],
): Array<{ id: string; label: string }> {
  const assigned = new Set<number>();
  for (const objetivo of objetivos) {
    for (const person of objetivo.responsables) {
      assigned.add(person.usuario_id);
    }
  }
  const people = equipo.filter((user) => assigned.has(user.id));
  const scopes: Array<{ id: string; label: string }> = [
    { id: "todos", label: "Todos" },
    ...people.map((user) => ({ id: String(user.id), label: user.label })),
  ];
  if (objetivos.some((item) => item.responsables.length === 0)) {
    scopes.push({ id: "none", label: "Sin asignar" });
  }
  return scopes;
}
