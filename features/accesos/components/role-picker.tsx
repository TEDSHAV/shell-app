"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RoleFichaCard } from "./role-ficha-card";
import { assign_user_app_role } from "../actions/assign-actions";
import type {
  AccesoApp,
  AccesoPermission,
  AccesoRole,
  AccesoUsuarioFicha,
} from "../lib/types";

export function RolePicker({
  ficha,
  app,
  roles,
  permissions,
  current_role_id,
}: {
  ficha: AccesoUsuarioFicha;
  app: AccesoApp;
  roles: AccesoRole[];
  permissions: AccesoPermission[];
  current_role_id: number | null;
}) {
  const router = useRouter();
  const [selected_id, set_selected_id] = useState<number | null>(
    current_role_id,
  );
  const [error, set_error] = useState<string | null>(null);
  const [busy, set_busy] = useState(false);
  const back = `/ted/usuarios/accesos?usuario=${ficha.id}`;
  const chosen = roles.find((r) => r.id === selected_id) ?? null;

  async function confirm() {
    if (!selected_id) return;
    set_busy(true);
    set_error(null);
    const result = await assign_user_app_role({
      usuario_id: ficha.id,
      app_id: app.id,
      role_id: selected_id,
    });
    set_busy(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    router.push(back);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        href={back}
        className="inline-flex text-sm text-slate-500 hover:text-slate-800"
      >
        ← Volver a {ficha.nombre}
      </Link>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
          {app.nombre}
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Elegir rol para {ficha.nombre}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Un solo rol por aplicación. Lee para qué sirve cada función antes de
          asignarla.
        </p>
      </div>

      {roles.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {app.nombre} todavía no tiene roles. Créalos en Aplicaciones.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <RoleFichaCard
              key={role.id}
              role={role}
              permissions={permissions}
              app_nombre={app.nombre}
              current={role.id === current_role_id}
              selected={role.id === selected_id}
              onSelect={() => set_selected_id(role.id)}
            />
          ))}
        </div>
      )}

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-2 py-4 backdrop-blur">
        {chosen ? (
          <p className="mr-auto text-sm text-slate-700">
            Asignar <span className="font-semibold">{chosen.nombre}</span> en{" "}
            {app.nombre}
          </p>
        ) : (
          <p className="mr-auto text-sm text-slate-500">
            Elige una ficha para ver qué hace ese rol.
          </p>
        )}
        <Button type="button" variant="outline" asChild>
          <Link href={back}>Cancelar</Link>
        </Button>
        <Button
          type="button"
          disabled={busy || !selected_id || selected_id === current_role_id}
          onClick={() => void confirm()}
        >
          {busy
            ? "Guardando…"
            : chosen
              ? `Asignar ${chosen.nombre}`
              : "Asignar este rol"}
        </Button>
      </div>
    </div>
  );
}
