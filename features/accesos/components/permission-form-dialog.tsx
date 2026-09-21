"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccesosModal } from "./accesos-modal";
import { AppGlyph } from "./catalog-glyphs";
import { ModuleGlyph } from "./module-glyph";
import { PermissionActionPicker } from "./permission-action-picker";
import { create_acceso_permission } from "../actions/catalog-actions";
import { build_permission_slug, CROSS_APP_MODULES, slugify_kebab } from "../lib/slugs";
import type {
  AccesoAction,
  AccesoApp,
  AccesoModule,
} from "../lib/types";

const FIELD_HELP = {
  modulo:
    "Área funcional de la app (Finanzas, Ventas). Agrupa permisos que se usan juntos.",
  recurso:
    "Opcional. El objeto concreto (ecc, facturas). Si el módulo es pequeño, déjalo vacío: el permiso aplica a todo el módulo.",
  descripcion:
    "Texto para personas. Explica el efecto, no copies el slug.",
} as const;

export function PermissionFormDialog({
  open,
  onClose,
  onSaved,
  apps,
  modules,
  actions,
  locked_app,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (created: { id: number; slug: string }) => void;
  apps: AccesoApp[];
  modules: AccesoModule[];
  actions: AccesoAction[];
  locked_app?: AccesoApp | null;
}) {
  const start_step = locked_app ? 2 : 1;
  const [step, set_step] = useState(start_step);
  const [app_id, set_app_id] = useState<number | null>(locked_app?.id ?? null);
  const [modulo, set_modulo] = useState("");
  const [module_nombre, set_module_nombre] = useState("");
  const [module_descripcion, set_module_descripcion] = useState("");
  const [creating_module, set_creating_module] = useState(false);
  const [recurso, set_recurso] = useState("");
  const [accion, set_accion] = useState("access");
  const [creating_action, set_creating_action] = useState(false);
  const [action_nombre, set_action_nombre] = useState("");
  const [action_descripcion, set_action_descripcion] = useState("");
  const [save_action, set_save_action] = useState(true);
  const [descripcion, set_descripcion] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);

  useEffect(() => {
    if (!open) return;
    set_step(locked_app ? 2 : 1);
    set_app_id(locked_app?.id ?? null);
    set_modulo("");
    set_module_nombre("");
    set_module_descripcion("");
    set_creating_module(false);
    set_recurso("");
    set_accion("access");
    set_creating_action(false);
    set_action_nombre("");
    set_action_descripcion("");
    set_save_action(true);
    set_descripcion("");
    set_error(null);
  }, [open, locked_app]);

  const selected_app = apps.find((a) => a.id === app_id) ?? locked_app ?? null;
  const app_modules = useMemo(() => {
    if (!selected_app) return [];
    return modules.filter(
      (m) =>
        m.app_id === selected_app.id ||
        m.slug === selected_app.slug ||
        CROSS_APP_MODULES.has(m.slug),
    );
  }, [modules, selected_app]);

  const preview = useMemo(
    () => build_permission_slug(modulo, recurso, accion),
    [modulo, recurso, accion],
  );

  function pick_module(mod: AccesoModule) {
    set_creating_module(false);
    set_modulo(mod.slug);
    set_module_nombre(mod.nombre);
    set_module_descripcion(mod.descripcion || "");
  }

  async function save() {
    if (!selected_app) {
      set_error("Elige una aplicación.");
      return;
    }
    set_saving(true);
    set_error(null);
    const result = await create_acceso_permission({
      modulo,
      recurso,
      accion,
      descripcion: descripcion || null,
      app_id: selected_app.id,
      save_module: creating_module,
      module_nombre: module_nombre || null,
      module_descripcion: module_descripcion || null,
      save_action: creating_action && save_action,
      action_nombre: action_nombre || null,
      action_descripcion: action_descripcion || null,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    onSaved({ id: result.id, slug: result.slug });
    onClose();
  }

  const can_next =
    (step === 1 && app_id != null) ||
    (step === 2 && Boolean(slugify_kebab(modulo))) ||
    step === 3;

  return (
    <AccesosModal
      open={open}
      size="xl"
      title="Nuevo permiso"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {step > start_step ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => set_step(step - 1)}
            >
              Atrás
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              disabled={!can_next}
              onClick={() => set_step(step + 1)}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              type="button"
              disabled={saving || !accion.trim()}
              onClick={() => void save()}
            >
              {saving ? "Guardando…" : "Crear permiso"}
            </Button>
          )}
        </>
      }
    >
      <ol className="mb-4 grid grid-cols-3 gap-2 text-xs">
        {[
          { n: 1, label: "Aplicación" },
          { n: 2, label: "Módulo" },
          { n: 3, label: "Detalle" },
        ].map((item) => (
          <li
            key={item.n}
            className={`rounded-lg border px-2 py-1.5 ${
              step === item.n
                ? "border-indigo-300 bg-indigo-50 font-semibold text-indigo-900"
                : step > item.n
                  ? "border-indigo-100 text-slate-600"
                  : "border-slate-100 text-slate-400"
            }`}
          >
            {item.n}. {item.label}
          </li>
        ))}
      </ol>
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            El permiso es global, pero se orienta a una app para agrupar
            módulos y no mezclar catálogos.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {apps.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => set_app_id(app.id)}
                className={`rounded-2xl border p-3 text-left ${
                  app_id === app.id
                    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <AppGlyph slug={app.slug} className="h-4 w-4 text-indigo-700" />
                  {app.nombre}
                </p>
                {app.descripcion ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {app.descripcion}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">
            {selected_app?.nombre}
          </p>
          <p className="text-sm text-slate-600">{FIELD_HELP.modulo}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {app_modules.map((mod) => (
              <button
                key={mod.slug}
                type="button"
                onClick={() => pick_module(mod)}
                className={`rounded-2xl border p-3 text-left ${
                  !creating_module && modulo === mod.slug
                    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ModuleGlyph module={mod.slug} />
                  {mod.nombre}
                </p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  {mod.slug}
                </p>
                {mod.descripcion ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {mod.descripcion}
                  </p>
                ) : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                set_creating_module(true);
                set_modulo("");
                set_module_nombre("");
                set_module_descripcion("");
              }}
              className={`rounded-2xl border border-dashed p-3 text-left ${
                creating_module
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-300 hover:border-indigo-300"
              }`}
            >
              <p className="text-sm font-semibold">Crear módulo</p>
              <p className="mt-1 text-xs text-slate-500">
                Si el área aún no está en el catálogo de esta app.
              </p>
            </button>
          </div>
          {creating_module ? (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div>
                <Label htmlFor="new-mod-name">Nombre del módulo</Label>
                <Input
                  id="new-mod-name"
                  value={module_nombre}
                  onChange={(e) => {
                    set_module_nombre(e.target.value);
                    set_modulo(slugify_kebab(e.target.value));
                  }}
                  placeholder="Inventario de campo"
                />
              </div>
              <div>
                <Label htmlFor="new-mod-slug">Slug</Label>
                <Input
                  id="new-mod-slug"
                  value={modulo}
                  onChange={(e) => set_modulo(slugify_kebab(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="new-mod-desc">Para qué sirve</Label>
                <Input
                  id="new-mod-desc"
                  value={module_descripcion}
                  onChange={(e) => set_module_descripcion(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="perm-rec">Recurso (opcional)</Label>
            <p className="mb-1 text-xs text-slate-500">{FIELD_HELP.recurso}</p>
            <Input
              id="perm-rec"
              value={recurso}
              onChange={(e) => set_recurso(slugify_kebab(e.target.value))}
              placeholder="ecc — o vacío si cubre todo el módulo"
            />
          </div>
          <PermissionActionPicker
            actions={actions}
            accion={accion}
            creating={creating_action}
            save_action={save_action}
            action_nombre={action_nombre}
            action_descripcion={action_descripcion}
            onPick={(slug) => {
              set_creating_action(false);
              set_accion(slug);
              set_save_action(false);
            }}
            onStartCreate={() => {
              set_creating_action(true);
              set_accion("");
              set_action_nombre("");
              set_action_descripcion("");
              set_save_action(true);
            }}
            onNombre={(value) => {
              set_action_nombre(value);
              set_accion(slugify_kebab(value));
            }}
            onSlug={set_accion}
            onDescripcion={set_action_descripcion}
            onSaveAction={set_save_action}
          />
          <div>
            <Label htmlFor="perm-desc">Descripción</Label>
            <p className="mb-1 text-xs text-slate-500">
              {FIELD_HELP.descripcion}
            </p>
            <Input
              id="perm-desc"
              value={descripcion}
              onChange={(e) => set_descripcion(e.target.value)}
              placeholder="Puede consultar las ECC del área."
            />
          </div>
          <p className="rounded-md bg-slate-100 px-3 py-2 font-mono text-xs">
            {preview || "modulo:accion"}
          </p>
          <p className="text-xs text-slate-500">
            {recurso.trim()
              ? "Nivel recurso: el permiso cubre solo ese objeto del módulo."
              : "Nivel módulo: sin recurso, el permiso cubre el módulo entero."}
          </p>
        </div>
      ) : null}
    </AccesosModal>
  );
}
