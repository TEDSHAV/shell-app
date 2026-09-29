"use client";

import { useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggle_objetivo_para_mi } from "../actions/objetivo-claim-actions";
import { PlanAssigneeStack } from "./plan-assignee-chip";
import type { PlanParticipante } from "../lib/types";

export function ObjetivoParaMiToggle({
  objetivo_id,
  para_mi,
  responsables,
  onChanged,
}: {
  objetivo_id: number;
  para_mi: boolean;
  responsables: PlanParticipante[];
  onChanged?: () => void;
}) {
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PlanAssigneeStack people={responsables} max={4} />
      <Button
        type="button"
        variant={para_mi ? "outline" : "default"}
        disabled={busy}
        className={
          para_mi
            ? "h-8 rounded-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "h-8 rounded-full bg-slate-900 text-white hover:bg-slate-800"
        }
        onClick={() => {
          void (async () => {
            set_busy(true);
            set_error(null);
            const result = await toggle_objetivo_para_mi(objetivo_id, !para_mi);
            set_busy(false);
            if (!result.ok) set_error(result.error);
            else onChanged?.();
          })();
        }}
      >
        {para_mi ? (
          <UserMinus className="mr-1 h-3.5 w-3.5" />
        ) : (
          <UserPlus className="mr-1 h-3.5 w-3.5" />
        )}
        {busy ? "…" : para_mi ? "Dejar de cubrirlo" : "Asignarme este objetivo"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
