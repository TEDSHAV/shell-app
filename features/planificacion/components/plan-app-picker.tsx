"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hex_to_rgba } from "@/lib/app-theme";
import { fold_label } from "../lib/excel-plan";
import { plan_app_visual } from "../lib/plan-app-visual";

export type PlanAppPickerItem = {
  id: number;
  nombre: string;
  slug: string;
};

function AppGlyph({
  slug,
  size = "md",
}: {
  slug: string | null;
  size?: "sm" | "md";
}) {
  const { Icon, brandColor } = plan_app_visual(slug);
  const box = size === "sm" ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-lg";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", box)}
      style={{ backgroundColor: hex_to_rgba(brandColor, 0.16) }}
    >
      <Icon className={icon} style={{ color: brandColor }} />
    </span>
  );
}

export function PlanAppPicker({
  apps,
  value,
  onChange,
}: {
  apps: PlanAppPickerItem[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, set_open] = useState(false);
  const [query, set_query] = useState("");
  const [menu, set_menu] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  const root_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);
  const selected = new Set(value);

  const needle = fold_label(query);
  const filtered = useMemo(
    () => apps.filter((app) => fold_label(app.nombre).includes(needle)),
    [apps, needle],
  );
  const chosen = apps.filter((app) => selected.has(app.id));

  function place() {
    const box = root_ref.current?.getBoundingClientRect();
    if (!box) return;
    const gap = 8;
    const space_below = window.innerHeight - box.bottom - gap;
    const space_above = box.top - gap;
    const maxHeight = Math.min(320, Math.max(space_below, space_above, 160) - 8);
    const open_up = space_below < 220 && space_above > space_below;
    set_menu({
      top: open_up ? box.top - gap - maxHeight : box.bottom + gap,
      left: box.left,
      width: box.width,
      maxHeight,
    });
  }

  useEffect(() => {
    if (!open) return;
    place();
    input_ref.current?.focus();
    function on_doc(event: MouseEvent) {
      const node = event.target as Node;
      if (root_ref.current?.contains(node)) return;
      const menu_el = document.getElementById("plan-app-picker-menu");
      if (menu_el?.contains(node)) return;
      set_open(false);
    }
    function on_reflow() {
      place();
    }
    document.addEventListener("mousedown", on_doc);
    window.addEventListener("resize", on_reflow);
    window.addEventListener("scroll", on_reflow, true);
    return () => {
      document.removeEventListener("mousedown", on_doc);
      window.removeEventListener("resize", on_reflow);
      window.removeEventListener("scroll", on_reflow, true);
    };
  }, [open]);

  function toggle(id: number) {
    if (selected.has(id)) onChange(value.filter((item) => item !== id));
    else onChange([...value, id]);
  }

  const menu_ui =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            id="plan-app-picker-menu"
            style={{
              top: menu.top,
              left: menu.left,
              width: menu.width,
              maxHeight: menu.maxHeight,
            }}
            className="fixed z-[80] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="relative shrink-0 border-b border-slate-100 p-2.5">
              <Search className="absolute left-5 top-5 h-4 w-4 text-slate-400" />
              <input
                ref={input_ref}
                type="text"
                value={query}
                onChange={(event) => set_query(event.target.value)}
                placeholder="Buscar app…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-violet-300 focus:bg-white"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              <button
                type="button"
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left",
                  value.length === 0 ? "bg-slate-50" : "hover:bg-slate-50",
                )}
                onClick={() => onChange([])}
              >
                <AppGlyph slug={null} />
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                  Transversal
                </span>
                <Check
                  className="h-4 w-4 shrink-0"
                  style={{ color: value.length === 0 ? "#64748b" : "transparent" }}
                />
              </button>
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-slate-400">
                  Sin coincidencias
                </p>
              ) : (
                filtered.map((app) => {
                  const active = selected.has(app.id);
                  const { brandColor } = plan_app_visual(app.slug);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left",
                        active ? "bg-slate-50" : "hover:bg-slate-50",
                      )}
                      onClick={() => toggle(app.id)}
                    >
                      <AppGlyph slug={app.slug} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                        {app.nombre}
                      </span>
                      <Check
                        className="h-4 w-4 shrink-0"
                        style={{ color: active ? brandColor : "transparent" }}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={root_ref}>
      <button
        type="button"
        onClick={() => {
          set_query("");
          set_open((prev) => !prev);
        }}
        className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:border-violet-200"
      >
        {chosen.length === 0 ? (
          <>
            <AppGlyph slug={null} />
            <span className="min-w-0 flex-1 text-sm font-medium text-slate-500">
              Transversal
            </span>
          </>
        ) : (
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {chosen.map((app) => (
              <span
                key={app.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-0.5 pl-0.5 pr-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200"
              >
                <AppGlyph slug={app.slug} size="sm" />
                {app.nombre}
                <span
                  role="button"
                  tabIndex={0}
                  className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(app.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      toggle(app.id);
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))}
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {menu_ui}
    </div>
  );
}
