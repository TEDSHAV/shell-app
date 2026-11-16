import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { ItemPendiente } from "../lib/dashboard-data";
import type {
  BandejaDashboard,
  ModuloDashboard,
} from "../lib/dashboard-modulos";

/** Azul de Administración (brandColor de la app). */
const AZUL = "#0C3F69";

function texto_dias(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias === 0) return "hoy";
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

function Espera({ dias }: { dias: number | null }) {
  const texto = texto_dias(dias);
  if (!texto || dias === null) return null;
  const tono =
    dias >= 7
      ? "bg-rose-50 text-rose-600 ring-rose-100"
      : dias >= 3
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-slate-50 text-slate-500 ring-slate-100";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tono}`}
    >
      {texto}
    </span>
  );
}

export type ResumenDashboard = {
  id: string;
  modulo: string;
  total: number;
  frase: string;
  hacer: string;
  tipo: "accion" | "seguimiento";
};

function TarjetaResumen({ r }: { r: ResumenDashboard }) {
  return (
    <Link
      href={`#${r.id}`}
      className="group flex flex-col gap-2 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-slate-200 transition hover:shadow-md hover:ring-[#0C3F69]/30"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#0C3F69]/70">
        {r.modulo}
      </span>
      <span className="flex items-start gap-3">
        <span className="text-3xl font-bold leading-none tabular-nums text-[#0C3F69]">
          {r.total}
        </span>
        <span className="text-[13px] leading-snug text-slate-700">{r.frase}</span>
      </span>
      <span className="mt-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0C3F69] group-hover:underline">
        {r.hacer}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

/** Cabecera: título, saludo, acciones y, debajo, qué te toca (con frases completas) y qué solo sigues. */
export function DashboardHero({
  saludo,
  fecha,
  acciones,
  resumen,
}: {
  saludo: string;
  fecha: string;
  acciones: React.ReactNode;
  resumen: ResumenDashboard[];
}) {
  const te_toca = resumen.filter((r) => r.tipo === "accion" && r.total > 0);
  const seguimiento = resumen.filter((r) => r.tipo === "seguimiento" && r.total > 0);
  const total = te_toca.reduce((suma, r) => suma + r.total, 0);
  return (
    <section className="relative overflow-clip rounded-3xl bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_32px_-18px_rgb(12_63_105/0.35)] ring-1 ring-slate-200/60">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0C3F69]/10 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#0C3F69]/15 blur-3xl" />
      <div className="relative flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1B6FB0] to-[#0C3F69] text-white shadow-md shadow-[#0C3F69]/30">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <h1 className="m-0 text-xl font-bold leading-tight tracking-tight text-slate-900">
                Administración
              </h1>
              <p className="m-0 text-sm text-slate-500">
                {saludo} <span className="text-slate-300">·</span>{" "}
                <span className="first-letter:uppercase">{fecha}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">{acciones}</div>
        </div>

        <div>
          <h2 className="m-0 text-[15px] font-semibold text-slate-900">
            {te_toca.length === 0
              ? "No tienes nada pendiente por hacer"
              : total === 1
                ? "Te toca hacer 1 cosa"
                : `Te toca hacer ${total} cosas`}
          </h2>
          <p className="m-0 mt-0.5 text-[13px] text-slate-500">
            {te_toca.length === 0
              ? "Cuando llegue algo que requiera tu acción, aparecerá aquí."
              : "Cada tarjeta es algo que está esperando por ti. Haz clic para ver cuáles son."}
          </p>
          {te_toca.length > 0 ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {te_toca.map((r) => (
                <TarjetaResumen key={r.id} r={r} />
              ))}
            </div>
          ) : null}
          {seguimiento.length > 0 ? (
            <p className="m-0 mt-3 text-[13px] text-slate-500">
              Solo para que estés al tanto (no requiere tu acción):{" "}
              {seguimiento.map((r, i) => (
                <span key={r.id}>
                  {i > 0 ? " · " : ""}
                  <Link
                    href={`#${r.id}`}
                    className="font-medium text-slate-700 hover:underline"
                  >
                    {r.total} {r.frase}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FilaItem({ item }: { item: ItemPendiente }) {
  return (
    <li>
      <Link
        href={item.href}
        className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#0C3F69]/[0.04]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">
            {item.titulo}
          </span>
          {item.detalle ? (
            <span className="block truncate text-[12px] text-slate-500">
              {item.detalle}
            </span>
          ) : null}
        </span>
        <Espera dias={item.dias} />
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0C3F69]" />
      </Link>
    </li>
  );
}

export function BandejaCard({
  bandeja,
  modulo,
}: {
  bandeja: BandejaDashboard;
  modulo: ModuloDashboard;
}) {
  const { contenido } = bandeja;
  const Icon = modulo.icon;
  const resto = contenido.total - contenido.items.length;
  return (
    <section
      id={bandeja.id}
      className="scroll-mt-4 overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] ring-1 ring-slate-200/70"
    >
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0C3F69]/10 text-[#0C3F69]">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {modulo.titulo}
          </p>
          <h2 className="m-0 text-base font-semibold leading-tight text-slate-900">
            {bandeja.titulo}
          </h2>
          <p className="m-0 mt-0.5 text-[12.5px] text-slate-500">
            {bandeja.ayuda}
          </p>
        </div>
        <span
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-sm font-bold tabular-nums ${
            contenido.total > 0
              ? "bg-[#0C3F69] text-white"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {contenido.total}
        </span>
      </header>

      {contenido.items.length === 0 ? (
        <p className="m-0 flex items-center gap-2 border-t border-slate-100 px-4 py-4 text-sm text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          {bandeja.al_dia || "Todo al día."}
        </p>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 border-t border-slate-100 p-0">
          {contenido.items.map((item) => (
            <FilaItem key={item.id} item={item} />
          ))}
        </ul>
      )}

      {contenido.total > 0 ? (
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <span className="text-[12px] text-slate-500">
            {resto > 0
              ? `Mostrando las ${contenido.items.length} más recientes · faltan ${resto}`
              : "Las más recientes primero"}
          </span>
          <Link
            href={bandeja.href_todos}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0C3F69] hover:underline"
          >
            {bandeja.cta_todos}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </footer>
      ) : null}
    </section>
  );
}

function Acceso({
  href,
  label,
  descripcion,
  icon: Icon,
}: {
  href: string;
  label: string;
  descripcion: string;
  icon: LucideIcon;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full items-start gap-3 rounded-2xl p-3 ring-1 ring-slate-100 transition hover:-translate-y-px hover:bg-white hover:shadow-md hover:ring-[#0C3F69]/25"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0C3F69]/10 text-[#0C3F69] transition group-hover:bg-gradient-to-br group-hover:from-[#1B6FB0] group-hover:to-[#0C3F69] group-hover:text-white group-hover:shadow-md group-hover:shadow-[#0C3F69]/25">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
            {label}
            <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-[#0C3F69] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">
            {descripcion}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** A dónde puedes entrar: un bloque por módulo, con una tarjeta por acceso y qué hace cada uno. */
export function AccesosPanel({ modulos }: { modulos: ModuloDashboard[] }) {
  return (
    <section aria-label="Tus accesos">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="m-0 text-base font-semibold text-slate-900">
            Tus accesos
          </h2>
          <p className="m-0 text-[13px] text-slate-500">
            Lo que puedes abrir según tus permisos.
          </p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {modulos.map((modulo) => (
          <div
            key={modulo.id}
            className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] ring-1 ring-slate-200/70"
          >
            <Link
              href={modulo.href}
              className="group relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-[#1B6FB0] to-[#0C3F69] px-4 py-3.5 text-white"
            >
              <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <modulo.icon className="h-5 w-5" />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block text-base font-semibold leading-tight">
                  {modulo.titulo}
                </span>
                <span className="block text-[12.5px] text-white/75">
                  {modulo.descripcion}
                </span>
              </span>
              <ArrowRight className="relative h-4 w-4 shrink-0 text-white/60 transition group-hover:translate-x-0.5 group-hover:text-white" />
            </Link>
            <ul className="m-0 grid list-none gap-2.5 p-3 sm:grid-cols-2">
              {modulo.accesos.map((acceso) => (
                <Acceso key={acceso.href + acceso.label} {...acceso} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TodoAlDia() {
  return (
    <section className="flex items-center gap-4 rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04)] ring-1 ring-slate-200/70">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
        <CheckCircle2 className="h-6 w-6" />
      </span>
      <div>
        <h2 className="m-0 text-base font-semibold text-slate-900">
          Todo al día
        </h2>
        <p className="m-0 text-sm text-slate-500">
          No tienes nada pendiente en tus módulos. Tus accesos están abajo.
        </p>
      </div>
    </section>
  );
}

export { AZUL };
