"use client";

import { cn } from "@/lib/utils";

type TriStateCheckboxProps = {
  state: "checked" | "unchecked" | "indeterminate";
  onToggle: () => void;
};

export function TriStateCheckbox({ state, onToggle }: TriStateCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "indeterminate" ? "mixed" : state === "checked"}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        state === "checked"
          ? "border-indigo-600 bg-indigo-600 text-white"
          : state === "indeterminate"
            ? "border-indigo-400 bg-indigo-100 text-indigo-700"
            : "border-border bg-background",
      )}
    >
      {state === "checked" ? (
        <span className="text-[10px] leading-none">✓</span>
      ) : state === "indeterminate" ? (
        <span className="text-[10px] leading-none">−</span>
      ) : null}
    </button>
  );
}
