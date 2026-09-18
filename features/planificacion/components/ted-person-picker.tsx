"use client";

import { cn } from "@/lib/utils";
import { user_initials, AVATAR_COLORS } from "../lib/display";
import type { PlanUsuarioOption } from "../lib/types";

export type PersonPick = number | "none" | null;

export function TedPersonPicker({
  usuarios,
  value,
  values,
  on_change,
  on_change_many,
  allow_none = false,
  none_label = "Sin asignar",
  multiple = false,
}: {
  usuarios: PlanUsuarioOption[];
  value?: PersonPick;
  values?: number[];
  on_change?: (next: PersonPick) => void;
  on_change_many?: (next: number[]) => void;
  allow_none?: boolean;
  none_label?: string;
  multiple?: boolean;
}) {
  const selected = new Set(values ?? []);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {allow_none ? (
        <button
          type="button"
          onClick={() => {
            if (multiple) {
              on_change_many?.([]);
              return;
            }
            on_change?.(value === "none" ? null : "none");
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition",
            (!multiple && value === "none") || (multiple && selected.size === 0)
              ? "border-violet-500 bg-violet-50 ring-2 ring-violet-300"
              : "border-slate-200 bg-white hover:border-slate-300",
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400">
            —
          </span>
          <span className="text-xs font-semibold text-slate-600">
            {none_label}
          </span>
        </button>
      ) : null}
      {usuarios.map((user) => {
        const active = multiple ? selected.has(user.id) : value === user.id;
        return (
          <button
            key={user.id}
            type="button"
            onClick={() => {
              if (multiple) {
                const next = new Set(selected);
                if (next.has(user.id)) next.delete(user.id);
                else next.add(user.id);
                on_change_many?.([...next]);
                return;
              }
              on_change?.(active ? null : user.id);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition",
              active
                ? "border-violet-500 bg-violet-50 ring-2 ring-violet-300"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                AVATAR_COLORS[user.id % AVATAR_COLORS.length],
              )}
            >
              {user_initials(user.label)}
            </span>
            <span className="min-w-0 truncate text-xs font-semibold text-slate-800">
              {user.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
