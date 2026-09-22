"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EXPAND_MOTION } from "../lib/display";

export function FilterExpand({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        EXPAND_MOTION.panel,
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            EXPAND_MOTION.body,
            open ? "translate-y-0 opacity-100" : "-translate-y-1.5 opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
