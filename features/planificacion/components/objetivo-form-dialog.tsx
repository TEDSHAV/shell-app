"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlanModal } from "./plan-modal";
import {
  PlanField,
  PlanSection,
  PLAN_INPUT_CLASS,
  PLAN_SELECT_CLASS,
} from "./plan-form-ui";
import { save_plan_objetivo, delete_plan_objetivo } from "../actions/objetivo-actions";
import { month_bounds } from "../lib/plan-month";
import type { PlanObjetivo, PlanObjetivoEstado } from "../lib/types";

export function ObjetivoFormDialog({
  open,
  mes,
  apps,
  objetivo,
  onClose,
  onSaved,
}: {
  open: boolean;
  mes: string;
  apps: Array<{ id: number; nombre: string }>;
  objetivo: PlanObjetivo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const bounds = month_bounds(mes);
  const [titulo, set_titulo] = useState(objetivo?.titulo ?? "");
  const [descripcion, set_descripcion] = useState(objetivo?.descripcion ?? "");
  const [fecha_inicio, set_fecha_inicio] = useState(
    objetivo?.fecha_inicio?.slice(0, 10) ?? bounds.start,
  );
  const [fecha_fin, set_fecha_fin] = useState(
    objetivo?.fecha_fin?.slice(0, 10) ?? bounds.end,
  );
  const [app_id, set_app_id] = useState(
    objetivo?.app_id ? String(objetivo.app_id) : "",
  );
  const [estado, set_estado] = useState<PlanObjetivoEstado>(
    objetivo?.estado ?? "abierto",
  );
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);

  async function on_submit() {
    set_saving(true);
    set_error(null);
    const result = await save_plan_objetivo({
      id: objetivo?.id,
      titulo,
      descripcion: descripcion || null,
      fecha_inicio,
      fecha_fin,
      app_id: app_id ? Number(app_id) : null,
      estado,
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
      title={objetivo ? "Editar objetivo" : "Plantear objetivo"}
      subtitle="Qué hay que lograr en este periodo"
      onClose={onClose}
      footer={
        <>
          {objetivo ? (
            <Button
              type="button"
              variant="outline"
              className="mr-auto border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                void (async () => {
                  const ok = window.confirm("¿Eliminar este objetivo?");
                  if (!ok) return;
                  const result = await delete_plan_objetivo(objetivo.id);
                  if (!result.ok) {
                    set_error(result.error);
                    return;
                  }
                  onSaved();
                  onClose();
                })();
              }}
            >
              Eliminar
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-slate-900 px-5 text-white hover:bg-slate-800"
            disabled={saving}
            onClick={() => void on_submit()}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <PlanSection title="Compromiso">
        <PlanField label="Título" htmlFor="obj-titulo">
          <Input
            id="obj-titulo"
            className={PLAN_INPUT_CLASS}
            value={titulo}
            onChange={(event) => set_titulo(event.target.value)}
          />
        </PlanField>
        <PlanField label="Descripción" htmlFor="obj-desc">
          <Textarea
            id="obj-desc"
            value={descripcion}
            onChange={(event) => set_descripcion(event.target.value)}
            rows={3}
          />
        </PlanField>
        <div className="grid gap-3 sm:grid-cols-2">
          <PlanField label="Inicio" htmlFor="obj-ini">
            <Input
              id="obj-ini"
              type="date"
              className={PLAN_INPUT_CLASS}
              value={fecha_inicio}
              onChange={(event) => set_fecha_inicio(event.target.value)}
            />
          </PlanField>
          <PlanField label="Fin" htmlFor="obj-fin">
            <Input
              id="obj-fin"
              type="date"
              className={PLAN_INPUT_CLASS}
              value={fecha_fin}
              onChange={(event) => set_fecha_fin(event.target.value)}
            />
          </PlanField>
        </div>
        <PlanField label="App (opcional)" htmlFor="obj-app">
          <select
            id="obj-app"
            className={PLAN_SELECT_CLASS}
            value={app_id}
            onChange={(event) => set_app_id(event.target.value)}
          >
            <option value="">Transversal</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.nombre}
              </option>
            ))}
          </select>
        </PlanField>
        {objetivo ? (
          <PlanField label="Estado" htmlFor="obj-estado">
            <select
              id="obj-estado"
              className={PLAN_SELECT_CLASS}
              value={estado}
              onChange={(event) =>
                set_estado(event.target.value as PlanObjetivoEstado)
              }
            >
              <option value="abierto">Abierto</option>
              <option value="cumplido">Cumplido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </PlanField>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </PlanSection>
    </PlanModal>
  );
}
