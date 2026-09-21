"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionMatrix } from "./permission-matrix";
import { PermissionFormDialog } from "./permission-form-dialog";
import {
  slugify_kebab,
  group_permissions_by_module,
  module_label,
  permission_related_to_app,
} from "../lib/slugs";
import { upsert_acceso_role } from "../actions/catalog-actions";
import type {
  AccesoAction,
  AccesoApp,
  AccesoModule,
  AccesoPermission,
  AccesoRole,
} from "../lib/types";

const STEPS = [
  { n: 1, label: "Datos del rol" },
  { n: 2, label: "Permisos" },
  { n: 3, label: "Revisar" },
] as const;

export function RoleEditor({
  app,
  role,
  permissions,
  roles,
  modules,
  actions,
  apps,
  back_href,
}: {
  app: AccesoApp;
  role: AccesoRole | null;
  permissions: AccesoPermission[];
  roles: AccesoRole[];
  modules: AccesoModule[];
  actions: AccesoAction[];
  apps: AccesoApp[];
  back_href: string;
}) {
  const router = useRouter();
  const app_id = app.id;
  const app_nombre = app.nombre;
  const existing_ids = useMemo(() => {
    if (!role) return [];
    return permissions
      .filter((p) => role.permission_slugs.includes(p.slug))
      .map((p) => p.id);
  }, [role, permissions]);

  const [step, set_step] = useState(1);
  const [nombre, set_nombre] = useState(role?.nombre ?? "");
  const [slug, set_slug] = useState(role?.slug ?? "");
  const [descripcion, set_descripcion] = useState(role?.descripcion ?? "");
  const [permission_ids, set_permission_ids] = useState<number[]>(existing_ids);
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const [slug_touched, set_slug_touched] = useState(Boolean(role));
  const [perm_open, set_perm_open] = useState(false);

  const scoped_permissions = useMemo(
    () =>
      permissions.filter((p) =>
        permission_related_to_app({
          slug: p.slug,
          id: p.id,
          app,
          roles,
          modules,
          keep_ids: permission_ids,
        }),
      ),
    [permissions, app, roles, modules, permission_ids],
  );

  const selected_perms = permissions.filter((p) => permission_ids.includes(p.id));
  const review_groups = group_permissions_by_module(selected_perms);

  async function save() {
    set_saving(true);
    set_error(null);
    const result = await upsert_acceso_role({
      id: role?.id,
      app_id,
      nombre,
      slug,
      descripcion: descripcion || null,
      permission_ids,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    router.push(back_href);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        href={back_href}
        className="inline-flex text-sm text-slate-500 hover:text-slate-800"
      >
        ← Volver a {app_nombre}
      </Link>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
          {app_nombre}
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {role ? `Editar rol · ${role.nombre}` : "Nuevo rol"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          El rol es la función en esta app (lider, coordinador). Los permisos
          van aquí; las personas se asignan después.
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-0">
        {STEPS.map((item, index) => {
          const active = step === item.n;
          const done = step > item.n;
          return (
            <li key={item.n} className="relative flex items-stretch">
              {index > 0 ? (
                <span
                  className={`absolute left-0 top-7 hidden h-0.5 w-3 -translate-x-1.5 sm:block ${
                    done || active ? "bg-indigo-400" : "bg-slate-200"
                  }`}
                />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (item.n === 1 || (nombre.trim() && slug.trim())) {
                    set_step(item.n);
                  }
                }}
                className={`ml-0 flex w-full flex-col rounded-2xl border px-4 py-3 text-left ${
                  active
                    ? "border-indigo-400 bg-indigo-50 shadow-sm"
                    : done
                      ? "border-indigo-100 bg-white"
                      : "border-slate-100 bg-slate-50"
                }`}
              >
                <span
                  className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    active || done
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {item.n}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <Label htmlFor="role-nombre">Nombre visible</Label>
            <Input
              id="role-nombre"
              value={nombre}
              onChange={(e) => {
                set_nombre(e.target.value);
                if (!slug_touched) set_slug(slugify_kebab(e.target.value));
              }}
              placeholder="Líder de Calidad"
            />
          </div>
          <div>
            <Label htmlFor="role-slug">Slug (función)</Label>
            <Input
              id="role-slug"
              value={slug}
              onChange={(e) => {
                set_slug_touched(true);
                set_slug(slugify_kebab(e.target.value));
              }}
              placeholder="lider"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Único dentro de {app_nombre}. Requisiciones busca lider y
              coordinador tal cual.
            </p>
          </div>
          <div>
            <Label htmlFor="role-desc">Para qué sirve este rol</Label>
            <Input
              id="role-desc"
              value={descripcion}
              onChange={(e) => set_descripcion(e.target.value)}
              placeholder="Lidera el área y aprueba las requisiciones del departamento."
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Describe la función, no la lista de permisos: esos cambian en el
              paso siguiente.
            </p>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-sm text-slate-600">
              Solo aparecen permisos de {app_nombre} (módulos de esta app o
              ya usados por sus roles). Marca lo que puede hacer este rol.
            </p>
            <Button type="button" variant="outline" onClick={() => set_perm_open(true)}>
              Nuevo permiso
            </Button>
          </div>
          {scoped_permissions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Esta app aún no tiene permisos relacionados. Crea el primero
              para colgarlo de este rol.
            </p>
          ) : (
            <PermissionMatrix
              permissions={scoped_permissions}
              selected_ids={permission_ids}
              onChange={set_permission_ids}
            />
          )}
          <PermissionFormDialog
            open={perm_open}
            onClose={() => set_perm_open(false)}
            apps={apps}
            modules={modules}
            actions={actions}
            locked_app={app}
            onSaved={(created) => {
              set_permission_ids((ids) =>
                ids.includes(created.id) ? ids : [...ids, created.id],
              );
              router.refresh();
            }}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <p className="text-lg font-semibold">{nombre || "Sin nombre"}</p>
            <p className="font-mono text-xs text-slate-500">{slug || "—"}</p>
            <p className="mt-2 text-sm text-slate-600">
              {descripcion || "Sin descripción"}
            </p>
          </div>
          <p className="text-sm font-medium">
            {selected_perms.length} permisos en {review_groups.length} módulos
          </p>
          {review_groups.length === 0 ? (
            <p className="text-sm text-amber-800">
              Este rol no tendrá ningún permiso hasta que marques alguno en el
              paso anterior.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {review_groups.map((g) => (
                <div key={g.module} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {module_label(g.module)}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {g.items.map((p) => (
                      <li key={p.id} className="text-[12px] text-slate-600">
                        <span className="block">{p.descripcion || p.slug}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {p.slug}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" asChild>
          <Link href={back_href}>Cancelar</Link>
        </Button>
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={() => set_step(step - 1)}>
            Atrás
          </Button>
        ) : null}
        {step < 3 ? (
          <Button
            type="button"
            disabled={step === 1 && (!nombre.trim() || !slug.trim())}
            onClick={() => set_step(step + 1)}
          >
            Siguiente
          </Button>
        ) : (
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar rol"}
          </Button>
        )}
      </div>
    </div>
  );
}
