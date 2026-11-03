import { ChevronDown, GitBranch, Target } from "lucide-react";
import { format_month_label } from "../lib/plan-month";
import type { PlanVersionApp, PlanVersionNode } from "../lib/versiones";

const ESTADO_OBJETIVO: Record<string, string> = {
  abierto: "text-slate-500",
  cumplido: "text-emerald-600",
  cancelado: "text-slate-400 line-through",
};

export function VersionBadge({
  version,
  estado,
  title,
}: {
  version: string;
  estado: "liberada" | "planificada";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={
        estado === "liberada"
          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-700"
      }
    >
      <GitBranch className="h-3 w-3" />v{version}
    </span>
  );
}

function VersionDescripcion({ node }: { node: PlanVersionNode }) {
  if (node.estado === "planificada") {
    return node.descripcion.length === 0 ? (
      <p className="pb-1.5 text-xs italic text-slate-400">
        La descripción se llena con los objetivos que se vayan cumpliendo.
      </p>
    ) : (
      <ul className="mb-2 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
        {node.descripcion.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    );
  }
  const secciones =
    node.historial?.secciones ??
    (node.descripcion.length > 0 ? [{ titulo: "Cambios", items: node.descripcion }] : []);
  const total = secciones.reduce((n, s) => n + s.items.length, 0);
  return (
    <>
      {node.historial?.resumen ? (
        <p className="pb-1 text-xs text-slate-600">{node.historial.resumen}</p>
      ) : null}
      {total > 0 ? (
        <details className="mb-2">
          <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700">
            Historial · {total} {total === 1 ? "cambio" : "cambios"}
          </summary>
          <div className="mt-1.5 space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
            {secciones.map((seccion) => (
              <div key={seccion.titulo}>
                <p className="text-xs font-semibold text-slate-700">{seccion.titulo}</p>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                  {seccion.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}

function VersionNodeView({ node }: { node: PlanVersionNode }) {
  const meta = [
    node.estado === "liberada" ? "Liberada" : "Planificada",
    node.fecha,
    node.mes_plan ? `Plan ${format_month_label(node.mes_plan)}` : null,
    node.etiqueta,
  ].filter(Boolean);
  return (
    <li className="relative pl-6 before:absolute before:left-2 before:top-0 before:h-full before:border-l before:border-slate-200 last:before:h-4 after:absolute after:left-2 after:top-4 after:w-3 after:border-t after:border-slate-200">
      <div className="flex flex-wrap items-center gap-2 py-1.5">
        <VersionBadge version={node.version} estado={node.estado} />
        <span className="text-xs text-slate-400">{meta.join(" · ")}</span>
      </div>
      {node.notas ? <p className="pb-1 text-xs text-slate-500">{node.notas}</p> : null}
      <VersionDescripcion node={node} />
      {node.objetivos.length > 0 ? (
        <ul className="mb-2 space-y-1 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
          {node.objetivos.map((objetivo) => (
            <li key={objetivo.id} className="flex items-start gap-2 text-sm">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
              <span className={ESTADO_OBJETIVO[objetivo.estado] ?? "text-slate-600"}>
                {objetivo.titulo}
              </span>
              <span className="ml-auto shrink-0 text-xs tabular-nums text-slate-400">
                {objetivo.avance}% · {format_month_label(objetivo.mes)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {node.children.length > 1 ? (
        <VersionChain nodes={node.children} />
      ) : null}
    </li>
  );
}

/** Una cadena lineal se pinta plana; solo se anida cuando hay ramas. */
function linear_chain(start: PlanVersionNode): PlanVersionNode[] {
  const out = [start];
  let current = start;
  while (current.children.length === 1) {
    current = current.children[0];
    out.push(current);
  }
  return out;
}

function VersionChain({ nodes }: { nodes: PlanVersionNode[] }) {
  return (
    <ul>
      {nodes.flatMap(linear_chain).map((node) => (
        <VersionNodeView key={node.key} node={node} />
      ))}
    </ul>
  );
}

function count_nodes(nodes: PlanVersionNode[]): number {
  return nodes.reduce((n, node) => n + 1 + count_nodes(node.children), 0);
}

function AppCardHeader({ app }: { app: PlanVersionApp }) {
  const total = count_nodes(app.roots);
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="font-semibold text-slate-900">{app.app_nombre}</h2>
        {app.repo ? <p className="text-xs text-slate-400">{app.repo}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
        <span>
          {total} {total === 1 ? "versión" : "versiones"}
        </span>
        {app.actual ? <VersionBadge version={app.actual} estado="liberada" title="Versión actual" /> : null}
      </div>
    </div>
  );
}

export function VersionesTree({
  apps,
  generated_at,
  planned_error,
}: {
  apps: PlanVersionApp[];
  generated_at: string;
  planned_error: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
          Versiones
        </h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Liberadas según los tags git (actualizado {generated_at.slice(0, 10)}).
          Las planificadas agrupan los objetivos del plan.
        </p>
      </div>
      {planned_error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          No se pudieron cargar las versiones planificadas; se muestran solo las de git.
        </p>
      ) : null}
      {apps.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Aún no hay versiones registradas.
        </p>
      ) : (
        <div className="space-y-3">
          {apps.map((app) =>
            app.container ? (
              <section
                key={app.app_slug}
                className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm"
              >
                <AppCardHeader app={app} />
                <p className="mb-2 mt-2 text-xs text-slate-500">
                  Versión general de Prisma: cada versión reúne los objetivos de todas las apps del mes.
                </p>
                <VersionChain nodes={app.roots} />
              </section>
            ) : (
              <details
                key={app.app_slug}
                className="group rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-slate-400 transition-transform group-open:rotate-0" />
                  <AppCardHeader app={app} />
                </summary>
                <div className="px-5 pb-5">
                  <VersionChain nodes={app.roots} />
                </div>
              </details>
            ),
          )}
        </div>
      )}
    </div>
  );
}
