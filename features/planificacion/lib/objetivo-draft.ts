import type { PlanObjetivo, PlanObjetivoEstado } from "./types";

export type ObjetivoDraft = {
  key: string;
  id: number | null;
  titulo: string;
  descripcion: string;
  app_ids: number[];
  estado: PlanObjetivoEstado;
  solicitado_por: number | null;
  responsable_ids: number[];
};

export type UserOrderMap = Record<number, string[]>;

function sorted_ids(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

export function draft_from_objetivo(objetivo: PlanObjetivo): ObjetivoDraft {
  return {
    key: `id:${objetivo.id}`,
    id: objetivo.id,
    titulo: objetivo.titulo,
    descripcion: objetivo.descripcion ?? "",
    app_ids: [...objetivo.app_ids],
    estado: objetivo.estado,
    solicitado_por: objetivo.solicitado_por?.usuario_id ?? null,
    responsable_ids: objetivo.responsables.map((person) => person.usuario_id),
  };
}

export function user_orders_from_objetivos(
  objetivos: PlanObjetivo[],
): UserOrderMap {
  const buckets = new Map<number, Array<{ key: string; orden: number }>>();
  for (const objetivo of objetivos) {
    for (const person of objetivo.responsables) {
      const list = buckets.get(person.usuario_id) ?? [];
      list.push({
        key: `id:${objetivo.id}`,
        orden: person.orden && person.orden > 0 ? person.orden : objetivo.orden,
      });
      buckets.set(person.usuario_id, list);
    }
  }
  const out: UserOrderMap = {};
  for (const [usuario_id, list] of buckets) {
    out[usuario_id] = list
      .sort((a, b) => a.orden - b.orden || a.key.localeCompare(b.key))
      .map((item) => item.key);
  }
  return out;
}

export function sync_user_orders(
  orders: UserOrderMap,
  key: string,
  prev_ids: number[],
  next_ids: number[],
): UserOrderMap {
  const next: UserOrderMap = { ...orders };
  for (const id of prev_ids) {
    if (next_ids.includes(id)) continue;
    next[id] = (next[id] ?? []).filter((item) => item !== key);
    if (next[id].length === 0) delete next[id];
  }
  for (const id of next_ids) {
    if (prev_ids.includes(id)) continue;
    const list = next[id] ?? [];
    if (!list.includes(key)) next[id] = [...list, key];
  }
  return next;
}

export function user_orders_fingerprint(orders: UserOrderMap): string {
  return Object.keys(orders)
    .map(Number)
    .sort((a, b) => a - b)
    .map((id) => `${id}:${(orders[id] ?? []).join(",")}`)
    .join("|");
}

export function empty_objetivo_draft(): ObjetivoDraft {
  return {
    key: `new:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    titulo: "",
    descripcion: "",
    app_ids: [],
    estado: "abierto",
    solicitado_por: null,
    responsable_ids: [],
  };
}

export function draft_is_blank(draft: ObjetivoDraft): boolean {
  if (draft.id) return false;
  return (
    draft.titulo.trim() === "" &&
    draft.descripcion.trim() === "" &&
    draft.app_ids.length === 0
  );
}

export function draft_fingerprint(draft: ObjetivoDraft): string {
  return JSON.stringify({
    id: draft.id,
    titulo: draft.titulo.trim(),
    descripcion: draft.descripcion.trim(),
    app_ids: sorted_ids(draft.app_ids),
    estado: draft.estado,
    solicitado_por: draft.solicitado_por,
    responsable_ids: sorted_ids(draft.responsable_ids),
  });
}

export function plan_drafts_fingerprint(drafts: ObjetivoDraft[]): string {
  return drafts
    .filter((draft) => !draft_is_blank(draft))
    .map(draft_fingerprint)
    .join("|");
}

export function move_drafts<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function move_subset<T>(
  list: T[],
  is_member: (item: T) => boolean,
  from: number,
  to: number,
): T[] {
  const members = list.filter(is_member);
  const reordered = move_drafts(members, from, to);
  if (reordered === members) return list;
  let index = 0;
  return list.map((item) => (is_member(item) ? reordered[index++] : item));
}

export function originals_fingerprint(objetivos: PlanObjetivo[]): string {
  return [
    plan_drafts_fingerprint(objetivos.map(draft_from_objetivo)),
    user_orders_fingerprint(user_orders_from_objetivos(objetivos)),
  ].join("||");
}
