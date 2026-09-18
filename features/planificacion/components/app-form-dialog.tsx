"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanModal } from "./plan-modal";
import { PlanField } from "./plan-form-ui";
import { archive_plan_app, save_plan_app } from "../actions/app-actions";
import { catalog_nombre_of_slug } from "../lib/shell-plan-apps";
import type { PlanApp } from "../lib/types";

export function AppFormDialog({
  open,
  app,
  onClose,
  onSaved,
}: {
  open: boolean;
  app: PlanApp | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, set_nombre] = useState(app?.nombre ?? "");
  const [subtitulo, set_subtitulo] = useState(app?.subtitulo ?? "");
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const catalog_nombre = app ? catalog_nombre_of_slug(app.slug) : null;

  async function on_submit() {
    set_saving(true);
    set_error(null);
    const result = await save_plan_app({
      id: app?.id,
      nombre,
      subtitulo,
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
      title={app ? "Editar aplicación" : "Nueva aplicación"}
      onClose={onClose}
      footer={
        <>
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
        <PlanField
          label="Nombre en Prisma"
          htmlFor="app-nombre"
          hint={
            catalog_nombre
              ? `En el catálogo del Shell se llama ${catalog_nombre}.`
              : undefined
          }
        >
          <Input
            id="app-nombre"
            value={nombre}
            onChange={(e) => set_nombre(e.target.value)}
          />
        </PlanField>
        <PlanField label="Descripción" htmlFor="app-sub">
          <Input
            id="app-sub"
            value={subtitulo}
            onChange={(e) => set_subtitulo(e.target.value)}
          />
        </PlanField>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {app && app.origen === "custom" ? (
          <button
            type="button"
            className="text-xs text-red-500 hover:text-red-700"
            onClick={() => {
              void (async () => {
                const ok = window.confirm("¿Archivar esta aplicación?");
                if (!ok) return;
                const result = await archive_plan_app(app.id);
                if (!result.ok) {
                  set_error(result.error);
                  return;
                }
                onSaved();
                onClose();
              })();
            }}
          >
            Archivar aplicación
          </button>
        ) : null}
      </div>
    </PlanModal>
  );
}
