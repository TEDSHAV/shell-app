"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  collect_resource_usages,
  permission_module,
  slugify_kebab,
  type ResourceUsage,
} from "../lib/slugs";
import type { AccesoApp, AccesoPermission, AccesoRole } from "../lib/types";

function usage_in_module(row: ResourceUsage, modulo: string) {
  if (!modulo) return true;
  return row.permissions.some((p) => permission_module(p.slug) === modulo);
}

function ContextLines({ row }: { row: ResourceUsage }) {
  const apps = row.app_names.slice(0, 4);
  const roles = row.role_labels.slice(0, 4);
  const perms = row.permissions.slice(0, 4);
  return (
    <div className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-slate-500">
      <p>
        <span className="font-medium text-slate-600">App: </span>
        {apps.length ? apps.join(", ") : "Sin app aún"}
        {row.app_names.length > apps.length ? "…" : ""}
      </p>
      <p>
        <span className="font-medium text-slate-600">Rol: </span>
        {roles.length ? roles.join(", ") : "Aún no cuelga de un rol"}
        {row.role_labels.length > roles.length ? "…" : ""}
      </p>
      <p>
        <span className="font-medium text-slate-600">Permiso: </span>
        {perms
          .map((p) => p.descripcion || p.slug)
          .join(" · ")}
        {row.permissions.length > perms.length ? "…" : ""}
      </p>
    </div>
  );
}

export function PermissionResourcePicker({
  modulo,
  recurso,
  permissions,
  roles,
  apps,
  onChange,
}: {
  modulo: string;
  recurso: string;
  permissions: AccesoPermission[];
  roles: AccesoRole[];
  apps: AccesoApp[];
  onChange: (slug: string) => void;
}) {
  const [query, set_query] = useState("");
  const usages = useMemo(
    () => collect_resource_usages({ permissions, roles, apps }),
    [permissions, roles, apps],
  );

  const typed = slugify_kebab(query);
  const selected = usages.find((u) => u.slug === recurso) ?? null;

  const matches = useMemo(() => {
    const q = (query.trim() || recurso).toLowerCase();
    const filtered = usages.filter((row) => {
      if (!q) return usage_in_module(row, modulo);
      const hay = [
        row.slug,
        ...row.app_names,
        ...row.role_labels,
        ...row.permissions.map((p) => `${p.slug} ${p.descripcion || ""}`),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    return filtered
      .sort((a, b) => {
        const am = usage_in_module(a, modulo) ? 0 : 1;
        const bm = usage_in_module(b, modulo) ? 0 : 1;
        if (am !== bm) return am - bm;
        return a.slug.localeCompare(b.slug);
      })
      .slice(0, 8);
  }, [usages, query, recurso, modulo]);

  const exact = Boolean(typed && usages.some((u) => u.slug === typed));
  const can_create = Boolean(typed && !exact);

  return (
    <div>
      <Label htmlFor="perm-rec">Recurso (opcional)</Label>
      <p className="mb-1 text-xs text-slate-500">
        Elige uno que ya exista para no duplicar (solicitud vs solicitar). Vacío
        = todo el módulo.
      </p>
      <Input
        id="perm-rec"
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          set_query(next);
          onChange(slugify_kebab(next));
        }}
        placeholder="Buscar o crear: ecc, solicitud…"
      />
      <div className="mt-2 space-y-1.5">
        <button
          type="button"
          onClick={() => {
            set_query("");
            onChange("");
          }}
          className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
            !recurso
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-200 hover:border-indigo-300"
          }`}
        >
          Sin recurso — el permiso cubre el módulo entero
        </button>
        {matches.map((row) => (
          <button
            key={row.slug}
            type="button"
            onClick={() => {
              set_query(row.slug);
              onChange(row.slug);
            }}
            className={`w-full rounded-xl border px-3 py-2 text-left ${
              recurso === row.slug
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200 hover:border-indigo-300"
            }`}
          >
            <p className="font-mono text-sm font-semibold text-slate-900">
              {row.slug}
            </p>
            <ContextLines row={row} />
          </button>
        ))}
        {can_create ? (
          <button
            type="button"
            onClick={() => {
              set_query(typed);
              onChange(typed);
            }}
            className={`w-full rounded-xl border border-dashed px-3 py-2 text-left text-sm ${
              recurso === typed && !exact
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-300"
            }`}
          >
            Crear recurso <span className="font-mono">{typed}</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Aún no se usa en ningún permiso.
            </span>
          </button>
        ) : null}
      </div>
      {selected && recurso === selected.slug ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Ya se usa en {selected.permissions.length}{" "}
          {selected.permissions.length === 1 ? "permiso" : "permisos"}.
        </p>
      ) : null}
    </div>
  );
}
