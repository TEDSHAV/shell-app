import type { PrismaKpis, RatioKpi } from "../lib/prisma-kpis";
import {
  PRISMA_ALCANCE_LEVANTADO_PCT,
  PRISMA_ALCANCE_NOTA,
} from "../lib/prisma-kpis";

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

function PctStat({
  label,
  pct,
  accent,
  side_lines,
}: {
  label: string;
  pct: number;
  accent?: boolean;
  side_lines?: [string, string];
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border px-4 py-4 shadow-sm ${
        accent
          ? "border-violet-200 bg-violet-600 text-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase leading-tight tracking-wide ${
          accent ? "text-violet-100" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <div className="mt-1 flex min-w-0 items-center gap-1.5">
        <p
          className={`shrink-0 text-3xl font-bold tabular-nums tracking-tight ${
            accent ? "text-white" : "text-slate-900"
          }`}
        >
          {pct}%
          {side_lines ? (
            <span className="font-bold"> /</span>
          ) : null}
        </p>
        {side_lines ? (
          <p
            className={`min-w-0 text-[11px] font-semibold leading-tight ${
              accent ? "text-violet-100" : "text-slate-500"
            }`}
          >
            <span className="block">{side_lines[0]}</span>
            <span className="block">{side_lines[1]}</span>
          </p>
        ) : null}
      </div>
      <div
        className={`mt-3 h-2 overflow-hidden rounded-full ${
          accent ? "bg-violet-400/50" : "bg-slate-100"
        }`}
      >
        <div
          className={`h-2 rounded-full ${accent ? "bg-white" : "bg-violet-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PrismaKpiStrip({
  kpis,
  alcance_publico = false,
}: {
  kpis: PrismaKpis;
  alcance_publico?: boolean;
  anio?: number;
  captured_at?: string | null;
}) {
  return (
    <div className="space-y-3">
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${
          alcance_publico ? "lg:grid-cols-6" : "lg:grid-cols-5"
        }`}
      >
        <RatioStat label="Tareas" value={kpis.tareas} />
        <RatioStat label="Plan inicial" value={kpis.plan} />
        <RatioStat label="Requerimientos" value={kpis.requerimientos} />
        <RatioStat label="Adicional" value={kpis.adicional} />
        <PctStat
          label="Avance Prisma"
          pct={kpis.avance}
          accent
          side_lines={
            alcance_publico
              ? ["alcance del plan", "hasta hoy"]
              : undefined
          }
        />
        {alcance_publico ? (
          <PctStat
            label="Alcance del plan hasta hoy"
            pct={PRISMA_ALCANCE_LEVANTADO_PCT}
          />
        ) : null}
      </div>
      {alcance_publico ? (
        <p className="px-0.5 text-sm leading-relaxed text-slate-500">
          {PRISMA_ALCANCE_NOTA}
        </p>
      ) : null}
    </div>
  );
}
