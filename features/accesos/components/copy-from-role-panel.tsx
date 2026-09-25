"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleGlyph } from "./catalog-glyphs";
import {
  merge_permission_ids,
  role_permission_ids,
} from "../lib/role-compose";
import type { AccesoPermission, AccesoRole } from "../lib/types";

export type CopiedRoleBundle = {
  role_id: number;
  role_nombre: string;
  role_slug: string;
  permission_ids: number[];
};

export function CopyFromRolePanel({
  app_roles,
  exclude_role_id,
  permissions,
  selected_ids,
  onChange,
  bundles,
  onBundlesChange,
}: {
  app_roles: AccesoRole[];
  exclude_role_id: number | null;
  permissions: AccesoPermission[];
  selected_ids: number[];
  onChange: (ids: number[]) => void;
  bundles: CopiedRoleBundle[];
  onBundlesChange: (bundles: CopiedRoleBundle[]) => void;
}) {
  const [picker_open, set_picker_open] = useState(false);
  const selected = new Set(selected_ids);

  const sources = useMemo(
    () =>
      app_roles.filter(
        (r) =>
          r.id !== exclude_role_id &&
          role_permission_ids(r, permissions).length > 0,
      ),
    [app_roles, exclude_role_id, permissions],
  );

  function paste_from(role: AccesoRole) {
    const ids = role_permission_ids(role, permissions);
    if (ids.length === 0) return;
    onChange(merge_permission_ids(selected_ids, ids));
    const next_bundle: CopiedRoleBundle = {
      role_id: role.id,
      role_nombre: role.nombre,
      role_slug: role.slug,
      permission_ids: ids,
    };
    onBundlesChange([
      ...bundles.filter((b) => b.role_id !== role.id),
      next_bundle,
    ]);
    set_picker_open(false);
  }

  function toggle_in_bundle(permission_id: number, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(permission_id);
    else next.delete(permission_id);
    onChange([...next]);
  }

  if (sources.length === 0 && bundles.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Añadir desde otro rol
          </p>
          <p className="mt-0.5 text-[12px] text-slate-600">
            Copia los permisos de un rol de esta app. Luego puedes desmarcar
            los que no quieras. No crea vínculo: solo marca checks.
          </p>
        </div>
        {sources.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set_picker_open((v) => !v)}
          >
            {picker_open ? "Cerrar lista" : "Elegir rol"}
          </Button>
        ) : null}
      </div>

      {picker_open ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sources.map((role) => {
            const count = role_permission_ids(role, permissions).length;
            return (
              <li key={role.id}>
                <button
                  type="button"
                  onClick={() => paste_from(role)}
                  className="flex w-full items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <RoleGlyph slug={role.slug} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {role.nombre}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {role.slug}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {count} permiso{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {bundles.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {bundles.map((bundle) => (
            <div
              key={bundle.role_id}
              className="rounded-xl border border-indigo-100 bg-white p-3"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <RoleGlyph slug={bundle.role_slug} className="h-3.5 w-3.5" />
                </span>
                Desde {bundle.role_nombre}
              </p>
              <p className="mb-2 font-mono text-[10px] text-slate-400">
                {bundle.role_slug}
              </p>
              <ul className="space-y-1.5">
                {bundle.permission_ids.map((id) => {
                  const perm = permissions.find((p) => p.id === id);
                  if (!perm) return null;
                  return (
                    <li key={id}>
                      <label className="flex items-start gap-2 text-sm">
                        <Checkbox
                          className="mt-0.5"
                          checked={selected.has(id)}
                          onCheckedChange={(v) =>
                            toggle_in_bundle(id, v === true)
                          }
                        />
                        <span className="leading-snug text-slate-700">
                          <span className="block">
                            {perm.descripcion || perm.slug}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {perm.slug}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
