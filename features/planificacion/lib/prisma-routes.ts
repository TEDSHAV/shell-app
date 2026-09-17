export const PRISMA_VIEW_SHORTCUTS: Array<{ label: string; path: string }> = [
  { label: "Empresas", path: "/directorio/empresas" },
  { label: "Servicios", path: "/directorio/servicios" },
  { label: "Leads", path: "/crm/leads" },
  { label: "Pipeline", path: "/pipeline" },
  { label: "Tratos", path: "/pipeline/tratos" },
  { label: "Solpeds", path: "/pipeline/solpeds" },
  { label: "Presupuestos", path: "/pipeline/presupuestos" },
  { label: "Prefacturas", path: "/facturacion/prefactura" },
  { label: "Facturación", path: "/facturacion" },
  { label: "OSI", path: "/pipeline/osi" },
  { label: "ECC", path: "/ingenieria/ecc" },
  { label: "Tareas", path: "/tareas" },
  { label: "Comentarios", path: "/comentarios" },
  { label: "Reportes", path: "/reportes" },
];

export function normalize_prisma_path(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.pathname || "/";
  } catch {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
}

export function build_negocios_view_url(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
    "https://gestion.shadevenezuela.com.ve"
  ).replace(/\/$/, "");
  const normalized = normalize_prisma_path(path);
  if (!normalized) return base;
  return `${base}${normalized}?shell=1`;
}
