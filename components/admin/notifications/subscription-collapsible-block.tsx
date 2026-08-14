"use client";

import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SubscriptionCollapsibleBlockProps = {
  title: string;
  count: number;
  default_open: boolean;
  icon: typeof Bell;
  tone?: "default" | "muted";
  children: React.ReactNode;
};

export function SubscriptionCollapsibleBlock({
  title,
  count,
  default_open,
  icon: Icon,
  tone = "default",
  children,
}: SubscriptionCollapsibleBlockProps) {
  const [open, set_open] = useState(default_open);

  if (count === 0) return null;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border shadow-sm",
        tone === "muted" ? "border-border/60 bg-muted/10" : "border-border/80 bg-card",
      )}
    >
      <button
        type="button"
        onClick={() => set_open((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{title}</h2>
          <Badge variant="secondary">{count}</Badge>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border/70 px-4 py-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
