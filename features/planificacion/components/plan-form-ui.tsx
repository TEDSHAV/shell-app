import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export const PLAN_SELECT_CLASS =
  "flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

export const PLAN_INPUT_CLASS =
  "h-11 rounded-xl border-slate-200 bg-slate-50 shadow-sm focus-visible:ring-violet-200";

export function PlanSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold tracking-tight text-slate-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function PlanField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-slate-400">{hint}</p> : null}
    </div>
  );
}
