"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";

import { TriggerKindPill } from "@/components/admin/notifications/trigger-kind-pill";
import { TRIGGER_KIND_LEGEND } from "@/lib/notification-trigger-meta";
import { cn } from "@/lib/utils";

export function NotificationCatalogManual() {
  const [open, set_open] = useState(false);

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm">
      <button
        type="button"
        onClick={() => set_open((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/30"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          Manual del catálogo
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border/70 px-3 py-3">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tipos de origen del aviso
            </h3>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_KIND_LEGEND.map((kind) => (
                <TriggerKindPill key={kind.id} meta={kind} />
              ))}
            </div>
            <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              {TRIGGER_KIND_LEGEND.map((kind) => (
                <li
                  key={`${kind.id}-help`}
                  className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2"
                >
                  <span className="font-medium" style={{ color: kind.color }}>
                    {kind.label}
                  </span>
                  <p className="mt-0.5 leading-relaxed">{kind.description}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
