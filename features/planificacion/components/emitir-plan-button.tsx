"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emit_plan_mes } from "../actions/plan-mes-actions";

export function EmitirPlanButton({
  mes,
  disabled = false,
}: {
  mes: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        className="rounded-full bg-violet-600 px-4 text-white hover:bg-violet-500"
        disabled={busy || disabled}
        onClick={() => {
          void (async () => {
            set_busy(true);
            set_error(null);
            const result = await emit_plan_mes(mes);
            set_busy(false);
            if (!result.ok) {
              set_error(result.error);
              return;
            }
            router.refresh();
          })();
        }}
      >
        <Send className="mr-1 h-4 w-4" />
        {busy ? "Emitiendo…" : "Emitir plan"}
      </Button>
      {disabled ? (
        <p className="text-xs text-slate-400">
          Guarda al menos un objetivo en el borrador.
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
