"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoleGlyph } from "./catalog-glyphs";
import { RolePermissionsPreview } from "./role-permissions-preview";
import type { AccesoPermission, AccesoRole } from "../lib/types";

export function RoleView({
  app_id,
  app_nombre,
  role,
  permissions,
  back_href,
}: {
  app_id: number;
  app_nombre: string;
  role: AccesoRole;
  permissions: AccesoPermission[];
  back_href: string;
}) {
  const granted = permissions.filter((p) =>
    role.permission_slugs.includes(p.slug),
  );
  const edit_href = `/ted/usuarios/accesos/apps/${app_id}/roles/${role.id}/editar`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={back_href}
            className="inline-flex text-sm text-slate-500 hover:text-slate-800"
          >
            ← Volver a {app_nombre}
          </Link>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-sky-700">
            {app_nombre}
          </p>
          <div className="mt-1 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <RoleGlyph slug={role.slug} className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-semibold text-slate-900">
              {role.nombre}
            </h1>
          </div>
          <p className="font-mono text-xs text-slate-400">{role.slug}</p>
        </div>
        <Button type="button" asChild>
          <Link href={edit_href}>Editar</Link>
        </Button>
      </div>
      <p className="max-w-2xl text-base leading-relaxed text-slate-600">
        {role.descripcion || "Aún no hay una descripción de esta función."}
      </p>
      <RolePermissionsPreview granted={granted} />
      <p className="text-sm text-slate-500">
        {role.user_ids.length === 0
          ? "Nadie lo tiene asignado."
          : `${role.user_ids.length} ${
              role.user_ids.length === 1 ? "persona" : "personas"
            }: ${role.user_labels.join(", ")}${
              role.user_ids.length > role.user_labels.length ? "…" : ""
            }`}
      </p>
    </div>
  );
}
