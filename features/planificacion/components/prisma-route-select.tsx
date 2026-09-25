"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fold_label } from "../lib/excel-plan";
import {
  find_prisma_view_route,
  list_prisma_view_routes,
  type PrismaViewRoute,
} from "../lib/prisma-routes";
import { PLAN_INPUT_CLASS } from "./plan-form-ui";

function route_search_blob(route: PrismaViewRoute): string {
  return fold_label(
    [
      route.app_name,
      route.group_label ?? "",
      route.label,
      route.path,
      route.frame_path ?? "",
    ].join(" "),
  );
}

export function PrismaRouteSelect({
  value,
  on_change,
  id,
}: {
  value: string;
  on_change: (next: string) => void;
  id?: string;
}) {
  const routes = useMemo(() => list_prisma_view_routes(), []);
  const [open, set_open] = useState(false);
  const [query, set_query] = useState("");
  const root_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);

  const selected =
    find_prisma_view_route(value) ??
    (value.trim()
      ? ({
          path: value,
          label: value,
          app_id: "",
          app_name: "Ruta libre",
          group_label: null,
          frame_path: null,
          upstream_url: null,
        } satisfies PrismaViewRoute)
      : null);

  const needle = fold_label(query);
  const filtered = useMemo(() => {
    if (!needle) return routes;
    return routes.filter((route) => route_search_blob(route).includes(needle));
  }, [routes, needle]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, PrismaViewRoute[]>();
    for (const route of filtered) {
      const key = route.app_name;
      const list = map.get(key);
      if (list) list.push(route);
      else {
        map.set(key, [route]);
        order.push(key);
      }
    }
    return order.map((app_name) => ({
      app_name,
      items: map.get(app_name) ?? [],
    }));
  }, [filtered]);

  useEffect(() => {
    function on_doc(event: MouseEvent) {
      if (!root_ref.current?.contains(event.target as Node)) {
        set_open(false);
      }
    }
    document.addEventListener("mousedown", on_doc);
    return () => document.removeEventListener("mousedown", on_doc);
  }, []);

  useEffect(() => {
    if (open) {
      set_query("");
      input_ref.current?.focus();
    }
  }, [open]);

  return (
    <div className="relative" ref={root_ref}>
      <button
        id={id}
        type="button"
        onClick={() => set_open((prev) => !prev)}
        className={cn(
          PLAN_INPUT_CLASS,
          "flex h-10 w-full items-center justify-between gap-2 text-left",
        )}
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-sm font-medium text-slate-800">
                {selected.label}
              </span>
              <span className="block truncate text-[11px] text-slate-400">
                {selected.app_name}
                {selected.group_label ? ` · ${selected.group_label}` : ""}
                {" · "}
                {selected.path}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">
              Buscar ruta del sidebar…
            </span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={input_ref}
              type="text"
              value={query}
              onChange={(event) => set_query(event.target.value)}
              placeholder="App, menú, ruta…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-violet-400 focus:bg-white"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                Sin coincidencias en el sidebar
              </p>
            ) : (
              groups.map((block) => (
                <div key={block.app_name}>
                  <p className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {block.app_name}
                  </p>
                  {block.items.map((route) => {
                    const active = route.path === selected?.path;
                    return (
                      <button
                        key={`${route.app_id}-${route.path}`}
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-violet-50/80",
                          active && "bg-violet-50",
                        )}
                        onClick={() => {
                          on_change(route.path);
                          set_open(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mt-0.5 h-3.5 w-3.5 shrink-0",
                            active ? "text-violet-600" : "text-transparent",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {route.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                            {route.group_label
                              ? `${route.group_label} · `
                              : ""}
                            <span className="font-mono text-slate-400">
                              {route.path}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          {value.trim() && !find_prisma_view_route(value) ? (
            <div className="border-t border-slate-100 px-3 py-2">
              <p className="text-[11px] text-slate-400">
                Ruta libre actual:{" "}
                <span className="font-mono text-slate-600">{value}</span>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
