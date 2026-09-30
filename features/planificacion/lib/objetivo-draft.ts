import type { PlanObjetivo, PlanObjetivoEstado } from "./types";

export type ObjetivoDraft = {
  key: string;
  id: number | null;
  titulo: string;
  descripcion: string;
  app_ids: number[];
  estado: PlanObjetivoEstado;
  solicitado_por: number | null;
};

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
  };
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
  });
}

export function plan_drafts_fingerprint(drafts: ObjetivoDraft[]): string {
  return drafts
    .filter((draft) => !draft_is_blank(draft))
    .map(draft_fingerprint)
    .sort()
    .join("|");
}

export function originals_fingerprint(objetivos: PlanObjetivo[]): string {
  return plan_drafts_fingerprint(objetivos.map(draft_from_objetivo));
}
