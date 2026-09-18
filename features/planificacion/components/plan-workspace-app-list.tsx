import type { PlanApp, PlanModulo, PlanTarea } from "../lib/types";
import { PlanificacionAppRow } from "./planificacion-app-row";
import { PlanificacionUtilidadesGroup } from "./planificacion-utilidades-group";

type Handlers = {
  read_only: boolean;
  select_mode: boolean;
  selected: Set<number>;
  on_toggle_task: (tarea_id: number) => void;
  on_toggle_ids: (ids: number[], on: boolean) => void;
  on_edit_app: (app: PlanApp) => void;
  on_add_modulo: (app: PlanApp) => void;
  on_edit_modulo: (app: PlanApp, modulo: PlanModulo) => void;
  on_add_tarea: (app: PlanApp, modulo: PlanModulo) => void;
  on_edit_tarea: (app: PlanApp, modulo: PlanModulo, tarea: PlanTarea) => void;
};

function AppRow({
  app,
  handlers,
}: {
  app: PlanApp;
  handlers: Handlers;
}) {
  return (
    <PlanificacionAppRow
      app={app}
      read_only={handlers.read_only}
      select_mode={handlers.read_only ? false : handlers.select_mode}
      selected={handlers.selected}
      on_toggle_task={handlers.on_toggle_task}
      on_toggle_ids={handlers.on_toggle_ids}
      on_edit_app={() => handlers.on_edit_app(app)}
      on_add_modulo={() => handlers.on_add_modulo(app)}
      on_edit_modulo={(modulo) => handlers.on_edit_modulo(app, modulo)}
      on_add_tarea={(modulo) => handlers.on_add_tarea(app, modulo)}
      on_edit_tarea={(modulo, tarea) =>
        handlers.on_edit_tarea(app, modulo, tarea)
      }
    />
  );
}

export function PlanWorkspaceAppList({
  empty,
  listed_live,
  util_live,
  idle_apps,
  handlers,
}: {
  empty: boolean;
  listed_live: PlanApp[];
  util_live: PlanApp[];
  idle_apps: PlanApp[];
  handlers: Handlers;
}) {
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-400">
        No hay aplicaciones en este filtro.
      </div>
    );
  }
  return (
    <>
      {listed_live.map((app) => (
        <AppRow key={app.id} app={app} handlers={handlers} />
      ))}
      {util_live.length > 0 ? (
        <PlanificacionUtilidadesGroup
          apps={util_live}
          read_only={handlers.read_only}
          select_mode={handlers.read_only ? false : handlers.select_mode}
          selected={handlers.selected}
          on_toggle_task={handlers.on_toggle_task}
          on_toggle_ids={handlers.on_toggle_ids}
          on_edit_app={handlers.on_edit_app}
          on_add_modulo={handlers.on_add_modulo}
          on_edit_modulo={handlers.on_edit_modulo}
          on_add_tarea={handlers.on_add_tarea}
          on_edit_tarea={handlers.on_edit_tarea}
        />
      ) : null}
      {idle_apps.length > 0 ? (
        <div className="space-y-2 pt-4">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sin avance
          </p>
          {idle_apps.map((app) => (
            <AppRow key={`idle-${app.id}`} app={app} handlers={handlers} />
          ))}
        </div>
      ) : null}
    </>
  );
}
