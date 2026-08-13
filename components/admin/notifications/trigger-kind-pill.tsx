"use client";

import type { TriggerKindMeta } from "@/lib/notification-trigger-meta";
import { cn } from "@/lib/utils";

type TriggerKindPillProps = {
  meta: TriggerKindMeta;
  show_label?: boolean;
  className?: string;
};

export function TriggerKindPill({
  meta,
  show_label = true,
  className,
}: TriggerKindPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        meta.bg_class,
        meta.text_class,
        meta.border_class,
        className,
      )}
      style={{ borderColor: `${meta.color}40` }}
      title={meta.description}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {show_label ? meta.label : meta.short_label}
    </span>
  );
}
