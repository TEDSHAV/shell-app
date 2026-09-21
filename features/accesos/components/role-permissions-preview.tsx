"use client";

import { Check } from "lucide-react";
import { group_permissions_by_module, module_label } from "../lib/slugs";
import { ModuleGlyph } from "./module-glyph";
import { PermissionLine } from "./permission-line";
import type { AccesoPermission } from "../lib/types";

export function RolePermissionsPreview({
  granted,
  compact,
}: {
  granted: AccesoPermission[];
  compact?: boolean;
}) {
  const groups = group_permissions_by_module(granted);
  if (groups.length === 0) {
    return (
      <p className="mt-4 text-xs text-slate-400">
        Todavía no hay permisos colgados en este rol.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Permisos configurados
      </p>
      <div
        className={
          compact
            ? "max-h-[22rem] [column-fill:auto] columns-1 sm:columns-2 gap-2 overflow-hidden"
            : "columns-1 sm:columns-2 gap-3"
        }
      >
        {groups.map((group) => (
          <div
            key={group.module}
            className="mb-2 break-inside-avoid rounded-xl border border-slate-100 bg-slate-50/80 p-3"
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm">
                <ModuleGlyph module={group.module} />
              </span>
              {module_label(group.module)}
            </p>
            <ul className="space-y-1.5">
              {group.items.map((perm) => (
                <li key={perm.id} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <PermissionLine
                    slug={perm.slug}
                    descripcion={perm.descripcion}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
