"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type ObjetivoOrdenItem = {
  key: string;
  titulo: string;
};

export function ObjetivoOrdenMini({
  items,
  onReorder,
}: {
  items: ObjetivoOrdenItem[];
  onReorder: (from: number, to: number) => void;
}) {
  const [drag_from, set_drag_from] = useState<number | null>(null);
  const [over, set_over] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Orden cronológico
      </p>
      <p className="mb-2 px-1 text-xs text-slate-400">
        Arrastra el agarre o usa las flechas para subir y bajar.
      </p>
      <ol className="space-y-1">
        {items.map((item, index) => (
          <li
            key={item.key}
            onDragOver={(event) => {
              event.preventDefault();
              set_over(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const from = Number(event.dataTransfer.getData("text/plain"));
              if (Number.isInteger(from)) onReorder(from, index);
              set_drag_from(null);
              set_over(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 ring-1 ring-slate-200",
              over === index && drag_from !== null ? "ring-violet-400" : "",
              drag_from === index ? "opacity-60" : "",
            )}
          >
            <button
              type="button"
              draggable
              aria-label={`Arrastrar objetivo ${index + 1}`}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", String(index));
                event.dataTransfer.effectAllowed = "move";
                set_drag_from(index);
              }}
              onDragEnd={() => {
                set_drag_from(null);
                set_over(null);
              }}
              className="inline-flex h-8 w-7 cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-violet-700">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
              {item.titulo.trim() || "Sin título"}
            </span>
            <div className="flex shrink-0">
              <button
                type="button"
                aria-label="Subir"
                disabled={index === 0}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                onClick={() => onReorder(index, index - 1)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Bajar"
                disabled={index === items.length - 1}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                onClick={() => onReorder(index, index + 1)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
