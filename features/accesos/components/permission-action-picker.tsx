"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify_kebab } from "../lib/slugs";
import type { AccesoAction } from "../lib/types";

export function PermissionActionPicker({
  actions,
  accion,
  creating,
  save_action,
  action_nombre,
  action_descripcion,
  onPick,
  onStartCreate,
  onNombre,
  onSlug,
  onDescripcion,
  onSaveAction,
}: {
  actions: AccesoAction[];
  accion: string;
  creating: boolean;
  save_action: boolean;
  action_nombre: string;
  action_descripcion: string;
  onPick: (slug: string) => void;
  onStartCreate: () => void;
  onNombre: (value: string) => void;
  onSlug: (value: string) => void;
  onDescripcion: (value: string) => void;
  onSaveAction: (value: boolean) => void;
}) {
  const selected = actions.find((a) => a.slug === accion) ?? null;
  return (
    <div>
      <p className="text-sm font-medium">Acción</p>
      <p className="mb-2 text-xs text-slate-500">
        Qué se puede hacer sobre ese recurso: leer, crear, aprobar, configurar.
      </p>
      <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
        {actions.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => onPick(item.slug)}
            className={`rounded-xl border p-2.5 text-left ${
              !creating && accion === item.slug
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200 hover:border-indigo-300"
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">
              {item.nombre}
              <span className="ml-1 font-mono text-[10px] font-normal text-slate-400">
                {item.slug}
              </span>
            </p>
            {item.descripcion ? (
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {item.descripcion}
              </p>
            ) : null}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`mt-2 w-full rounded-xl border border-dashed px-3 py-2 text-left text-sm ${
          creating ? "border-indigo-400 bg-indigo-50" : "border-slate-300"
        }`}
        onClick={onStartCreate}
      >
        Nueva acción
      </button>
      {creating ? (
        <div className="mt-2 space-y-2 rounded-xl border border-slate-200 p-3">
          <div>
            <Label htmlFor="act-name">Nombre</Label>
            <Input
              id="act-name"
              value={action_nombre}
              onChange={(e) => onNombre(e.target.value)}
              placeholder="Cerrar"
            />
          </div>
          <div>
            <Label htmlFor="act-slug">Slug</Label>
            <Input
              id="act-slug"
              value={accion}
              onChange={(e) => onSlug(slugify_kebab(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="act-desc">Qué hace</Label>
            <Input
              id="act-desc"
              value={action_descripcion}
              onChange={(e) => onDescripcion(e.target.value)}
              placeholder="Cierra el ciclo y lo deja fuera de edición."
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <Checkbox
              checked={save_action}
              onCheckedChange={(v) => onSaveAction(v === true)}
              className="mt-0.5"
            />
            <span>
              Agregar al catálogo de acciones
              <span className="block text-xs text-slate-500">
                Si no, solo se usa en este permiso.
              </span>
            </span>
          </label>
        </div>
      ) : selected?.descripcion ? (
        <p className="mt-2 text-xs text-slate-500">{selected.descripcion}</p>
      ) : null}
    </div>
  );
}
