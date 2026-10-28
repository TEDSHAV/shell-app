export type PlanVersionEstado = "liberada" | "planificada";

export type PlanVersionRef = {
  version: string;
  app_nombre: string;
  estado: PlanVersionEstado;
};

export type PlanVersionObjetivo = {
  id: number;
  titulo: string;
  estado: "abierto" | "cumplido" | "cancelado";
  mes: string;
  avance: number;
};

export type PlanVersionNode = {
  key: string;
  version: string;
  estado: PlanVersionEstado;
  fecha: string | null;
  mes_plan: string | null;
  etiqueta: string | null;
  notas: string | null;
  /** Liberada: mensaje del tag / CHANGELOG. Planificada: objetivos ya terminados. */
  descripcion: string[];
  objetivos: PlanVersionObjetivo[];
  children: PlanVersionNode[];
};

export type PlanVersionApp = {
  app_slug: string;
  app_nombre: string;
  repo: string | null;
  actual: string | null;
  /** Shell: versión general de Prisma; sus planificadas agrupan los objetivos de todas las apps. */
  container: boolean;
  roots: PlanVersionNode[];
};

/** Forma de features/planificacion/data/versiones-git.json. */
export type GitVersionesFile = {
  generated_at: string;
  apps: Array<{
    app_slug: string;
    label?: string | null;
    container?: boolean;
    repo: string;
    package_version: string | null;
    tags: Array<{ tag: string; version: string; fecha: string | null; descripcion?: string[] }>;
  }>;
};

export type PlannedVersion = {
  id: number;
  app_slug: string;
  version: string;
  mes_plan: string | null;
  notas: string | null;
  objetivos: PlanVersionObjetivo[];
};

export function compare_semver(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Árbol por app: las liberadas (tags git, o package.json si no hay tags) forman la
 * cadena principal; las planificadas de BD cuelgan de la última liberada menor.
 * Si una planificada ya tiene tag, sus objetivos pasan al nodo liberado.
 */
export function build_version_tree(
  git: GitVersionesFile,
  planned: PlannedVersion[],
  app_names: Map<string, string>,
): PlanVersionApp[] {
  const slugs = new Set([...git.apps.map((app) => app.app_slug), ...planned.map((p) => p.app_slug)]);
  const out: PlanVersionApp[] = [];
  for (const slug of slugs) {
    const source = git.apps.find((app) => app.app_slug === slug);
    const released: PlanVersionNode[] = (source?.tags ?? []).map((tag) => ({
        key: `git:${slug}:${tag.version}`,
        version: tag.version,
        estado: "liberada" as const,
        fecha: tag.fecha,
        mes_plan: null,
        etiqueta: tag.tag,
        notas: null,
        descripcion: tag.descripcion ?? [],
        objetivos: [],
        children: [],
      }));
    if (released.length === 0 && source?.package_version) {
      released.push({
        key: `pkg:${slug}`,
        version: source.package_version,
        estado: "liberada",
        fecha: null,
        mes_plan: null,
        etiqueta: "package.json",
        notas: null,
        descripcion: [],
        objetivos: [],
        children: [],
      });
    }
    released.sort((a, b) => compare_semver(a.version, b.version));

    const container = source?.container ?? false;
    const extra: PlanVersionNode[] = [];
    for (const own of planned.filter((p) => p.app_slug === slug)) {
      const plan = container ? with_month_objetivos(own, planned) : own;
      const tagged = released.find((node) => node.version === plan.version);
      if (tagged) {
        tagged.objetivos.push(...plan.objetivos);
        tagged.mes_plan = plan.mes_plan;
        continue;
      }
      extra.push({
        key: `db:${plan.id}`,
        version: plan.version,
        estado: "planificada",
        fecha: null,
        mes_plan: plan.mes_plan,
        etiqueta: null,
        notas: plan.notas,
        descripcion: plan.objetivos.filter(is_objetivo_terminado).map((o) => o.titulo),
        objetivos: plan.objetivos,
        children: [],
      });
    }

    const roots: PlanVersionNode[] = [];
    released.forEach((node, i) => {
      if (i === 0) roots.push(node);
      else released[i - 1].children.push(node);
    });
    for (const node of extra.sort((a, b) => compare_semver(a.version, b.version))) {
      const parent = [...released].reverse().find((r) => compare_semver(r.version, node.version) < 0);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    if (roots.length === 0) continue;
    out.push({
      app_slug: slug,
      app_nombre: source?.label ?? app_names.get(slug) ?? slug,
      repo: source?.repo ?? null,
      actual: released.at(-1)?.version ?? null,
      container,
      roots,
    });
  }
  return out.sort(
    (a, b) => Number(b.container) - Number(a.container) || a.app_nombre.localeCompare(b.app_nombre, "es"),
  );
}

/** La versión del contenedor reúne los objetivos de todas las versiones del mismo mes. */
function with_month_objetivos(own: PlannedVersion, planned: PlannedVersion[]): PlannedVersion {
  if (!own.mes_plan) return own;
  const seen = new Set<number>();
  const objetivos = planned
    .filter((p) => p.id === own.id || p.mes_plan === own.mes_plan)
    .flatMap((p) => p.objetivos)
    .filter((o) => !seen.has(o.id) && Boolean(seen.add(o.id)));
  return { ...own, objetivos };
}

/** Estado de una versión planificada según los tags: si ya tiene tag, está liberada. */
export function planned_estado(git: GitVersionesFile, app_slug: string, version: string): PlanVersionEstado {
  const source = git.apps.find((app) => app.app_slug === app_slug);
  return source?.tags.some((tag) => tag.version === version) ? "liberada" : "planificada";
}

export function is_objetivo_terminado(objetivo: { estado: string; avance: number }): boolean {
  return objetivo.estado === "cumplido" || objetivo.avance >= 100;
}
