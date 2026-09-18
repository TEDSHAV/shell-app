import { ORIGIN_COLORS, ORIGIN_LABELS } from "../lib/display";
import type { PlanOrigen } from "../lib/types";

export function OrigenBadge({ origen }: { origen: PlanOrigen }) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ORIGIN_COLORS[origen]}`}
    >
      {ORIGIN_LABELS[origen]}
    </span>
  );
}
