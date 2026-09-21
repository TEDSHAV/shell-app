"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppFormDialog } from "./app-form-dialog";
import { AppGlyph, RoleGlyph } from "./catalog-glyphs";
import { RoleFichaCard } from "./role-ficha-card";
import { delete_acceso_role } from "../actions/catalog-actions";
import type { AccesoApp, AccesoPermission, AccesoRole } from "../lib/types";

export function AppsPanel({
  apps,
  roles,
  permissions,
  selected_app_id,
}: {
  apps: AccesoApp[];
  roles: AccesoRole[];
  permissions: AccesoPermission[];
  selected_app_id: number | null;
}) {
  const router = useRouter();
  const [form_open, set_form_open] = useState(false);
  const [editing_app, set_editing_app] = useState<AccesoApp | null>(null);
  const [error, set_error] = useState<string | null>(null);

  const selected = apps.find((a) => a.id === selected_app_id) ?? null;
  const app_roles = roles.filter((r) => r.app_id === selected_app_id);

  async function remove_role(role_id: number) {
    if (!confirm("¿Eliminar este rol? Solo si nadie lo tiene asignado.")) return;
    const result = await delete_acceso_role(role_id);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    set_error(null);
    router.refresh();
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/ted/usuarios/accesos?tab=aplicaciones">
            ← Aplicaciones
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <AppGlyph slug={selected.slug} className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{selected.nombre}</h2>
              <p className="text-xs text-slate-500">
                {selected.slug}
                {selected.descripcion ? ` · ${selected.descripcion}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                set_editing_app(selected);
                set_form_open(true);
              }}
            >
              Editar app
            </Button>
            <Button type="button" size="sm" asChild>
              <Link
                href={`/ted/usuarios/accesos/apps/${selected.id}/roles/nuevo`}
              >
                Crear rol
              </Link>
            </Button>
          </div>
        </div>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {app_roles.length === 0 ? (
            <p className="text-sm text-slate-500">Esta app aún no tiene roles.</p>
          ) : (
            app_roles.map((role) => (
              <div key={role.id} className="space-y-2">
                <RoleFichaCard
                  role={role}
                  permissions={permissions}
                  app_nombre={selected.nombre}
                  href_view={`/ted/usuarios/accesos/apps/${selected.id}/roles/${role.id}`}
                  href_edit={`/ted/usuarios/accesos/apps/${selected.id}/roles/${role.id}/editar`}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void remove_role(role.id)}
                  >
                    Eliminar rol
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <AppFormDialog
          open={form_open}
          app={editing_app}
          onClose={() => set_form_open(false)}
          onSaved={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            set_editing_app(null);
            set_form_open(true);
          }}
        >
          Nueva aplicación
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => {
          const preview_roles = roles.filter((r) => r.app_id === app.id);
          return (
            <Link
              key={app.id}
              href={`/ted/usuarios/accesos?tab=aplicaciones&app=${app.id}`}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-300 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <AppGlyph slug={app.slug} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{app.nombre}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {app.slug}
                  </p>
                </div>
              </div>
              {app.descripcion ? (
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {app.descripcion}
                </p>
              ) : null}
              <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {preview_roles.length === 0 ? (
                  <li className="text-xs text-slate-400">Sin roles definidos</li>
                ) : (
                  preview_roles.map((role) => (
                    <li key={role.id} className="flex gap-2">
                      <span className="mt-0.5 shrink-0 text-slate-500">
                        <RoleGlyph slug={role.slug} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {role.nombre}
                        </p>
                        {role.descripcion ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {role.descripcion}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-auto pt-3 text-xs text-slate-400">
                {app.role_count} roles · {app.user_count} usuarios
              </p>
            </Link>
          );
        })}
      </div>
      <AppFormDialog
        open={form_open}
        app={editing_app}
        onClose={() => set_form_open(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
