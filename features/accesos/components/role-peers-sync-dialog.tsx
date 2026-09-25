"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccesosModal } from "./accesos-modal";
import { RoleGlyph } from "./catalog-glyphs";
import { apply_permission_delta_to_roles } from "../actions/catalog-actions";
import type { AccesoPermission, AccesoRole } from "../lib/types";

export function RolePeersSyncDialog({
  open,
  onDone,
  peers,
  permissions,
  added_ids,
  removed_ids,
}: {
  open: boolean;
  onDone: () => void;
  peers: AccesoRole[];
  permissions: AccesoPermission[];
  added_ids: number[];
  removed_ids: number[];
}) {
  const [selected, set_selected] = useState<number[]>([]);
  const [saving, set_saving] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    set_selected(peers.map((p) => p.id));
    set_error(null);
  }, [open, peers]);

  const added = permissions.filter((p) => added_ids.includes(p.id));
  const removed = permissions.filter((p) => removed_ids.includes(p.id));

  function toggle(id: number) {
    set_selected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function apply() {
    if (selected.length === 0) {
      onDone();
      return;
    }
    set_saving(true);
    set_error(null);
    const result = await apply_permission_delta_to_roles({
      role_ids: selected,
      add_permission_ids: added_ids,
      remove_permission_ids: removed_ids,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    onDone();
  }

  return (
    <AccesosModal
      open={open}
      title="Otros roles comparten permisos"
      onClose={onDone}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
            Solo este rol
          </Button>
          <Button
            type="button"
            disabled={saving || selected.length === 0}
            onClick={() => void apply()}
          >
            {saving ? "Actualizando…" : "Actualizar seleccionados"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Guardaste cambios en este rol. Estos otros de la misma app coinciden
          en al menos un permiso. Puedes aplicar el mismo delta (altas y bajas)
          o dejarlos como están.
        </p>

        {(added.length > 0 || removed.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {added.length > 0 ? (
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Se añaden
                </p>
                <ul className="mt-1 space-y-0.5">
                  {added.map((p) => (
                    <li key={p.id} className="text-[12px] text-emerald-900">
                      {p.descripcion || p.slug}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {removed.length > 0 ? (
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Se quitan
                </p>
                <ul className="mt-1 space-y-0.5">
                  {removed.map((p) => (
                    <li key={p.id} className="text-[12px] text-amber-900">
                      {p.descripcion || p.slug}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        <ul className="space-y-2">
          {peers.map((role) => (
            <li key={role.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-indigo-200">
                <Checkbox
                  className="mt-1"
                  checked={selected.includes(role.id)}
                  onCheckedChange={() => toggle(role.id)}
                />
                <span className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <RoleGlyph slug={role.slug} className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      {role.nombre}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {role.slug}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {role.permission_slugs.length} permiso
                      {role.permission_slugs.length === 1 ? "" : "s"} hoy
                    </span>
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </AccesosModal>
  );
}
