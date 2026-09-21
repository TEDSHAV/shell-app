"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PersonasList, UsuarioFichaPanel } from "./personas-panel";
import { AppsPanel } from "./apps-panel";
import { PermissionsPanel } from "./permissions-panel";
import { RolesCatalogPanel } from "./roles-catalog-panel";
import type { AccesoCatalog, AccesoUsuarioFicha } from "../lib/types";

export type AccesosTab = "personas" | "aplicaciones" | "roles" | "permisos";

const TABS: Array<{ id: AccesosTab; label: string }> = [
  { id: "personas", label: "Personas" },
  { id: "aplicaciones", label: "Aplicaciones" },
  { id: "roles", label: "Roles" },
  { id: "permisos", label: "Permisos" },
];

export function AccesosWorkspace({
  catalog,
  ficha,
  tab,
  selected_app_id,
}: {
  catalog: AccesoCatalog;
  ficha: AccesoUsuarioFicha | null;
  tab: AccesosTab;
  selected_app_id: number | null;
}) {
  const router = useRouter();
  const [query, set_query] = useState("");

  const users_sorted = useMemo(
    () =>
      [...catalog.users].sort((a, b) => {
        if (b.app_count !== a.app_count) return b.app_count - a.app_count;
        return a.nombre.localeCompare(b.nombre);
      }),
    [catalog.users],
  );

  function go(next: AccesosTab) {
    if (next === "aplicaciones" && selected_app_id) {
      router.push(`/ted/usuarios/accesos?tab=aplicaciones&app=${selected_app_id}`);
      return;
    }
    router.push(`/ted/usuarios/accesos?tab=${next}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
              tab === item.id
                ? "border-sky-300 bg-white text-sky-900 shadow-sm"
                : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            onClick={() => go(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "personas" ? (
        ficha ? (
          <UsuarioFichaPanel
            ficha={ficha}
            apps={catalog.apps}
            onBack={() => router.push("/ted/usuarios/accesos?tab=personas")}
          />
        ) : (
          <PersonasList
            users={users_sorted}
            query={query}
            onQuery={set_query}
            onOpen={(id) =>
              router.push(`/ted/usuarios/accesos?tab=personas&usuario=${id}`)
            }
          />
        )
      ) : null}

      {tab === "aplicaciones" ? (
        <AppsPanel
          apps={catalog.apps}
          roles={catalog.roles}
          permissions={catalog.permissions}
          selected_app_id={selected_app_id}
        />
      ) : null}

      {tab === "roles" ? (
        <RolesCatalogPanel
          apps={catalog.apps}
          roles={catalog.roles}
          permissions={catalog.permissions}
        />
      ) : null}

      {tab === "permisos" ? (
        <PermissionsPanel
          permissions={catalog.permissions}
          apps={catalog.apps}
          roles={catalog.roles}
        />
      ) : null}
    </div>
  );
}
