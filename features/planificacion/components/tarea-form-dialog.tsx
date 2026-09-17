"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlanModal } from "./plan-modal";
import { save_plan_tarea, delete_plan_tarea } from "../actions/tarea-actions";
import { PLAN_ORIGENES, PLAN_TRIMESTRES } from "../schemas";
import { PRISMA_VIEW_SHORTCUTS } from "../lib/prisma-routes";
import { PLAN_RELEASE_UNITS } from "../lib/release-units";
import { SearchSelect } from "./search-select";
import type {
  EntregableTipo,
  PlanApp,
  PlanModulo,
  PlanTarea,
  PlanTrimestre,
  PlanUsuarioOption,
} from "../lib/types";

export function TareaFormDialog({
  open,
  apps,
  all_modulos,
  preset_app_id,
  preset_modulo_id,
  tarea,
  usuarios,
  onClose,
  onSaved,
}: {
  open: boolean;
  apps: PlanApp[];
  all_modulos: PlanModulo[];
  preset_app_id: number | null;
  preset_modulo_id: number | null;
  tarea: PlanTarea | null;
  usuarios: PlanUsuarioOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial_app =
    preset_app_id ??
    all_modulos.find((m) => m.id === (tarea?.modulo_id ?? preset_modulo_id))
      ?.app_id ??
    apps[0]?.id ??
    0;
  const [app_id, set_app_id] = useState(String(initial_app || ""));
  const [modulo_id, set_modulo_id] = useState(
    String(tarea?.modulo_id ?? preset_modulo_id ?? ""),
  );
  const [nuevo_modulo, set_nuevo_modulo] = useState("");
  const [titulo, set_titulo] = useState(tarea?.titulo ?? "");
  const [origen, set_origen] = useState(tarea?.origen ?? "PLAN");
  const [avance, set_avance] = useState(
    tarea?.avance ?? (tarea?.completada ? 100 : 0),
  );
  const [no_solicitada, set_no_solicitada] = useState(
    Boolean(tarea?.no_solicitada),
  );
  const [entregable_tipo, set_entregable_tipo] = useState<EntregableTipo>(
    tarea?.entregable_tipo && tarea.entregable_tipo !== "ninguno"
      ? tarea.entregable_tipo
      : "ninguno",
  );
  const [unidad, set_unidad] = useState(tarea?.entregable_unidad ?? "core");
  const [version, set_version] = useState(tarea?.entregable_version ?? "");
  const [ruta, set_ruta] = useState(tarea?.entregable_ruta ?? "");
  const [comentario, set_comentario] = useState(
    tarea?.entregable_comentario ?? "",
  );
  const [fecha_inicio, set_fecha_inicio] = useState(
    tarea?.fecha_inicio?.slice(0, 10) ?? "",
  );
  const [fecha_fin, set_fecha_fin] = useState(
    tarea?.fecha_fin?.slice(0, 10) ?? "",
  );
  const [trimestre, set_trimestre] = useState<PlanTrimestre | "">(
    tarea?.trimestre ?? "",
  );
  const [asignado_id, set_asignado_id] = useState(
    tarea?.asignado_id ? String(tarea.asignado_id) : "",
  );
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);

  async function on_submit() {
    set_saving(true);
    set_error(null);
    const selected_modulo = Number(modulo_id);
    const selected_app = Number(app_id);
    const result = await save_plan_tarea({
      id: tarea?.id,
      app_id: selected_app > 0 ? selected_app : undefined,
      modulo_id: selected_modulo > 0 ? selected_modulo : undefined,
      modulo_nombre_nuevo: selected_modulo > 0 ? null : nuevo_modulo,
      titulo,
      origen,
      avance: no_solicitada ? 0 : avance,
      no_solicitada,
      entregable_tipo,
      entregable_ruta: ruta,
      entregable_comentario: comentario,
      entregable_unidad: unidad,
      entregable_version: version,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || fecha_inicio || null,
      trimestre: fecha_inicio ? null : trimestre || null,
      asignado_id: asignado_id ? Number(asignado_id) : null,
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
      title={tarea ? "Editar tarea" : "Nueva tarea"}
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
          <Label htmlFor="tar-app">APP</Label>
          <select
            id="tar-app"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={app_id}
            onChange={(e) => {
              set_app_id(e.target.value);
              set_modulo_id("");
            }}
          >
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tar-mod">Módulo</Label>
          <select
            id="tar-mod"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={modulo_id}
            onChange={(e) => set_modulo_id(e.target.value)}
          >
            <option value="">Crear módulo nuevo…</option>
            {all_modulos
              .filter((m) =>
                (m.app_ids?.length ? m.app_ids : [m.app_id]).includes(
                  Number(app_id),
                ),
              )
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
          </select>
        </div>
        {!modulo_id ? (
          <div className="space-y-1.5">
            <Label htmlFor="tar-mod-new">Nombre del módulo nuevo</Label>
            <Input
              id="tar-mod-new"
              value={nuevo_modulo}
              onChange={(e) => set_nuevo_modulo(e.target.value)}
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="tar-titulo">Tarea / feature</Label>
          <Input
            id="tar-titulo"
            value={titulo}
            onChange={(e) => set_titulo(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tar-origen">Origen</Label>
            <select
              id="tar-origen"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={origen}
              onChange={(e) =>
                set_origen(e.target.value as (typeof PLAN_ORIGENES)[number])
              }
            >
              {PLAN_ORIGENES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tar-estado">Avance</Label>
            <div className="flex items-center gap-2">
              <Input
                id="tar-estado"
                type="number"
                min={0}
                max={100}
                disabled={no_solicitada}
                value={no_solicitada ? 0 : avance}
                onChange={(e) => {
                  const next = Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0),
                  );
                  set_avance(next);
                }}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={no_solicitada}
                onChange={(e) => set_no_solicitada(e.target.checked)}
              />
              No solicitada (no cuenta en el %)
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tar-ini">Fecha inicio</Label>
            <Input
              id="tar-ini"
              type="date"
              value={fecha_inicio}
              onChange={(e) => {
                set_fecha_inicio(e.target.value);
                if (!fecha_fin || fecha_fin < e.target.value) {
                  set_fecha_fin(e.target.value);
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tar-fin">Fecha fin</Label>
            <Input
              id="tar-fin"
              type="date"
              value={fecha_fin}
              onChange={(e) => set_fecha_fin(e.target.value)}
            />
            <p className="text-[11px] text-gray-400">
              Opcional. Sin fecha puedes marcar un trimestre y colocarlo en el roadmap.
            </p>
          </div>
        </div>
        {!fecha_inicio ? (
          <div className="space-y-1.5">
            <Label htmlFor="tar-tri">Trimestre</Label>
            <select
              id="tar-tri"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={trimestre}
              onChange={(e) =>
                set_trimestre(e.target.value as PlanTrimestre | "")
              }
            >
              <option value="">Sin colocar</option>
              {PLAN_TRIMESTRES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label>Asignado a</Label>
          <SearchSelect
            value={asignado_id}
            placeholder="Buscar persona"
            onChange={set_asignado_id}
            options={[
              { value: "", label: "Sin asignar" },
              ...usuarios.map((user) => ({
                value: String(user.id),
                label: user.label,
              })),
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tar-ent">Entregable</Label>
          <select
            id="tar-ent"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={entregable_tipo}
            onChange={(e) =>
              set_entregable_tipo(e.target.value as EntregableTipo)
            }
          >
            <option value="ninguno">Sin entregable</option>
            <option value="vista">Vista Prisma (ruta)</option>
            <option value="comentario">Comentario</option>
            <option value="version">Versión de release</option>
          </select>
        </div>
        {entregable_tipo === "vista" ? (
          <div className="space-y-1.5">
            <Label htmlFor="tar-ruta">Ruta</Label>
            <Input
              id="tar-ruta"
              placeholder="/crm/leads"
              value={ruta}
              onChange={(e) => set_ruta(e.target.value)}
              list="prisma-routes"
            />
            <datalist id="prisma-routes">
              {PRISMA_VIEW_SHORTCUTS.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.label}
                </option>
              ))}
            </datalist>
          </div>
        ) : null}
        {entregable_tipo === "version" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tar-uni">Unidad</Label>
              <select
                id="tar-uni"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={unidad}
                onChange={(e) => set_unidad(e.target.value)}
              >
                {PLAN_RELEASE_UNITS.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tar-ver">Versión</Label>
              <Input
                id="tar-ver"
                placeholder="facturacion-v0.4.0"
                value={version}
                onChange={(e) => set_version(e.target.value)}
              />
            </div>
          </div>
        ) : null}
        {entregable_tipo === "comentario" ? (
          <div className="space-y-1.5">
            <Label htmlFor="tar-com">Comentario de entrega</Label>
            <Textarea
              id="tar-com"
              value={comentario}
              onChange={(e) => set_comentario(e.target.value)}
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {tarea ? (
          <button
            type="button"
            className="text-xs text-red-500 hover:text-red-700"
            onClick={() => {
              void (async () => {
                const ok = window.confirm("¿Eliminar esta tarea del cálculo?");
                if (!ok) return;
                const result = await delete_plan_tarea(tarea.id);
                if (!result.ok) {
                  set_error(result.error);
                  return;
                }
                onSaved();
                onClose();
              })();
            }}
          >
            Eliminar tarea
          </button>
        ) : null}
      </div>
    </PlanModal>
  );
}
