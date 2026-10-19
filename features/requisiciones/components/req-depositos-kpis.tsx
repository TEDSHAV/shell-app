"use client";

import { AlertTriangle, ClipboardList, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type DepositoKpiKey = "total" | "bajo" | "osis";

export function ReqDepositosKpis({
  total,
  bajo,
  osis,
  active,
  onSelect,
  showOsis,
}: {
  total: number;
  bajo: number;
  osis: number;
  active: DepositoKpiKey | null;
  onSelect: (key: DepositoKpiKey | null) => void;
  showOsis: boolean;
}) {
  const cards: Array<{
    key: DepositoKpiKey;
    label: string;
    value: string;
    hint: string;
    tone: string;
    iconWrap: string;
    Icon: typeof PackageCheck;
  }> = [
    {
      key: "total",
      label: "Con stock",
      value: String(total),
      hint: "artículos con cantidad disponible",
      tone: "bg-white/90 border-slate-200 hover:border-emerald-300 backdrop-blur",
      iconWrap: "bg-emerald-100 text-emerald-800",
      Icon: PackageCheck,
    },
    {
      key: "bajo",
      label: "Stock bajo",
      value: String(bajo),
      hint: "se están acabando o ya se agotaron",
      tone: "bg-white/90 border-slate-200 hover:border-rose-300 backdrop-blur",
      iconWrap: "bg-rose-100 text-rose-800",
      Icon: AlertTriangle,
    },
    {
      key: "osis",
      label: "Por asignar a servicios",
      value: String(osis),
      hint: "servicios que aún necesitan registrar consumo",
      tone: "bg-white/90 border-slate-200 hover:border-indigo-300 backdrop-blur",
      iconWrap: "bg-indigo-100 text-indigo-800",
      Icon: ClipboardList,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards
        .filter((card) => card.key !== "osis" || showOsis)
        .map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(active === card.key ? null : card.key)}
            className={cn(
              "rounded-2xl border px-4 py-4 text-left shadow-sm transition",
              card.tone,
              active === card.key && "ring-2 ring-amber-400 border-amber-300",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  card.iconWrap,
                )}
              >
                <card.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">
                  {card.label}
                </p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {card.value}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{card.hint}</p>
          </button>
        ))}
    </div>
  );
}
