import type { PrismaKpis, RatioKpi } from "../lib/prisma-kpis";

function RatioStat({
  label,
  value,
}: {
  label: string;
  value: RatioKpi;
}) {
  const pct = value.total === 0 ? 0 : Math.round((value.done / value.total) * 100);
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
        {value.done}
        <span className="text-lg font-semibold text-slate-400">
          /{value.total}
        </span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-violet-600"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PrismaKpiStrip({ kpis }: { kpis: PrismaKpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <RatioStat label="Tareas" value={kpis.tareas} />
      <RatioStat label="Planificado" value={kpis.plan} />
      <RatioStat label="Requerimientos" value={kpis.requerimientos} />
      <RatioStat label="Adicional" value={kpis.adicional} />
      <div className="min-w-0 rounded-2xl border border-violet-200 bg-violet-600 px-4 py-4 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">
          Avance Prisma
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
          {kpis.avance}%
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-400/50">
          <div
            className="h-2 rounded-full bg-white"
            style={{ width: `${kpis.avance}%` }}
          />
        </div>
      </div>
    </div>
  );
}
