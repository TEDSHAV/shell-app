"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { PlanModal } from "./plan-modal";
import { PlanField, PLAN_SELECT_CLASS } from "./plan-form-ui";
import {
  delete_plan_modulo,
  save_plan_modulo,
} from "../actions/modulo-actions";
import { PLAN_TRIMESTRES } from "../schemas";
import type { PlanModulo, PlanUsuarioOption } from "../lib/types";

export function ModuloFormDialog({
  open,
  app_id,
  apps,
  modulo,
  usuarios,
  onClose,
  onSaved,
}: {
  open: boolean;
  app_id: number;
  apps: Array<{ id: number; nombre: string }>;
  modulo: PlanModulo | null;
  usuarios: PlanUsuarioOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, set_nombre] = useState(modulo?.nombre ?? "");
  const [subtitulo, set_subtitulo] = useState(modulo?.subtitulo ?? "");
  const [trimestre, set_trimestre] = useState(modulo?.trimestre_entrega ?? "T1");
  const [anio, set_anio] = useState(
    String(modulo?.anio ?? new Date().getFullYear()),
  );
  const [fecha, set_fecha] = useState(modulo?.fecha_objetivo ?? "");
  const [participante_ids, set_participante_ids] = useState<number[]>(
    modulo?.participantes.map((p) => p.usuario_id) ?? [],
  );
  const [app_ids, set_app_ids] = useState<number[]>(
    modulo?.app_ids?.length ? modulo.app_ids : [app_id],
  );
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const task_count = modulo?.tareas.length ?? 0;

  async function on_delete() {
    if (!modulo) return;
    const extra =
      task_count > 0
        ? ` También se borrarán ${task_count} tarea${task_count === 1 ? "" : "s"}.`
        : "";
    const ok = window.confirm(`¿Borrar el módulo «${modulo.nombre}»?${extra}`);
    if (!ok) return;
    set_saving(true);
    set_error(null);
    const result = await delete_plan_modulo(modulo.id);
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  async function on_submit() {
    set_saving(true);
    set_error(null);
    const result = await save_plan_modulo({
      id: modulo?.id,
      app_id: app_ids[0] ?? app_id,
      app_ids,
      nombre,
      subtitulo,
      trimestre_entrega: trimestre,
      anio: Number(anio),
      fecha_objetivo: fecha || null,
      participante_ids,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <PlanModal
      open={open}
      wide
      title={modulo ? "Editar módulo" : "Nuevo módulo"}
      onClose={onClose}
      footer={
        <>
          {modulo ? (
            <Button
              type="button"
              variant="outline"
              className="mr-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={saving}
              onClick={() => void on_delete()}
            >
              Borrar módulo
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-slate-900 text-white hover:bg-slate-800"
            disabled={saving}
            onClick={() => void on_submit()}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <PlanField label="Apps">
          <MultiSelect
            options={apps.map((app) => ({ id: app.id, label: app.nombre }))}
            selectedIds={app_ids}
            onChange={set_app_ids}
            placeholder="Este módulo puede estar en varias apps"
          />
        </PlanField>
        <PlanField label="Nombre" htmlFor="mod-nombre">
          <Input
            id="mod-nombre"
            value={nombre}
            onChange={(e) => set_nombre(e.target.value)}
          />
        </PlanField>
        <PlanField label="Subtítulo / alcance" htmlFor="mod-sub">
          <Input
            id="mod-sub"
            value={subtitulo}
            onChange={(e) => set_subtitulo(e.target.value)}
          />
        </PlanField>
        <div className="grid grid-cols-2 gap-3">
          <PlanField label="Trimestre" htmlFor="mod-t">
            <select
              id="mod-t"
              className={PLAN_SELECT_CLASS}
              value={trimestre}
              onChange={(e) =>
                set_trimestre(e.target.value as (typeof PLAN_TRIMESTRES)[number])
              }
            >
              {PLAN_TRIMESTRES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </PlanField>
          <PlanField label="Año" htmlFor="mod-anio">
            <Input
              id="mod-anio"
              type="number"
              value={anio}
              onChange={(e) => set_anio(e.target.value)}
            />
          </PlanField>
        </div>
        <PlanField label="Fecha objetivo" htmlFor="mod-fecha">
          <Input
            id="mod-fecha"
            type="date"
            value={fecha ?? ""}
            onChange={(e) => set_fecha(e.target.value)}
          />
        </PlanField>
        <PlanField label="Participantes">
          <MultiSelect
            options={usuarios}
            selectedIds={participante_ids}
            onChange={set_participante_ids}
            placeholder="Asignar responsables"
          />
        </PlanField>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </PlanModal>
  );
}
