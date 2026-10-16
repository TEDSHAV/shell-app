"use client";

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
  }> = [
    {
      key: "total",
      label: "Total ítems en stock",
      value: String(total),
      hint: "artículos activos",
      tone: "bg-sky-50 border-sky-200 text-sky-900",
    },
    {
      key: "bajo",
      label: "Alertas de stock bajo",
      value: String(bajo),
      hint: "necesitan reabastecimiento",
      tone: "bg-rose-50 border-rose-200 text-rose-900",
    },
    {
      key: "osis",
      label: "Servicios por asignar consumo",
      value: String(osis),
      hint: "OSIs pendientes de prorrateo",
      tone: "bg-indigo-50 border-indigo-200 text-indigo-900",
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
              "rounded-2xl border px-4 py-3 text-left shadow-sm transition",
              card.tone,
              active === card.key && "ring-2 ring-sky-400",
            )}
          >
            <p className="text-xs font-medium opacity-80">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs opacity-70">{card.hint}</p>
          </button>
        ))}
    </div>
  );
}
