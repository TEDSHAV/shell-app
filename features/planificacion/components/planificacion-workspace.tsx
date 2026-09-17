"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutList, CalendarRange, UserPlus, Pencil } from "lucide-react";
import type {
  PlanApp,
  PlanHito,
  PlanModulo,
  PlanTarea,
  PlanTrimestre,
  PlanUsuarioOption,
} from "../lib/types";
import { current_ve_year, list_years, type GanttSpan } from "../lib/gantt";
import { filter_plan_apps, type PlanQuery } from "../lib/plan-filters";
import { PlanificacionAppRow } from "./planificacion-app-row";
import { PlanificacionUtilidadesGroup } from "./planificacion-utilidades-group";
import { AppFormDialog } from "./app-form-dialog";
import { ModuloFormDialog } from "./modulo-form-dialog";
import { TareaFormDialog } from "./tarea-form-dialog";
import { PlanToolbar } from "./plan-toolbar";
import { RoadmapGantt } from "./roadmap-gantt";
import { QuarterTasksSheet } from "./quarter-tasks-sheet";
import { HitoFormDialog } from "./hito-form-dialog";
import { AssignBar } from "./assign-bar";
import { place_plan_tarea_trimestre } from "../actions/tarea-actions";
import { tarea_ids_in_app } from "../lib/plan-selection";

