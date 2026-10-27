#!/usr/bin/env node
// Genera features/planificacion/data/versiones-git.json con los tags y la
// versión de package.json de cada repo de Prisma. Usa la sesión local de `gh`
// (no hace falta token en el servidor). Correr: `npm run versiones:sync`.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OWNER = "TEDSHAV";

// tag_prefix: tags que pertenecen a la unidad (`v` = tags sin prefijo de paquete).
// container: Shell, el portal que contiene a todas las apps (versión general de Prisma).
const UNITS = [
  { repo: "SGestion", app_slug: "negocios", tag_prefix: "v", package_path: "apps/web/package.json" },
  { repo: "SGestion", app_slug: "reportes", tag_prefix: "reportes-v", package_path: "apps/web/releases/reportes/package.json" },
  { repo: "SGestion", app_slug: "marketing", tag_prefix: "marketing-v", package_path: "apps/web/releases/marketing/package.json" },
  { repo: "SGestion", app_slug: "tareas", tag_prefix: "tareas-v", package_path: "apps/web/releases/tareas/package.json" },
  { repo: "SGestion", app_slug: "comentarios", tag_prefix: "comentarios-v", package_path: "apps/web/releases/comentarios/package.json" },
  { repo: "capacitacion", app_slug: "capacitacion", tag_prefix: "v", package_path: "package.json" },
  { repo: "administration", app_slug: "administracion", tag_prefix: "v", package_path: "apps/administracion/package.json" },
  { repo: "servicios-tecnicos", app_slug: "servicios-tecnicos", tag_prefix: "v", package_path: "package.json" },
  { repo: "calidad-hub", app_slug: "calidad", tag_prefix: "v", package_path: "package.json" },
  { repo: "nextjs-rh-module", app_slug: "recursos-humanos", tag_prefix: "v", package_path: "package.json" },
  { repo: "inventario", app_slug: "inventario", tag_prefix: "v", package_path: "package.json" },
  { repo: "filebrowser", app_slug: "drive", tag_prefix: "v", package_path: "package.json" },
  { repo: "shell-app", app_slug: "general", label: "Prisma (Shell)", container: true, tag_prefix: "v", package_path: "package.json", local: true },
];

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function repo_tags(repo) {
  const query = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){refs(refPrefix:"refs/tags/",first:100,orderBy:{field:TAG_COMMIT_DATE,direction:DESC}){nodes{name target{__typename ... on Commit{committedDate} ... on Tag{tagger{date} target{... on Commit{committedDate}}}}}}}}`;
  const out = JSON.parse(gh(["api", "graphql", "-f", `query=${query}`, "-F", `owner=${OWNER}`, "-F", `name=${repo}`]));
  return out.data.repository.refs.nodes.map((node) => ({
    name: node.name,
    fecha: (node.target.committedDate ?? node.target.tagger?.date ?? node.target.target?.committedDate ?? "").slice(0, 10) || null,
  }));
}

function package_version(repo, path, local) {
  try {
    if (local) {
      return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8")).version ?? null;
    }
    const raw = gh(["api", `repos/${OWNER}/${repo}/contents/${path}`, "-H", "Accept: application/vnd.github.raw"]);
    return JSON.parse(raw).version ?? null;
  } catch {
    return null;
  }
}

const tags_cache = new Map();
const apps = UNITS.map((unit) => {
  if (!tags_cache.has(unit.repo)) tags_cache.set(unit.repo, repo_tags(unit.repo));
  const tags = tags_cache
    .get(unit.repo)
    .filter((tag) => tag.name.startsWith(unit.tag_prefix))
    .map((tag) => ({ ...tag, version: tag.name.slice(unit.tag_prefix.length) }))
    .filter((tag) => SEMVER.test(tag.version));
  return {
    app_slug: unit.app_slug,
    label: unit.label ?? null,
    container: unit.container ?? false,
    repo: `${OWNER}/${unit.repo}`,
    package_version: package_version(unit.repo, unit.package_path, unit.local),
    tags: tags.map(({ name, version, fecha }) => ({ tag: name, version, fecha })),
  };
});

const target = fileURLToPath(new URL("../features/planificacion/data/versiones-git.json", import.meta.url));
writeFileSync(target, `${JSON.stringify({ generated_at: new Date().toISOString(), apps }, null, 2)}\n`);
console.log(`versiones-git.json: ${apps.length} unidades, ${apps.reduce((n, a) => n + a.tags.length, 0)} tags`);
