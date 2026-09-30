"use client";

import { useLayoutEffect, useRef } from "react";

export function GrowingTextarea({
  id,
  value,
  onChange,
  placeholder,
  maxHeight = 320,
  bordered = true,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxHeight?: number;
  bordered?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${Math.max(next, bordered ? 96 : 48)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight, bordered]);

  return (
    <textarea
      ref={ref}
      id={id}
      rows={3}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.stopPropagation();
      }}
      className={
        bordered
          ? "block min-h-[96px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
          : "block min-h-[48px] w-full resize-none border-0 bg-transparent px-0 py-0 text-sm leading-relaxed whitespace-pre-wrap text-slate-900 outline-none placeholder:text-slate-400"
      }
      style={{ maxHeight }}
    />
  );
}
