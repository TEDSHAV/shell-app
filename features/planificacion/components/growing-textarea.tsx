"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PLAN_INPUT_CLASS } from "./plan-form-ui";

export function GrowingTextarea({
  id,
  value,
  onChange,
  placeholder,
  maxHeight = 168,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${Math.max(next, 72)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  return (
    <textarea
      ref={ref}
      id={id}
      rows={3}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        PLAN_INPUT_CLASS,
        "h-auto min-h-[72px] w-full resize-none py-2.5 leading-relaxed",
      )}
      style={{ maxHeight }}
    />
  );
}
