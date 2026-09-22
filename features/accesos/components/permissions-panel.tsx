"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PermissionFormDialog } from "./permission-form-dialog";
import { GrantPermissionDialog } from "./grant-permission-dialog";
import {
  group_permissions_by_module,
  module_label,
  permission_home_app_slug,
  permission_module,
} from "../lib/slugs";
import { update_acceso_permission } from "../actions/catalog-actions";
import type { AccesoAction, AccesoApp, AccesoModule, AccesoPermission, AccesoRole } from "../lib/types";

export function PermissionsPanel({
  permissions,
  apps,
  roles,
  modules,
  actions,
}: {
  permissions: AccesoPermission[];
  apps: AccesoApp[];
  roles: AccesoRole[];
  modules: AccesoModule[];
  actions: AccesoAction[];
}) {
  const router = useRouter();
  const [query, set_query] = useState("");
  const [module_filter, set_module_filter] = useState("todos");
  const [open, set_open] = useState(false);
  const [grant_open, set_grant_open] = useState(false);
  const [drafts, set_drafts] = useState<Record<number, string>>({});
  const [error, set_error] = useState<string | null>(null);

  const app_by_slug = useMemo(
    () => new Map(apps.map((a) => [a.slug, a])),
    [apps],
  );
  const app_by_id = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);

  function apps_for(perm: AccesoPermission): string {
    const names = new Set<string>();
    const home = permission_home_app_slug(perm.slug);
    if (home) {
      names.add(app_by_slug.get(home)?.nombre || home);
    }
    for (const role of roles) {
      if (!role.permission_slugs.includes(perm.slug)) continue;
      const app = app_by_id.get(role.app_id);
      if (app) names.add(app.nombre);
    }
    return [...names].join(", ") || "Global";
  }

  const groups = useMemo(
    () => group_permissions_by_module(permissions),
    [permissions],
  );
  const module_keys = groups.map((g) => g.module);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return permissions.filter((p) => {
      if (module_filter !== "todos" && permission_module(p.slug) !== module_filter) {
        return false;
      }
      if (!q) return true;
      const app_label = apps_for(p).toLowerCase();
      return (
        p.slug.toLowerCase().includes(q) ||
        (p.descripcion || "").toLowerCase().includes(q) ||
        app_label.includes(q)
      );
    });
  }, [permissions, query, module_filter, apps, roles]);

  async function save_desc(id: number) {
    const descripcion = drafts[id];
    if (descripcion === undefined) return;
    const result = await update_acceso_permission({ id, descripcion });
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    set_error(null);
    set_drafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        El permiso es global; la app es orientación (módulo y roles que lo usan).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          className="max-w-sm"
          placeholder="Filtrar slug, app o descripción…"
          value={query}
          onChange={(e) => set_query(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          value={module_filter}
          onChange={(e) => set_module_filter(e.target.value)}
        >
          <option value="todos">Todos los módulos</option>
          {module_keys.map((m) => (
            <option key={m} value={m}>
              {module_label(m)}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={() => set_grant_open(true)}>
          Colgar en roles
        </Button>
        <Button type="button" onClick={() => set_open(true)}>
          Nuevo permiso
        </Button>
      </div>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">App</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Módulo</th>
              <th className="px-3 py-2">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-700">{apps_for(p)}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.slug}</td>
                <td className="px-3 py-2 text-slate-500">
                  {module_label(p.slug)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Input
                      value={drafts[p.id] ?? p.descripcion ?? ""}
                      onChange={(e) =>
                        set_drafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    />
                    {drafts[p.id] !== undefined ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void save_desc(p.id)}
                      >
                        Guardar
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GrantPermissionDialog
        open={grant_open}
        onClose={() => set_grant_open(false)}
        apps={apps}
        roles={roles}
        permissions={permissions}
        onSaved={() => router.refresh()}
      />
      <PermissionFormDialog
        open={open}
        onClose={() => set_open(false)}
        apps={apps}
        modules={modules}
        actions={actions}
        permissions={permissions}
        roles={roles}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
