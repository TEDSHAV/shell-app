"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, LayoutList, Search } from "lucide-react";
import type {
  PlanApp,
  PlanModulo,
  PlanOrigen,
  PlanTarea,
  PlanTrimestre,
  PlanUsuarioOption,
} from "../lib/types";
import { PLAN_ORIGENES, PLAN_TRIMESTRES } from "../schemas";
import {
  filter_flat_plan_tasks,
  flatten_plan_tasks,
  type FlatPlanTask,
} from "../lib/flatten-plan-tasks";
import { cn } from "@/lib/utils";
import { PlanKanban } from "./plan-kanban";
import { PlanTaskList } from "./plan-task-list";
import { TareaFormDialog } from "./tarea-form-dialog";

export function PlanTareasWorkspace({
  apps,
  usuarios,
}: {
  apps: PlanApp[];
  usuarios: PlanUsuarioOption[];
}) {
  const router = useRouter();
  const [view, set_view] = useState<"lista" | "kanban">("kanban");
  const [search, set_search] = useState("");
  const [origen, set_origen] = useState<PlanOrigen | "Todos">("Todos");
  const [trimestre, set_trimestre] = useState<PlanTrimestre | "Todos">("Todos");
  const [editing, set_editing] = useState<FlatPlanTask | null>(null);

  const all_modulos = useMemo(() => {
    const seen = new Set<number>();
    const out: PlanModulo[] = [];
    for (const app of apps) {
      for (const modulo of app.modulos) {
        if (seen.has(modulo.id)) continue;
        seen.add(modulo.id);
        out.push(modulo);
      }
    }
    return out;
  }, [apps]);

  const items = useMemo(() => {
    return filter_flat_plan_tasks(flatten_plan_tasks(apps), {
      search,
      origen,
      trimestre,
    });
  }, [apps, search, origen, trimestre]);

  const origin_counts = useMemo(() => {
    const all = flatten_plan_tasks(apps);
    const counts = new Map<PlanOrigen | "Todos", number>();
    counts.set("Todos", all.length);
    for (const origin of PLAN_ORIGENES) {
      counts.set(
        origin,
        all.filter((item) => item.tarea.origen === origin).length,
      );
    }
    return counts;
  }, [apps]);

  function open_item(item: FlatPlanTask) {
    set_editing(item);
  }

  const editing_tarea: PlanTarea | null = editing?.tarea ?? null;
  const editing_app_id =
    all_modulos.find((modulo) => modulo.id === editing_tarea?.modulo_id)
      ?.app_id ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tareas
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Tablero de trabajo TED
          </p>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => set_view("lista")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
              view === "lista"
                ? "bg-slate-900 text-white"
                : "text-slate-400 hover:text-slate-700",
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => set_view("kanban")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
              view === "kanban"
                ? "bg-slate-900 text-white"
                : "text-slate-400 hover:text-slate-700",
            )}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Kanban
          </button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => set_origen("Todos")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            origen === "Todos"
              ? "bg-violet-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200",
          )}
        >
          Todas ({origin_counts.get("Todos") ?? 0})
        </button>
        {PLAN_ORIGENES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => set_origen(item)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              origen === item
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            {item} ({origin_counts.get(item) ?? 0})
          </button>
        ))}
        <div className="relative ml-auto min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => set_search(event.target.value)}
            placeholder="Buscar tareas"
            className="h-9 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={trimestre}
          onChange={(event) =>
            set_trimestre(event.target.value as PlanTrimestre | "Todos")
          }
          className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"
        >
          <option value="Todos">Todos los trimestres</option>
          {PLAN_TRIMESTRES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {view === "kanban" ? (
        <PlanKanban items={items} on_open={open_item} />
      ) : (
        <PlanTaskList items={items} on_open={open_item} />
      )}

      {editing_tarea ? (
        <TareaFormDialog
          key={editing_tarea.id}
          open
          apps={apps}
          all_modulos={all_modulos}
          preset_app_id={editing_app_id}
          preset_modulo_id={editing_tarea.modulo_id}
          tarea={editing_tarea}
          usuarios={usuarios}
          onClose={() => set_editing(null)}
          onSaved={() => {
            set_editing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
