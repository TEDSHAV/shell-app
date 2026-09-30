"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { commit_plan_objetivos } from "../actions/commit-plan-actions";
import type { PlanObjetivo } from "../lib/types";
import {
  draft_from_objetivo,
  draft_is_blank,
  empty_objetivo_draft,
  originals_fingerprint,
  plan_drafts_fingerprint,
  type ObjetivoDraft,
} from "../lib/objetivo-draft";

export function use_plan_editor(objetivos: PlanObjetivo[], mes: string) {
  const router = useRouter();
  const [editing, set_editing] = useState(false);
  const [drafts, set_drafts] = useState<ObjetivoDraft[]>([]);
  const [baseline, set_baseline] = useState("");
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    if (editing) return;
    set_drafts(objetivos.map(draft_from_objetivo));
  }, [objetivos, editing]);

  const dirty = useMemo(() => {
    if (!editing) return false;
    return plan_drafts_fingerprint(drafts) !== baseline;
  }, [baseline, drafts, editing]);

  function start() {
    const next = objetivos.map(draft_from_objetivo);
    set_drafts(next);
    set_baseline(originals_fingerprint(objetivos));
    set_error(null);
    set_editing(true);
  }

  function cancel() {
    set_drafts(objetivos.map(draft_from_objetivo));
    set_error(null);
    set_editing(false);
  }

  function patch(key: string, patch_value: Partial<ObjetivoDraft>) {
    set_drafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...patch_value } : draft,
      ),
    );
  }

  function add() {
    set_drafts((current) => [...current, empty_objetivo_draft()]);
  }

  function remove(key: string) {
    set_drafts((current) => current.filter((draft) => draft.key !== key));
  }

  async function commit(): Promise<boolean> {
    if (!dirty || busy) return false;
    const items = drafts.filter((draft) => !draft_is_blank(draft));
    const empty_named = items.find((draft) => draft.titulo.trim() === "");
    if (empty_named) {
      set_error("Cada objetivo debe tener título.");
      return false;
    }
    const original_ids = new Set(objetivos.map((item) => item.id));
    const kept_ids = new Set(
      items.map((item) => item.id).filter((id): id is number => Boolean(id)),
    );
    const deleted_ids = [...original_ids].filter((id) => !kept_ids.has(id));
    set_busy(true);
    set_error(null);
    const result = await commit_plan_objetivos({
      mes,
      deleted_ids,
      items: items.map((item) => ({
        id: item.id ?? undefined,
        titulo: item.titulo,
        descripcion: item.descripcion || null,
        mes,
        app_ids: item.app_ids,
        estado: item.estado,
        solicitado_por: item.solicitado_por,
      })),
    });
    set_busy(false);
    if (!result.ok) {
      set_error(result.error);
      return false;
    }
    set_editing(false);
    router.refresh();
    return true;
  }

  return {
    editing,
    drafts,
    dirty,
    busy,
    error,
    start,
    cancel,
    patch,
    add,
    remove,
    commit,
  };
}
