"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, LayoutList, MoreHorizontal, UserPlus } from "lucide-react";

export function PlanWorkspaceHeader({
  tab,
  on_tab,
  select_mode,
  on_assign,
  on_new_app,
}: {
  tab: "lista" | "gantt";
  on_tab: (tab: "lista" | "gantt") => void;
  select_mode: boolean;
  on_assign: () => void;
  on_new_app: () => void;
}) {
  const [menu, set_menu] = useState(false);
  const tab_btn = "rounded-md px-3 py-1.5 text-sm font-medium";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Vista general
        </h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Apps, módulos y avance
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => on_tab("lista")}
            className={`${tab_btn} ${
              tab === "lista" ? "bg-slate-900 text-white" : "text-slate-500"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <LayoutList className="h-3.5 w-3.5" />
              Lista
            </span>
          </button>
          <button
            type="button"
            onClick={() => on_tab("gantt")}
            className={`${tab_btn} ${
              tab === "gantt" ? "bg-slate-900 text-white" : "text-slate-500"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5" />
              Roadmap
            </span>
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => set_menu((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="Más acciones"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu ? (
            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  set_menu(false);
                  on_assign();
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {select_mode ? "Asignando…" : "Asignar"}
              </button>
              <Link
                href="/ted/planificacion/importar"
                className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => set_menu(false)}
              >
                Cargar Excel
              </Link>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  set_menu(false);
                  on_new_app();
                }}
              >
                Nueva app
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
