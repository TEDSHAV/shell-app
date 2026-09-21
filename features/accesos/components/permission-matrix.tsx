"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { group_permissions_by_module, module_label } from "../lib/slugs";
import { ModuleGlyph } from "./module-glyph";
import type { AccesoPermission } from "../lib/types";

export function PermissionMatrix({
  permissions,
  selected_ids,
  onChange,
}: {
  permissions: AccesoPermission[];
  selected_ids: number[];
  onChange: (ids: number[]) => void;
}) {
  const selected = new Set(selected_ids);
  const groups = group_permissions_by_module(permissions);

  function toggle(id: number, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  }

  function toggle_module(ids: number[], all: boolean) {
    const next = new Set(selected);
    for (const id of ids) {
      if (all) next.add(id);
      else next.delete(id);
    }
    onChange([...next]);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((group) => {
        const ids = group.items.map((p) => p.id);
        const all_on = ids.every((id) => selected.has(id));
        return (
          <div
            key={group.module}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <ModuleGlyph module={group.module} />
                </span>
                {module_label(group.module)}
              </p>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Checkbox
                  checked={all_on}
                  onCheckedChange={(v) => toggle_module(ids, v === true)}
                />
                Todo
              </label>
            </div>
            <ul className="space-y-1.5">
              {group.items.map((perm) => (
                <li key={perm.id}>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.has(perm.id)}
                      onCheckedChange={(v) => toggle(perm.id, v === true)}
                    />
                    <span className="leading-snug text-slate-700">
                      <span className="block">
                        {perm.descripcion || perm.slug}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {perm.slug}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
