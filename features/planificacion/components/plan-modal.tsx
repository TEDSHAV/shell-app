"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlanModal({
  open,
  title,
  subtitle,
  badges,
  onClose,
  children,
  footer,
  wide,
  variant = "center",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  variant?: "center" | "sheet";
}) {
  useEffect(() => {
    if (!open) return;
    const on_key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", on_key);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", on_key);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sheet = variant === "sheet";

  return (
    <div
      className={
        sheet
          ? "fixed inset-0 z-50 flex items-stretch justify-end"
          : "fixed inset-0 z-50 flex items-center justify-center p-4"
      }
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modal-title"
        className={cn(
          "relative z-10 flex w-full flex-col overflow-hidden bg-white shadow-2xl",
          sheet
            ? "ml-auto h-full max-w-2xl border-l border-slate-200"
            : cn(
                "m-0 max-h-[88vh] rounded-3xl border border-slate-200",
                wide ? "max-w-2xl" : "max-w-xl",
              ),
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white",
            sheet ? "px-7 py-5" : "px-6 py-4",
          )}
        >
          <div className="min-w-0 flex-1">
            <h2
              id="plan-modal-title"
              className="text-xl font-bold leading-snug tracking-tight text-slate-900"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
            {badges ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {badges}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            sheet ? "bg-[#f8fafc] px-7 py-6" : "px-6 py-5",
          )}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white",
              sheet ? "px-7 py-4" : "bg-slate-50/90 px-6 py-3",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
