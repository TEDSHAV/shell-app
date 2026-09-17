"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanModal } from "./plan-modal";
import { SearchSelect } from "./search-select";
import { assign_plan_tareas } from "../actions/tarea-actions";
import type { PlanUsuarioOption } from "../lib/types";

export function AssignBar({
  selected_ids,
  usuarios,
  on_select_all,
  on_clear,
  on_done,
}: {
  selected_ids: number[];
  usuarios: PlanUsuarioOption[];
  on_select_all: () => void;
  on_clear: () => void;
  on_done: () => void;
}) {
  const [open, set_open] = useState(false);
  const [person, set_person] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const count = selected_ids.length;

  async function on_assign() {
    set_saving(true);
    set_error(null);
    const result = await assign_plan_tareas(
      selected_ids,
      person ? Number(person) : null,
    );
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    set_open(false);
    on_done();
  }

  return (
    <>
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-md">
        <p className="text-sm text-slate-600">
          {count === 0
            ? "Marca una app, un módulo o tareas sueltas"
            : `${count} tarea${count === 1 ? "" : "s"} seleccionada${count === 1 ? "" : "s"}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={on_select_all}>
            Seleccionar todo
          </Button>
          <Button type="button" variant="outline" onClick={on_clear}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => set_open(true)}
            disabled={count === 0}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Asignar a…
          </Button>
        </div>
      </div>
      {open ? (
        <PlanModal
          open
          title="Asignar tareas"
          onClose={() => set_open(false)}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => set_open(false)}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                className="bg-slate-900 text-white hover:bg-slate-800"
                disabled={saving}
                onClick={() => void on_assign()}
              >
                {saving ? "Asignando…" : `Asignar (${count})`}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              Elige a la persona. Vacío quita la asignación.
            </p>
            <SearchSelect
              value={person}
              placeholder="Buscar persona"
              onChange={set_person}
              options={usuarios.map((user) => ({
                value: String(user.id),
                label: user.label,
              }))}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </PlanModal>
      ) : null}
    </>
  );
}
