"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLAN_TRIMESTRES, HITO_ICONOS } from "../schemas";
import { save_plan_hito, delete_plan_hito } from "../actions/hito-actions";
import type { PlanApp, PlanHito, PlanHitoIcono, PlanTrimestre } from "../lib/types";
import { PlanModal } from "./plan-modal";
import { PlanField, PLAN_SELECT_CLASS } from "./plan-form-ui";

const ICON_LABEL: Record<PlanHitoIcono, string> = {
  deploy: "Despliegue",
  engine: "Motor",
  team: "Equipo",
};

export function HitoFormDialog({
  open,
  apps,
  app,
  hito,
  trimestre,
  anio,
  onClose,
  onSaved,
}: {
  open: boolean;
  apps: PlanApp[];
  app: PlanApp | null;
  hito: PlanHito | null;
  trimestre: PlanTrimestre;
  anio: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial_app = hito?.app_id ?? app?.id ?? apps[0]?.id ?? 0;
  const [app_id, set_app_id] = useState(String(initial_app));
  const [modulo_id, set_modulo_id] = useState(String(hito?.modulo_id ?? ""));
  const [titulo, set_titulo] = useState(hito?.titulo ?? "");
  const [descripcion, set_descripcion] = useState(hito?.descripcion ?? "");
  const [trim, set_trim] = useState<PlanTrimestre>(hito?.trimestre ?? trimestre);
  const [year, set_year] = useState(hito?.anio ?? anio);
  const [icono, set_icono] = useState<PlanHitoIcono>(hito?.icono ?? "deploy");
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const selected = apps.find((item) => item.id === Number(app_id));

  async function on_submit() {
    set_saving(true);
    set_error(null);
    const result = await save_plan_hito({
      id: hito?.id,
      app_id: Number(app_id),
      modulo_id: Number(modulo_id) > 0 ? Number(modulo_id) : null,
      titulo,
      descripcion,
      trimestre: trim,
      anio: year,
      icono,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  async function on_delete() {
    if (!hito) return;
    set_saving(true);
    const result = await delete_plan_hito(hito.id);
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
      title={hito ? "Editar hito" : "Nuevo hito"}
      onClose={onClose}
      footer={
        <>
          {hito ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={on_delete}
            >
              Eliminar
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={on_submit}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <PlanField label="App">
          <select
            className={PLAN_SELECT_CLASS}
            value={app_id}
            onChange={(event) => {
              set_app_id(event.target.value);
              set_modulo_id("");
            }}
          >
            {apps.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </PlanField>
        <PlanField label="Módulo (opcional)">
          <select
            className={PLAN_SELECT_CLASS}
            value={modulo_id}
            onChange={(event) => set_modulo_id(event.target.value)}
          >
            <option value="">Sin módulo</option>
            {(selected?.modulos ?? []).map((modulo) => (
              <option key={modulo.id} value={modulo.id}>
                {modulo.nombre}
              </option>
            ))}
          </select>
        </PlanField>
        <PlanField label="Título">
          <Input
            value={titulo}
            onChange={(event) => set_titulo(event.target.value)}
          />
        </PlanField>
        <PlanField label="Descripción">
          <Textarea
            value={descripcion}
            onChange={(event) => set_descripcion(event.target.value)}
          />
        </PlanField>
        <div className="grid grid-cols-3 gap-3">
          <PlanField label="Trimestre">
            <select
              className={PLAN_SELECT_CLASS}
              value={trim}
              onChange={(event) => set_trim(event.target.value as PlanTrimestre)}
            >
              {PLAN_TRIMESTRES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </PlanField>
          <PlanField label="Año">
            <Input
              type="number"
              value={year}
              onChange={(event) => set_year(Number(event.target.value))}
            />
          </PlanField>
          <PlanField label="Icono">
            <select
              className={PLAN_SELECT_CLASS}
              value={icono}
              onChange={(event) =>
                set_icono(event.target.value as PlanHitoIcono)
              }
            >
              {HITO_ICONOS.map((item) => (
                <option key={item} value={item}>
                  {ICON_LABEL[item]}
                </option>
              ))}
            </select>
          </PlanField>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </PlanModal>
  );
}
