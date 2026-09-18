"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanMonthPicker } from "./plan-month-picker";
import { OrigenBadge } from "./origen-badge";
import { PlanAssigneeStack } from "./plan-assignee-chip";
import { TareaFormDialog } from "./tarea-form-dialog";
import { VincularTareaDialog } from "./vincular-tarea-dialog";
import { people_on_tarea } from "../lib/people";
import { tarea_avance } from "../lib/task-progress";
import { vincular_tarea_objetivo } from "../actions/objetivo-actions";
import type { CubrirWorkspace } from "../actions/objetivo-actions";
import type { PlanModulo, PlanTarea } from "../lib/types";

export function CubrirWorkspace({
  data,
  can_write = true,
}: {
  data: CubrirWorkspace;
  can_write?: boolean;
}) {
  const router = useRouter();
  const { mes, objetivos, sueltas, plan_apps, usuarios } = data;
  const [new_for, set_new_for] = useState<number | null>(null);
  const [link_for, set_link_for] = useState<number | null>(null);
  const [editing, set_editing] = useState<PlanTarea | null>(null);

  const all_modulos = useMemo(() => {
    const seen = new Set<number>();
    const out: PlanModulo[] = [];
    for (const app of plan_apps) {
      for (const modulo of app.modulos) {
        if (seen.has(modulo.id)) continue;
        seen.add(modulo.id);
        out.push(modulo);
      }
    }
    return out;
  }, [plan_apps]);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
            Cubrir
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Cómo se construye la respuesta al plan de este mes
          </p>
        </div>
        <PlanMonthPicker mes={mes} />
      </div>

      {objetivos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-400">
          Primero plantea objetivos del mes. Luego cuelga aquí el trabajo.
        </p>
      ) : (
        <div className="space-y-4">
          {objetivos.map((objetivo) => (
            <section
              key={objetivo.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {objetivo.titulo}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {objetivo.tarea_count} tareas · {objetivo.avance}%
                    {objetivo.app_nombre ? ` · ${objetivo.app_nombre}` : ""}
                  </p>
                </div>
                {can_write ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 rounded-full"
                      onClick={() => set_link_for(objetivo.id)}
                    >
                      Vincular
                    </Button>
                    <Button
                      type="button"
                      className="h-8 rounded-full bg-slate-900 text-white hover:bg-slate-800"
                      onClick={() => set_new_for(objetivo.id)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Nueva tarea
                    </Button>
                  </div>
                ) : null}
              </div>
              {objetivo.tareas.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  Aún no hay trabajo colgado de este objetivo.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {objetivo.tareas.map((tarea) => (
                    <CoverTaskRow
                      key={tarea.id}
                      tarea={tarea}
                      on_open={() => set_editing(tarea)}
                      on_unlink={
                        can_write
                          ? () => {
                              void (async () => {
                                await vincular_tarea_objetivo(tarea.id, null);
                                refresh();
                              })();
                            }
                          : undefined
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sin objetivo
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Trabajo suelto de este mes que aún no cuelga de un compromiso.
        </p>
        {sueltas.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Nada suelto este mes.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sueltas.map((tarea) => (
              <CoverTaskRow
                key={tarea.id}
                tarea={tarea}
                on_open={() => set_editing(tarea)}
              />
            ))}
          </ul>
        )}
      </section>

      {new_for && can_write ? (
        <TareaFormDialog
          open
          apps={plan_apps}
          all_modulos={all_modulos}
          preset_app_id={
            objetivos.find((item) => item.id === new_for)?.app_id ??
            plan_apps[0]?.id ??
            null
          }
          preset_modulo_id={null}
          preset_objetivo_id={new_for}
          tarea={null}
          usuarios={usuarios}
          onClose={() => set_new_for(null)}
          onSaved={() => {
            set_new_for(null);
            refresh();
          }}
        />
      ) : null}

      {editing ? (
        <TareaFormDialog
          key={editing.id}
          open
          apps={plan_apps}
          all_modulos={all_modulos}
          preset_app_id={
            all_modulos.find((modulo) => modulo.id === editing.modulo_id)
              ?.app_id ?? null
          }
          preset_modulo_id={editing.modulo_id}
          tarea={editing}
          usuarios={usuarios}
          view_only={!can_write}
          onClose={() => set_editing(null)}
          onSaved={() => {
            set_editing(null);
            refresh();
          }}
        />
      ) : null}

      {link_for && can_write ? (
        <VincularTareaDialog
          open
          objetivo_id={link_for}
          onClose={() => set_link_for(null)}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}

function CoverTaskRow({
  tarea,
  on_open,
  on_unlink,
}: {
  tarea: PlanTarea;
  on_open: () => void;
  on_unlink?: () => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={on_open}
      >
        <p className="text-sm font-medium text-slate-800">{tarea.titulo}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <OrigenBadge origen={tarea.origen} />
          <span className="text-[11px] font-semibold tabular-nums text-slate-500">
            {tarea_avance(tarea)}%
          </span>
          <PlanAssigneeStack people={people_on_tarea(tarea)} />
        </div>
      </button>
      {on_unlink ? (
        <button
          type="button"
          className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
          onClick={on_unlink}
          aria-label="Descolgar"
        >
          <Unlink className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}
