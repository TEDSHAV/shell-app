"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanModal } from "./plan-modal";
import { archive_plan_app, save_plan_app } from "../actions/app-actions";
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
  const shell_locked = app?.origen === "shell";

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
      title={app ? "Editar aplicación" : "Nueva aplicación"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-gray-900 text-white hover:bg-gray-800"
            disabled={saving}
            onClick={() => void on_submit()}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="app-nombre">APP</Label>
          <Input
            id="app-nombre"
            value={nombre}
            disabled={shell_locked}
            onChange={(e) => set_nombre(e.target.value)}
          />
          {shell_locked ? (
            <p className="text-xs text-gray-400">
              El nombre viene del catálogo del Shell.
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="app-sub">Descripción</Label>
          <Input
            id="app-sub"
            value={subtitulo}
            onChange={(e) => set_subtitulo(e.target.value)}
          />
        </div>
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
