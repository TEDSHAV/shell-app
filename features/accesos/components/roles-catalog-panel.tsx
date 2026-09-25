"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoleFichaCard } from "./role-ficha-card";
import { AppGlyph } from "./catalog-glyphs";
import { AssignRolePeopleDialog } from "./assign-role-people-dialog";
import type {
  AccesoApp,
  AccesoPermission,
  AccesoRole,
  AccesoUsuarioListItem,
} from "../lib/types";

export function RolesCatalogPanel({
  apps,
  roles,
  permissions,
  users,
}: {
  apps: AccesoApp[];
  roles: AccesoRole[];
  permissions: AccesoPermission[];
  users: AccesoUsuarioListItem[];
}) {
  const router = useRouter();
  const [assign_open, set_assign_open] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button type="button" onClick={() => set_assign_open(true)}>
          Asignar a personas
        </Button>
      </div>
      {apps.map((app) => {
        const app_roles = roles.filter((r) => r.app_id === app.id);
        return (
          <section key={app.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <AppGlyph slug={app.slug} className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {app.nombre}
                  </h2>
                  <p className="font-mono text-xs text-slate-500">{app.slug}</p>
                </div>
              </div>
              <Link
                href={`/ted/usuarios/accesos/apps/${app.id}/roles/nuevo`}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Nuevo rol
              </Link>
            </div>
            {app_roles.length === 0 ? (
              <p className="text-sm text-slate-500">Sin roles en esta app.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {app_roles.map((role) => (
                  <RoleFichaCard
                    key={role.id}
                    role={role}
                    permissions={permissions}
                    app_nombre={app.nombre}
                    href_view={`/ted/usuarios/accesos/apps/${app.id}/roles/${role.id}`}
                    href_edit={`/ted/usuarios/accesos/apps/${app.id}/roles/${role.id}/editar`}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
      <AssignRolePeopleDialog
        open={assign_open}
        onClose={() => set_assign_open(false)}
        apps={apps}
        roles={roles}
        permissions={permissions}
        users={users}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
