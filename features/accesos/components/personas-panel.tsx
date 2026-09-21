"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Briefcase, Mail } from "lucide-react";
import { revoke_user_app_role } from "../actions/assign-actions";
import { AppGlyph, RoleGlyph } from "./catalog-glyphs";
import { group_permissions_by_module, module_label } from "../lib/slugs";
import type {
  AccesoApp,
  AccesoUsuarioFicha,
  AccesoUsuarioListItem,
} from "../lib/types";

function initials(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function UsuarioFichaPanel({
  ficha,
  apps,
  onBack,
}: {
  ficha: AccesoUsuarioFicha;
  apps: AccesoApp[];
  onBack: () => void;
}) {
  const router = useRouter();
  const assigned_app_ids = new Set(ficha.apps.map((a) => a.app_id));
  const available_apps = apps.filter((a) => !assigned_app_ids.has(a.id));
  const [app_id, set_app_id] = useState<string>("");
  const [error, set_error] = useState<string | null>(null);
  const [busy, set_busy] = useState(false);

  async function revoke(target_app_id: number) {
    if (!confirm("¿Quitar el acceso a esta aplicación?")) return;
    set_busy(true);
    set_error(null);
    const result = await revoke_user_app_role({
      usuario_id: ficha.id,
      app_id: target_app_id,
    });
    set_busy(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        ← Personas
      </Button>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-800">
          {initials(ficha.nombre)}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {ficha.nombre}
            {ficha.activo === false ? (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                Inactivo
              </span>
            ) : null}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            {ficha.email || "Sin correo"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            {ficha.departamento || "Sin departamento"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
            {ficha.cargo || "Sin cargo"}
          </p>
        </div>
      </div>
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="space-y-3">
        {ficha.apps.length === 0 ? (
          <p className="text-sm text-slate-500">Sin aplicaciones asignadas.</p>
        ) : (
          ficha.apps.map((item) => {
            const modules = group_permissions_by_module(
              item.permission_slugs.map((slug) => ({ slug })),
            );
            return (
            <div
              key={item.app_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    <AppGlyph slug={item.app_slug} className="h-4 w-4 text-indigo-700" />
                    {item.app_nombre}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-800">
                    <RoleGlyph slug={item.role_slug} className="h-3.5 w-3.5 text-slate-500" />
                    {item.role_nombre}
                  </p>
                  {item.role_descripcion ? (
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                      {item.role_descripcion}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" asChild>
                    <Link
                      href={`/ted/usuarios/accesos/usuario/${ficha.id}/app/${item.app_id}`}
                    >
                      Cambiar rol
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void revoke(item.app_id)}
                  >
                    Revocar
                  </Button>
                </div>
              </div>
              {modules.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {modules.map((g) => (
                    <span
                      key={g.module}
                      className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800"
                    >
                      {module_label(g.module)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            );
          })
        )}
      </div>

      {available_apps.length > 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-4 space-y-3">
          <p className="text-sm font-medium">Asignar aplicación</p>
          <div>
            <Label>App</Label>
            <Select value={app_id} onValueChange={set_app_id}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir app" />
              </SelectTrigger>
              <SelectContent>
                {available_apps.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={!app_id} asChild={Boolean(app_id)}>
            {app_id ? (
              <Link href={`/ted/usuarios/accesos/usuario/${ficha.id}/app/${app_id}`}>
                Ver roles y asignar
              </Link>
            ) : (
              <span>Ver roles y asignar</span>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Ya tiene rol en todas las apps.
        </p>
      )}
    </div>
  );
}

export function PersonasList({
  users,
  query,
  onQuery,
  onOpen,
}: {
  users: AccesoUsuarioListItem[];
  query: string;
  onQuery: (q: string) => void;
  onOpen: (id: number) => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (!q) return true;
    const haystack = [
      u.nombre,
      u.email || "",
      u.cargo || "",
      u.departamento || "",
      ...u.assignments.flatMap((a) => [a.app_nombre, a.role_nombre]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar persona, cargo, app o rol…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="hidden grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.4fr)] gap-4 bg-slate-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
          <span>Identidad</span>
          <span>Acceso en el sistema</span>
        </div>
        <ul>
          {filtered.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onOpen(u.id)}
                className="grid w-full grid-cols-1 gap-4 border-t border-slate-100 px-5 py-5 text-left hover:bg-slate-50 lg:grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.4fr)]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-800">
                    {initials(u.nombre)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900">
                      {u.nombre}
                      {u.activo === false ? (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                          Inactivo
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {u.email || "Sin correo"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {u.departamento || "Sin departamento"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {u.cargo || "Sin cargo"}
                    </p>
                  </div>
                </div>
                <div>
                  {u.assignments.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Sin rol en ninguna aplicación
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {u.assignments.map((a) => (
                        <div
                          key={`${a.app_id}-${a.role_slug}`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                        >
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                            <AppGlyph
                              slug={a.app_slug}
                              className="h-3.5 w-3.5"
                            />
                            {a.app_nombre}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900">
                            <RoleGlyph
                              slug={a.role_slug}
                              className="h-3.5 w-3.5 text-slate-500"
                            />
                            {a.role_nombre}
                          </p>
                          {a.role_descripcion ? (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {a.role_descripcion}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
