"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format_month_label, shift_month } from "../lib/plan-month";

export function PlanMonthPicker({ mes }: { mes: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function go(next: string) {
    router.push(`${pathname}?mes=${next}`);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        className="rounded-full p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        onClick={() => go(shift_month(mes, -1))}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <p className="min-w-[9.5rem] px-2 text-center text-sm font-semibold text-slate-800">
        {format_month_label(mes)}
      </p>
      <button
        type="button"
        className="rounded-full p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        onClick={() => go(shift_month(mes, 1))}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
