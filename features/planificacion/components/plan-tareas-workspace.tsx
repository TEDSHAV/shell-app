"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, LayoutList, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  PlanApp,
  PlanModulo,
  PlanOrigen,
  PlanTarea,
  PlanTrimestre,
  PlanUsuarioOption,
} from "../lib/types";
import { PLAN_ORIGENES, PLAN_TRIMESTRES } from "../schemas";
import { ORIGIN_LABELS } from "../lib/display";
import { TedPersonPicker } from "./ted-person-picker";
import { TedOriginPicker } from "./ted-origin-picker";
import { FilterExpand } from "./filter-expand";
import {
  filter_flat_plan_tasks,
  flatten_plan_tasks,
  type FlatPlanTask,
} from "../lib/flatten-plan-tasks";
import { cn } from "@/lib/utils";
import { PlanKanban } from "./plan-kanban";
import { PlanTaskList } from "./plan-task-list";
import { TareaFormDialog } from "./tarea-form-dialog";
import { TimeFilterControl } from "@/components/time-filter-control";
import { SortControl } from "@/components/sort-control";
import {
  DEFAULT_TIME_FILTER,
  type DateField,
  type SortDir,
  type TimeFilterValue,
} from "@/lib/list-time-period";

const select_class =
  "h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm";

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
  const [asignado, set_asignado] = useState<"Todos" | "none" | number>("Todos");
  const [trimestre, set_trimestre] = useState<PlanTrimestre | "Todos">("Todos");
  const [creating, set_creating] = useState(false);
  const [editing, set_editing] = useState<FlatPlanTask | null>(null);
  const [open_filter, set_open_filter] = useState<null | "origen" | "people">(
    null,
  );
  const [time, set_time] = useState<TimeFilterValue>(DEFAULT_TIME_FILTER);
  const [date_field, set_date_field] = useState<DateField>("updated");
  const [sort_dir, set_sort_dir] = useState<SortDir>("desc");

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

  const all_flat = useMemo(() => flatten_plan_tasks(apps), [apps]);

  const items = useMemo(() => {
    return filter_flat_plan_tasks(all_flat, {
      search,
      origen,
      trimestre,
      asignado,
      time,
      date_field,
      sort_dir,
    });
  }, [all_flat, search, origen, trimestre, asignado, time, date_field, sort_dir]);

  const origin_counts = useMemo(() => {
    const counts = new Map<PlanOrigen | "Todos", number>();
    counts.set("Todos", all_flat.length);
    for (const origin of PLAN_ORIGENES) {
      counts.set(
        origin,
        all_flat.filter((item) => item.tarea.origen === origin).length,
      );
    }
    return counts;
  }, [all_flat]);

  const visible_origens = PLAN_ORIGENES.filter(
    (item) => item !== "GERENCIA" || (origin_counts.get(item) ?? 0) > 0,
  );

  function open_item(item: FlatPlanTask) {
    set_creating(false);
    set_editing(item);
  }

  function open_create() {
    set_editing(null);
    set_creating(true);
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => set_view("lista")}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-300 ease-out",
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
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all duration-300 ease-out",
                view === "kanban"
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:text-slate-700",
              )}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>
          <Button
            type="button"
            className="h-8 rounded-full bg-slate-900 px-3 text-xs text-white hover:bg-slate-800"
            onClick={open_create}
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva tarea
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => set_search(event.target.value)}
              placeholder="Buscar"
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              set_open_filter((value) => (value === "origen" ? null : "origen"))
            }
            className={cn(
              "h-8 rounded-lg px-2.5 text-xs font-medium shadow-sm transition-all duration-300 ease-out",
              open_filter === "origen" || origen !== "Todos"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600",
            )}
          >
            {origen === "Todos"
              ? `Origen · ${origin_counts.get("Todos") ?? 0}`
              : `${ORIGIN_LABELS[origen]} · ${origin_counts.get(origen) ?? 0}`}
          </button>
          <select
            value={trimestre}
            onChange={(event) =>
              set_trimestre(event.target.value as PlanTrimestre | "Todos")
            }
            className={cn(select_class, "transition-all duration-300 ease-out")}
          >
            <option value="Todos">Trimestre</option>
            {PLAN_TRIMESTRES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              set_open_filter((value) => (value === "people" ? null : "people"))
            }
            className={cn(
              "h-8 rounded-lg px-2.5 text-xs font-medium shadow-sm transition-all duration-300 ease-out",
              open_filter === "people" || asignado !== "Todos"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600",
            )}
          >
            Responsable
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <TimeFilterControl value={time} on_change={set_time} />
            <SortControl
              field={date_field}
              dir={sort_dir}
              on_field={set_date_field}
              on_dir={set_sort_dir}
            />
          </div>
        </div>
        <FilterExpand open={open_filter === "origen"}>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <TedOriginPicker
              origins={visible_origens}
              counts={origin_counts}
              value={origen}
              on_change={set_origen}
            />
          </div>
        </FilterExpand>
        <FilterExpand open={open_filter === "people"}>
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <TedPersonPicker
              usuarios={usuarios}
              value={
                asignado === "Todos"
                  ? null
                  : asignado === "none"
                    ? "none"
                    : asignado
              }
              on_change={(next) => {
                if (next === null) set_asignado("Todos");
                else set_asignado(next === "none" ? "none" : next);
              }}
              allow_none
              none_label="Sin asignar"
            />
          </div>
        </FilterExpand>
      </div>

      {view === "kanban" ? (
        <PlanKanban items={items} on_open={open_item} />
      ) : (
        <PlanTaskList items={items} on_open={open_item} />
      )}

      {creating ? (
        <TareaFormDialog
          open
          apps={apps}
          all_modulos={all_modulos}
          preset_app_id={apps[0]?.id ?? null}
          preset_modulo_id={null}
          tarea={null}
          usuarios={usuarios}
          onClose={() => set_creating(false)}
          onSaved={() => {
            set_creating(false);
            router.refresh();
          }}
        />
      ) : null}

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
