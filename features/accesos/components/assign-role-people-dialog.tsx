"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccesosModal } from "./accesos-modal";
import { AppGlyph } from "./catalog-glyphs";
import { RoleFichaCard } from "./role-ficha-card";
import { assign_role_to_users } from "../actions/assign-actions";
import type {
  AccesoApp,
  AccesoPermission,
  AccesoRole,
  AccesoUsuarioListItem,
} from "../lib/types";

export function AssignRolePeopleDialog({
  open,
  onClose,
  onSaved,
  apps,
  roles,
  permissions,
  users,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  apps: AccesoApp[];
  roles: AccesoRole[];
  permissions: AccesoPermission[];
  users: AccesoUsuarioListItem[];
}) {
  const [role_id, set_role_id] = useState<number | null>(null);
  const [user_ids, set_user_ids] = useState<number[]>([]);
  const [query, set_query] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);

  const role = roles.find((r) => r.id === role_id) ?? null;
  const app = role ? apps.find((a) => a.id === role.app_id) ?? null : null;

  useEffect(() => {
    if (!open) return;
    set_role_id(null);
    set_user_ids([]);
    set_query("");
    set_error(null);
  }, [open]);

  useEffect(() => {
    if (!role) {
      set_user_ids([]);
      return;
    }
    set_user_ids([...role.user_ids]);
  }, [role]);

  const by_app = useMemo(
    () =>
      apps
        .map((item) => ({
          app: item,
          roles: roles.filter((r) => r.app_id === item.id),
        }))
        .filter((g) => g.roles.length > 0),
    [apps, roles],
  );

  const q = query.trim().toLowerCase();
  const visible_users = users.filter((u) => {
    if (u.activo === false) return false;
    if (!q) return true;
    return (
      u.nombre.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.departamento || "").toLowerCase().includes(q)
    );
  });

  function current_on_app(user: AccesoUsuarioListItem) {
    if (!app) return null;
    return user.assignments.find((a) => a.app_id === app.id) ?? null;
  }

  const overwrites = user_ids
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is AccesoUsuarioListItem => Boolean(u))
    .filter((u) => {
      const cur = current_on_app(u);
      return cur && role && cur.role_slug !== role.slug;
    });

  function toggle(id: number) {
    set_user_ids((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function save() {
    if (!role_id) {
      set_error("Elige un rol.");
      return;
    }
    set_saving(true);
    set_error(null);
    const result = await assign_role_to_users({
      role_id,
      usuario_ids: user_ids,
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
      title="Asignar rol a personas"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !role_id || user_ids.length === 0}
            onClick={() => void save()}
          >
            {saving
              ? "Guardando…"
              : `Asignar a ${user_ids.length} ${
                  user_ids.length === 1 ? "persona" : "personas"
                }`}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        Una persona tiene un solo rol por app. Si ya tiene otro en esa app, se
        reemplaza por este.
      </p>
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      {!role ? (
        <div className="space-y-6">
          {by_app.map(({ app: group_app, roles: app_roles }) => (
            <section key={group_app.id} className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AppGlyph
                  slug={group_app.slug}
                  className="h-4 w-4 text-indigo-700"
                />
                {group_app.nombre}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {app_roles.map((item) => (
                  <RoleFichaCard
                    key={item.id}
                    role={item}
                    permissions={permissions}
                    app_nombre={group_app.nombre}
                    selected={false}
                    onSelect={() => set_role_id(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-800"
            onClick={() => set_role_id(null)}
          >
            ← Cambiar rol
          </button>
          <p className="text-sm font-semibold text-slate-900">
            {app?.nombre} · {role.nombre}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-sm"
              placeholder="Buscar persona…"
              value={query}
              onChange={(e) => set_query(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set_user_ids(
                  users.filter((u) => u.activo !== false).map((u) => u.id),
                )
              }
            >
              Seleccionar todos
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => set_user_ids([])}
            >
              Ninguno
            </Button>
          </div>
          {overwrites.length > 0 ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {overwrites.length}{" "}
              {overwrites.length === 1 ? "persona cambia" : "personas cambian"}{" "}
              de rol en {app?.nombre}:{" "}
              {overwrites
                .slice(0, 6)
                .map((u) => u.nombre)
                .join(", ")}
              {overwrites.length > 6 ? "…" : ""}
            </p>
          ) : null}
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {visible_users.map((u) => {
              const cur = current_on_app(u);
              const checked = user_ids.includes(u.id);
              return (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggle(u.id)}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900">
                        {u.nombre}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {u.email || "Sin correo"}
                        {u.departamento ? ` · ${u.departamento}` : ""}
                        {cur
                          ? ` · hoy: ${cur.role_nombre}`
                          : " · sin rol en esta app"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AccesosModal>
  );
}
