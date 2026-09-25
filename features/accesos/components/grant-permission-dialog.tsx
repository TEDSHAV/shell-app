"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AccesosModal } from "./accesos-modal";
import { AppGlyph } from "./catalog-glyphs";
import { RoleFichaCard } from "./role-ficha-card";
import { sync_permission_roles } from "../actions/assign-actions";
import type { AccesoApp, AccesoPermission, AccesoRole } from "../lib/types";

export function GrantPermissionDialog({
  open,
  onClose,
  onSaved,
  permissions,
  roles,
  apps,
  initial_permission_id = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  permissions: AccesoPermission[];
  roles: AccesoRole[];
  apps: AccesoApp[];
  /** Prefill when opening from a permission row. */
  initial_permission_id?: number | null;
}) {
  const [permission_id, set_permission_id] = useState<number | null>(null);
  const [role_ids, set_role_ids] = useState<number[]>([]);
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);

  const selected = permissions.find((p) => p.id === permission_id) ?? null;

  useEffect(() => {
    if (!open) return;
    set_permission_id(initial_permission_id);
    set_role_ids([]);
    set_error(null);
  }, [open, initial_permission_id]);

  useEffect(() => {
    if (!selected) {
      set_role_ids([]);
      return;
    }
    set_role_ids(
      roles
        .filter((r) => r.permission_slugs.includes(selected.slug))
        .map((r) => r.id),
    );
  }, [selected, roles]);

  const by_app = useMemo(
    () =>
      apps
        .map((app) => ({
          app,
          roles: roles.filter((r) => r.app_id === app.id),
        }))
        .filter((g) => g.roles.length > 0),
    [apps, roles],
  );

  function toggle(id: number) {
    set_role_ids((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function save() {
    if (!permission_id) {
      set_error("Elige un permiso.");
      return;
    }
    set_saving(true);
    set_error(null);
    const result = await sync_permission_roles({
      permission_id,
      role_ids,
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
    <AccesosModal
      open={open}
      size="xl"
      title="Colgar permiso en roles"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !permission_id}
            onClick={() => void save()}
          >
            {saving ? "Guardando…" : "Guardar en roles"}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        El permiso es global. Márcalo en las fichas de rol (agrupadas por app).
        Los que quites dejan de tenerlo; el resto de permisos del rol no se
        toca.
      </p>
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
      <label className="mb-4 block text-sm">
        <span className="mb-1 block font-medium">Permiso</span>
        <select
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
          value={permission_id ?? ""}
          onChange={(e) =>
            set_permission_id(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">Elegir permiso…</option>
          {permissions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.slug}
              {p.descripcion ? ` — ${p.descripcion}` : ""}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <div className="space-y-6">
          {by_app.map(({ app, roles: app_roles }) => (
            <section key={app.id} className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AppGlyph slug={app.slug} className="h-4 w-4 text-indigo-700" />
                {app.nombre}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {app_roles.map((role) => (
                  <RoleFichaCard
                    key={role.id}
                    role={role}
                    permissions={permissions}
                    app_nombre={app.nombre}
                    selected={role_ids.includes(role.id)}
                    onSelect={() => toggle(role.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </AccesosModal>
  );
}
