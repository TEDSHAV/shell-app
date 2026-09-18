"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanModal } from "./plan-modal";
import { OrigenBadge } from "./origen-badge";
import { search_tareas_para_vincular, vincular_tarea_objetivo } from "../actions/objetivo-actions";
import type { PlanOrigen } from "../lib/types";

type Hit = {
  id: number;
  titulo: string;
  origen: PlanOrigen;
  objetivo_id: number | null;
};

export function VincularTareaDialog({
  open,
  objetivo_id,
  onClose,
  onSaved,
}: {
  open: boolean;
  objetivo_id: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [query, set_query] = useState("");
  const [items, set_items] = useState<Hit[]>([]);
  const [error, set_error] = useState<string | null>(null);
  const [busy_id, set_busy_id] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      set_items([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await search_tareas_para_vincular(q, objetivo_id);
        if (!result.ok) {
          set_error(result.error);
          return;
        }
        set_error(null);
        set_items(result.items);
      })();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, objetivo_id, open]);

  return (
    <PlanModal
      open={open}
      title="Vincular tarea"
      subtitle="Busca en el inventario y cuélgala de este objetivo"
      onClose={onClose}
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <Input
        value={query}
        onChange={(event) => set_query(event.target.value)}
        placeholder="Escribe al menos 2 letras…"
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {item.titulo}
              </p>
              <div className="mt-1">
                <OrigenBadge origen={item.origen} />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={busy_id === item.id}
              className="shrink-0 bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => {
                void (async () => {
                  set_busy_id(item.id);
                  const result = await vincular_tarea_objetivo(
                    item.id,
                    objetivo_id,
                  );
                  set_busy_id(null);
                  if (!result.ok) {
                    set_error(result.error);
                    return;
                  }
                  onSaved();
                  onClose();
                })();
              }}
            >
              Colgar
            </Button>
          </li>
        ))}
      </ul>
      {query.trim().length >= 2 && items.length === 0 && !error ? (
        <p className="mt-4 text-sm text-slate-400">Sin coincidencias.</p>
      ) : null}
    </PlanModal>
  );
}
