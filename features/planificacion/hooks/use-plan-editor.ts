"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { commit_plan_objetivos } from "../actions/commit-plan-actions";
import type { PlanObjetivo } from "../lib/types";
import type { OrdenScope } from "../lib/objetivo-orden";
import {
  draft_from_objetivo,
  draft_is_blank,
  empty_objetivo_draft,
  move_drafts,
  move_subset,
  originals_fingerprint,
  plan_drafts_fingerprint,
  sync_user_orders,
  user_orders_fingerprint,
  user_orders_from_objetivos,
  type ObjetivoDraft,
  type UserOrderMap,
} from "../lib/objetivo-draft";

export function usePlanEditor(objetivos: PlanObjetivo[], mes: string) {
  const router = useRouter();
  const [editing, set_editing] = useState(false);
  const [drafts, set_drafts] = useState<ObjetivoDraft[]>([]);
  const [user_orders, set_user_orders] = useState<UserOrderMap>({});
  const [baseline, set_baseline] = useState("");
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    if (editing) return;
    set_drafts(objetivos.map(draft_from_objetivo));
    set_user_orders(user_orders_from_objetivos(objetivos));
  }, [objetivos, editing]);

  const dirty = useMemo(() => {
    if (!editing) return false;
    const current = `${plan_drafts_fingerprint(drafts)}||${user_orders_fingerprint(user_orders)}`;
    return current !== baseline;
  }, [baseline, drafts, editing, user_orders]);

  function start() {
    const next =
      objetivos.length > 0
        ? objetivos.map(draft_from_objetivo)
        : [empty_objetivo_draft()];
    const orders = user_orders_from_objetivos(objetivos);
    set_drafts(next);
    set_user_orders(orders);
    set_baseline(originals_fingerprint(objetivos));
    set_error(null);
    set_editing(true);
  }

  function cancel() {
    set_drafts(objetivos.map(draft_from_objetivo));
    set_user_orders(user_orders_from_objetivos(objetivos));
    set_error(null);
    set_editing(false);
  }

  function patch(key: string, patch_value: Partial<ObjetivoDraft>) {
    set_drafts((current) => {
      const prev = current.find((draft) => draft.key === key);
      if (
        patch_value.responsable_ids &&
        prev &&
        JSON.stringify(prev.responsable_ids) !==
          JSON.stringify(patch_value.responsable_ids)
      ) {
        set_user_orders((orders) =>
          sync_user_orders(
            orders,
            key,
            prev.responsable_ids,
            patch_value.responsable_ids ?? [],
          ),
        );
      }
      return current.map((draft) =>
        draft.key === key ? { ...draft, ...patch_value } : draft,
      );
    });
  }

  function add() {
    set_drafts((current) => [...current, empty_objetivo_draft()]);
  }

  function remove(key: string) {
    set_drafts((current) => {
      const prev = current.find((draft) => draft.key === key);
      if (prev) {
        set_user_orders((orders) =>
          sync_user_orders(orders, key, prev.responsable_ids, []),
        );
      }
      return current.filter((draft) => draft.key !== key);
    });
  }

  function move(from: number, to: number) {
    set_drafts((current) => move_drafts(current, from, to));
  }

  function move_in_scope(scope: OrdenScope, from: number, to: number) {
    if (scope === "todos") {
      move(from, to);
      return;
    }
    if (scope === "none") {
      set_drafts((current) =>
        move_subset(
          current,
          (draft) => draft.responsable_ids.length === 0,
          from,
          to,
        ),
      );
      return;
    }
    set_user_orders((current) => ({
      ...current,
      [scope]: move_drafts(current[scope] ?? [], from, to),
    }));
  }

  function drafts_in_scope(scope: OrdenScope): ObjetivoDraft[] {
    if (scope === "todos") return drafts;
    if (scope === "none") {
      return drafts.filter((draft) => draft.responsable_ids.length === 0);
    }
    const keys = user_orders[scope] ?? [];
    const by_key = new Map(drafts.map((draft) => [draft.key, draft]));
    return keys
      .map((key) => by_key.get(key))
      .filter((draft): draft is ObjetivoDraft => Boolean(draft));
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
      user_orders: Object.entries(user_orders).map(([usuario_id, keys]) => ({
        usuario_id: Number(usuario_id),
        keys,
      })),
      items: items.map((item) => ({
        id: item.id ?? undefined,
        client_key: item.key,
        titulo: item.titulo,
        descripcion: item.descripcion || null,
        mes,
        app_ids: item.app_ids,
        estado: item.estado,
        solicitado_por: item.solicitado_por,
        responsable_ids: item.responsable_ids,
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
    user_orders,
    dirty,
    busy,
    error,
    start,
    cancel,
    patch,
    add,
    remove,
    move,
    move_in_scope,
    drafts_in_scope,
    commit,
  };
}
