"use client";

import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_TIME_FILTER,
  PERIOD_OPTIONS,
  format_period_range,
  period_label,
  resolve_period_bounds,
  time_filter_summary,
  type PeriodKind,
  type TimeFilterValue,
} from "@/lib/list-time-period";

const trigger_class =
  "h-8 gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm transition-all duration-300 ease-out hover:bg-slate-50";

export function TimeFilterControl({
  value,
  on_change,
}: {
  value: TimeFilterValue;
  on_change: (next: TimeFilterValue) => void;
}) {
  const filtered = value.seleccion !== "todos";
  const bounds = resolve_period_bounds(value);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              trigger_class,
              filtered && "border-violet-300 bg-violet-50 text-violet-900",
            )}
          >
            <Clock3 className="h-3.5 w-3.5 text-violet-600" />
            <span className="max-w-[160px] truncate">
              {filtered ? time_filter_summary(value) : "Tiempo"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem
            onClick={() => on_change(DEFAULT_TIME_FILTER)}
          >
            Todo el historial
          </DropdownMenuItem>
          {PERIOD_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() =>
                on_change({
                  seleccion: "periodo",
                  periodo: option.value,
                  offset: 0,
                })
              }
            >
              {option.label}
              {value.seleccion === "periodo" &&
              value.periodo === option.value
                ? " ·"
                : ""}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        className={cn(
          "grid transition-[grid-template-columns,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          filtered && bounds
            ? "grid-cols-[1fr] opacity-100"
            : "grid-cols-[0fr] opacity-0",
        )}
      >
        <div className="min-w-0 overflow-hidden">
          {bounds ? (
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-0.5 shadow-sm">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-slate-50"
                aria-label="Período anterior"
                onClick={() => on_change({ ...value, offset: value.offset - 1 })}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 px-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {period_label(value.periodo as PeriodKind)}
                  {value.offset === 0 ? " · actual" : ""}
                </p>
                <p className="truncate text-[11px] font-medium text-slate-800">
                  {format_period_range(bounds.start, bounds.end)}
                </p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-slate-50 disabled:opacity-30"
                aria-label="Período siguiente"
                disabled={value.offset >= 0}
                onClick={() =>
                  on_change({ ...value, offset: Math.min(0, value.offset + 1) })
                }
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
