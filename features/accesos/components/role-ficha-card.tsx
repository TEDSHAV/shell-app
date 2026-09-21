"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { RoleGlyph } from "./catalog-glyphs";
import { RolePermissionsPreview } from "./role-permissions-preview";
import type { AccesoPermission, AccesoRole } from "../lib/types";

export function RoleFichaCard({
  role,
  permissions,
  app_nombre,
  selected,
  current,
  onSelect,
  href_view,
  href_edit,
}: {
  role: AccesoRole;
  permissions: AccesoPermission[];
  app_nombre?: string;
  selected?: boolean;
  current?: boolean;
  onSelect?: () => void;
  href_view?: string;
  href_edit?: string;
}) {
  const granted = permissions.filter((p) =>
    role.permission_slugs.includes(p.slug),
  );

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 pr-16">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <RoleGlyph slug={role.slug} className="h-4 w-4" />
          </span>
          <div>
            {app_nombre ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                {app_nombre}
              </p>
            ) : null}
            <p className="text-base font-semibold text-slate-900">
              {role.nombre}
            </p>
            <p className="font-mono text-[10px] text-slate-400">{role.slug}</p>
          </div>
        </div>
        {current ? (
          <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            Actual
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {role.descripcion || "Aún no hay una descripción de esta función."}
      </p>
      <RolePermissionsPreview granted={granted} compact />
      {role.user_labels.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          {role.user_ids.length}{" "}
          {role.user_ids.length === 1 ? "persona" : "personas"} ·{" "}
          {role.user_labels.join(", ")}
          {role.user_ids.length > role.user_labels.length ? "…" : ""}
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Nadie lo tiene asignado</p>
      )}
    </>
  );

  const ring = selected
    ? "border-indigo-400 ring-2 ring-indigo-200 shadow-sm"
    : "border-slate-200 hover:border-indigo-300 hover:shadow-sm";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`relative w-full rounded-2xl border bg-white p-5 text-left transition ${ring}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <article className={`relative rounded-2xl border bg-white p-5 ${ring}`}>
      {href_view ? (
        <Link
          href={href_view}
          className="absolute inset-0 z-0 rounded-2xl"
          aria-label={`Ver ${role.nombre}`}
        />
      ) : null}
      {href_edit ? (
        <Link
          href={href_edit}
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-800"
        >
          <Pencil className="h-3 w-3" />
          Editar
        </Link>
      ) : null}
      <div className="relative z-0 pointer-events-none">{inner}</div>
    </article>
  );
}