export function PlanificacionWorkspace({
  apps,
  usuarios,
}: {
  apps: PlanApp[];
  usuarios: PlanUsuarioOption[];
}) {
  const router = useRouter();
  const years = useMemo(() => list_years(apps), [apps]);
  const [tab, set_tab] = useState<"lista" | "gantt">("lista");
  const [query, set_query] = useState<PlanQuery>({
    salud: "Todos",
    anio: current_ve_year(),
    search: "",
    origen: "Todos",
    trimestre: "Todos",
    sort: "home",
  });
  const [app_open, set_app_open] = useState(false);
  const [editing_app, set_editing_app] = useState<PlanApp | null>(null);
  const [modulo_open, set_modulo_open] = useState(false);
  const [preset_app_id, set_preset_app_id] = useState<number | null>(null);
  const [editing_modulo, set_editing_modulo] = useState<PlanModulo | null>(null);
  const [tarea_open, set_tarea_open] = useState(false);
  const [preset_modulo_id, set_preset_modulo_id] = useState<number | null>(null);
  const [editing_tarea, set_editing_tarea] = useState<PlanTarea | null>(null);
  const [sheet, set_sheet] = useState<{
    app: PlanApp;
    span: GanttSpan;
    segment: "done" | "pending";
  } | null>(null);
  const [hito_open, set_hito_open] = useState(false);
  const [hito_app, set_hito_app] = useState<PlanApp | null>(null);
  const [editing_hito, set_editing_hito] = useState<PlanHito | null>(null);
  const [hito_trimestre, set_hito_trimestre] = useState<PlanTrimestre>("T1");
  const [select_mode, set_select_mode] = useState(false);
  const [selected, set_selected] = useState<Set<number>>(() => new Set());
  const [roadmap_edit, set_roadmap_edit] = useState(false);
  const [place_error, set_place_error] = useState<string | null>(null);

  const filtered = useMemo(() => filter_plan_apps(apps, query), [apps, query]);
  const listed = filtered.filter((app) => app.section !== "utilidades");
  const utilidades = filtered.filter((app) => app.section === "utilidades");
  const empty = listed.length === 0 && utilidades.length === 0;
  const counts = useMemo(() => {
    const base = filter_plan_apps(apps, { ...query, salud: "Todos" });
    const map: Record<string, number> = { Todos: base.length };
    for (const app of base) {
      map[app.salud] = (map[app.salud] || 0) + 1;
    }
    return map;
  }, [apps, query]);

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

  function refresh() {
    router.refresh();
  }

  function open_edit_app(app: PlanApp) {
    set_editing_app(app);
    set_app_open(true);
  }
  function open_add_modulo(app: PlanApp) {
    set_preset_app_id(app.id);
    set_editing_modulo(null);
    set_modulo_open(true);
  }
  function open_edit_modulo(app: PlanApp, modulo: PlanModulo) {
    set_preset_app_id(app.id);
    set_editing_modulo(modulo);
    set_modulo_open(true);
  }
  function open_add_tarea(app: PlanApp, modulo: PlanModulo) {
    set_preset_app_id(app.id);
    set_preset_modulo_id(modulo.id);
    set_editing_tarea(null);
    set_tarea_open(true);
  }
  function open_edit_tarea(app: PlanApp, modulo: PlanModulo, tarea: PlanTarea) {
    set_preset_app_id(app.id);
    set_preset_modulo_id(modulo.id);
    set_editing_tarea(tarea);
    set_tarea_open(true);
  }

  function toggle_task(tarea_id: number) {
    set_selected((prev) => {
      const next = new Set(prev);
      if (next.has(tarea_id)) next.delete(tarea_id);
      else next.add(tarea_id);
      return next;
    });
  }

  function toggle_ids(ids: number[], on: boolean) {
    set_selected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function select_all_visible() {
    const ids = [...listed, ...utilidades].flatMap(tarea_ids_in_app);
    set_selected(new Set(ids));
    set_select_mode(true);
  }

  function clear_selection() {
    set_selected(new Set());
    set_select_mode(false);
  }

  async function on_place_tarea(tarea: PlanTarea, trimestre: PlanTrimestre) {
    set_place_error(null);
    const result = await place_plan_tarea_trimestre(tarea.id, trimestre);
    if (!result.ok) {
      set_place_error(result.error);
      return;
    }
    refresh();
  }

  const tab_btn =
    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
            Proyectos
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Gestiona y monitorea el progreso de PRISMA
          </p>
        </div>
        <div className="flex flex-1 justify-center">
          <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => set_tab("lista")}
              className={`${tab_btn} ${
                tab === "lista"
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Vista General
            </button>
            <button
              type="button"
              onClick={() => set_tab("gantt")}
              className={`${tab_btn} ${
                tab === "gantt"
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Roadmap Temporal
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              set_select_mode(true);
              set_tab("lista");
            }}
            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
              select_mode
                ? "border-slate-800 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Asignar
          </button>
          <Link
            href="/ted/planificacion/importar"
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Cargar Excel
          </Link>
          <button
            type="button"
            onClick={() => {
              set_editing_app(null);
              set_app_open(true);
            }}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            + Nueva app
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: "Total módulos",
            value: listed.reduce((sum, app) => sum + app.modulo_count, 0),
            color: "text-slate-800",
          },
          {
            label: "Completados",
            value: counts.Completado ?? 0,
            color: "text-blue-600",
          },
          {
            label: "En Marcha",
            value: counts["En Marcha"] ?? 0,
            color: "text-emerald-600",
          },
          {
            label: "En Riesgo",
            value: counts["En Riesgo"] ?? 0,
            color: "text-orange-500",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <span className="text-sm text-slate-500">{card.label}</span>
            <span className={`text-2xl font-semibold tabular-nums ${card.color}`}>
              {card.value}
            </span>
          </div>
        ))}
      </div>

      <PlanToolbar
        query={query}
        years={years}
        counts={counts}
        on_change={(next) => set_query((prev) => ({ ...prev, ...next }))}
      />

      {select_mode ? (
        <AssignBar
          selected_ids={[...selected]}
          usuarios={usuarios}
          on_select_all={select_all_visible}
          on_clear={clear_selection}
          on_done={() => {
            clear_selection();
            refresh();
          }}
        />
      ) : null}

      {tab === "lista" ? (
        <div className="space-y-2">
          {empty ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-400">
              No hay aplicaciones en este filtro.
            </div>
          ) : (
            <>
              {listed.map((app) => (
                <PlanificacionAppRow
                  key={app.id}
                  app={app}
                  select_mode={select_mode}
                  selected={selected}
                  on_toggle_task={toggle_task}
                  on_toggle_ids={toggle_ids}
                  on_edit_app={() => open_edit_app(app)}
                  on_add_modulo={() => open_add_modulo(app)}
                  on_edit_modulo={(modulo) => open_edit_modulo(app, modulo)}
                  on_add_tarea={(modulo) => open_add_tarea(app, modulo)}
                  on_edit_tarea={(modulo, tarea) =>
                    open_edit_tarea(app, modulo, tarea)
                  }
                />
              ))}
              {utilidades.length > 0 ? (
                <PlanificacionUtilidadesGroup
                  apps={utilidades}
                  select_mode={select_mode}
                  selected={selected}
                  on_toggle_task={toggle_task}
                  on_toggle_ids={toggle_ids}
                  on_edit_app={open_edit_app}
                  on_add_modulo={open_add_modulo}
                  on_edit_modulo={open_edit_modulo}
                  on_add_tarea={open_add_tarea}
                  on_edit_tarea={open_edit_tarea}
                />
              ) : null}
            </>
          )}
        </div>
      ) : tab === "gantt" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              {roadmap_edit
                ? "Arrastra cada tarea a un trimestre. La vista normal solo muestra lo ya colocado."
                : "Barras de lo ya programado. Entra a editar para colocar tareas sin fecha."}
            </p>
            <button
              type="button"
              onClick={() => {
                set_place_error(null);
                set_roadmap_edit((value) => !value);
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm ${
                roadmap_edit
                  ? "border-violet-300 bg-violet-50 text-violet-800"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Pencil className="h-4 w-4" />
              {roadmap_edit ? "Listo" : "Editar roadmap"}
            </button>
          </div>
          {place_error ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {place_error}
            </p>
          ) : null}
          <RoadmapGantt
          listed={listed}
          utilidades={utilidades}
          anio={query.anio}
          edit_mode={roadmap_edit}
          on_bar_click={(app, span, segment) =>
            set_sheet({ app, span, segment })
          }
          on_add_hito={(app, trimestre) => {
            set_hito_app(app);
            set_editing_hito(null);
            set_hito_trimestre(trimestre);
            set_hito_open(true);
          }}
          on_edit_hito={(hito) => {
            const owner =
              apps.find((item) => item.id === hito.app_id) ?? null;
            set_hito_app(owner);
            set_editing_hito(hito);
            set_hito_trimestre(hito.trimestre);
            set_hito_open(true);
          }}
          on_place_tarea={(tarea, trimestre) => {
            void on_place_tarea(tarea, trimestre);
          }}
        />
        </div>
      ) : null}

      {app_open ? (
        <AppFormDialog
          key={editing_app?.id ?? "new-app"}
          open
          app={editing_app}
          onClose={() => set_app_open(false)}
          onSaved={refresh}
        />
      ) : null}
      {modulo_open && preset_app_id ? (
        <ModuloFormDialog
          key={editing_modulo?.id ?? `new-mod-${preset_app_id}`}
          open
          app_id={preset_app_id}
          apps={apps.filter((app) => app.id > 0)}
          modulo={editing_modulo}
          usuarios={usuarios}
          onClose={() => set_modulo_open(false)}
          onSaved={refresh}
        />
      ) : null}
      {tarea_open ? (
        <TareaFormDialog
          key={editing_tarea?.id ?? `new-tar-${preset_modulo_id}`}
          open
          apps={apps}
          all_modulos={all_modulos}
          preset_app_id={preset_app_id}
          preset_modulo_id={preset_modulo_id}
          tarea={editing_tarea}
          usuarios={usuarios}
          onClose={() => set_tarea_open(false)}
          onSaved={refresh}
        />
      ) : null}
      <QuarterTasksSheet
        open={Boolean(sheet)}
        app={sheet?.app ?? null}
        span={sheet?.span ?? null}
        segment={sheet?.segment ?? null}
        anio={query.anio}
        onClose={() => set_sheet(null)}
        on_edit_tarea={(_app, modulo, tarea) => {
          const owner = apps.find((item) => item.id === modulo.app_id);
          if (!owner) return;
          set_sheet(null);
          open_edit_tarea(owner, modulo, tarea);
        }}
        on_edit_modulo={(_app, modulo) => {
          const owner = apps.find((item) => item.id === modulo.app_id);
          if (!owner) return;
          set_sheet(null);
          open_edit_modulo(owner, modulo);
        }}
      />
      {hito_open ? (
        <HitoFormDialog
          key={editing_hito?.id ?? `new-hito-${hito_app?.id}-${hito_trimestre}`}
          open
          apps={apps.filter((app) => app.id > 0)}
          app={hito_app}
          hito={editing_hito}
          trimestre={hito_trimestre}
          anio={query.anio}
          onClose={() => set_hito_open(false)}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
