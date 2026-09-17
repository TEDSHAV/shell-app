"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { PlanModal } from "./plan-modal";
import {
  archive_plan_modulo,
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
      title={modulo ? "Editar módulo" : "Nuevo módulo"}
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
          <Label>Apps</Label>
          <MultiSelect
            options={apps.map((app) => ({ id: app.id, label: app.nombre }))}
            selectedIds={app_ids}
            onChange={set_app_ids}
            placeholder="Este módulo puede estar en varias apps"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mod-nombre">Nombre</Label>
          <Input
            id="mod-nombre"
            value={nombre}
            onChange={(e) => set_nombre(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mod-sub">Subtítulo / alcance</Label>
          <Input
            id="mod-sub"
            value={subtitulo}
            onChange={(e) => set_subtitulo(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mod-t">Trimestre</Label>
            <select
              id="mod-t"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mod-anio">Año</Label>
            <Input
              id="mod-anio"
              type="number"
              value={anio}
              onChange={(e) => set_anio(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mod-fecha">Fecha objetivo</Label>
          <Input
            id="mod-fecha"
            type="date"
            value={fecha ?? ""}
            onChange={(e) => set_fecha(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Participantes</Label>
          <MultiSelect
            options={usuarios}
            selectedIds={participante_ids}
            onChange={set_participante_ids}
            placeholder="Asignar responsables"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {modulo ? (
          <button
            type="button"
            className="text-xs text-red-500 hover:text-red-700"
            onClick={() => {
              void (async () => {
                const ok = window.confirm(
                  "¿Archivar este módulo? Dejará de aparecer en la lista.",
                );
                if (!ok) return;
                const result = await archive_plan_modulo(modulo.id);
                if (!result.ok) {
                  set_error(result.error);
                  return;
                }
                onSaved();
                onClose();
              })();
            }}
          >
            Archivar módulo
          </button>
        ) : null}
      </div>
    </PlanModal>
  );
}
