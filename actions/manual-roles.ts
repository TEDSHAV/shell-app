"use server";

import { createClient } from "@/lib/supabase/server";

export type ManualRolePermission = {
  slug: string;
  descripcion: string;
};

export type ManualRoleCard = {
  role_slug: string;
  role_nombre: string;
  description: string;
  permissions: ManualRolePermission[];
};

export type ManualAppRoles = {
  app_slug: string;
  app_nombre: string;
  roles: ManualRoleCard[];
};

const APP_DISPLAY_NAME: Record<string, string> = {
  sgestion: "Negocios",
  sadministracion: "Administración",
  st: "Servicios Técnicos",
  scalidad: "Calidad",
  scapacitacion: "Capacitación",
  srh: "Recursos Humanos",
  inventario: "Inventario",
};

const ROLE_BLURB: Record<string, string> = {
  "sgestion:admin":
    "Ve y configura todo Negocios: directorio, pipeline, costos, facturación, reportes y cierres.",
  "sgestion:superadmin":
    "Igual que Admin, más aprobación del líder y supervisión completa del proceso comercial.",
  "sgestion:gestor_clientes":
    "Ejecutivo comercial: embudo, clientes, OSI de su cartera y solicitudes de factura.",
  "sgestion:gestor_financiero":
    "Ingeniería y finanzas: ECC, costeo OSI, presupuestos, facturación y reportes de presupuesto.",
  "sgestion:gestor_marketing":
    "Leads y contactos de marketing, pipeline de captación y reportes de leads.",
  "sadministracion:admin":
    "Acceso a Administración y a las bandejas de emisión fiscal de facturas.",
  "sadministracion:gestor":
    "Opera Administración y registra la factura fiscal cuando Finanzas ya aprobó la solicitud.",
  "sadministracion:coordinador":
    "Rol operativo de Administración. Los permisos detallados aún no están catalogados en el sistema.",
  "st:analista":
    "Ejecuta órdenes de servicio en campo. Permisos específicos se asignan en la app de ST.",
  "st:coordinador":
    "Coordina la ejecución de OSI en Servicios Técnicos.",
  "scalidad:analista":
    "Acceso al módulo de Calidad para el control de procesos.",
  "scalidad:superadmin":
    "Supervisa Calidad. Ampliar permisos desde el catálogo cuando se definan.",
  "scapacitacion:admin":
    "Administra Capacitación: cursos, participantes y operación del módulo.",
  "scapacitacion:analista":
    "Opera el día a día de Capacitación.",
  "scapacitacion:coordinador":
    "Coordina la operación de Capacitación.",
  "scapacitacion:lider":
    "Lidera el módulo de Capacitación.",
  "scapacitacion:superadmin":
    "Supervisión total de Capacitación.",
  "srh:admin":
    "Acceso total a Recursos Humanos.",
  "inventario:admin":
    "Administra Inventario. Completar permisos cuando el módulo los publique.",
  "inventario:analista":
    "Opera Inventario según el acceso asignado.",
};

/** Fallback alineado al catálogo actual si la vista nueva aún no está desplegada. */
const FALLBACK_PERMS: Record<string, string[]> = {
  "sgestion:admin": [
    "directorio:access",
    "pipeline:access",
    "finance:ecc:read",
    "finance:facturacion:access",
    "reportes:access:presupuestos",
    "reportes:cierres:manage",
  ],
  "sgestion:superadmin": [
    "directorio:access",
    "pipeline:access",
    "finance:ecc:approve",
    "finance:facturacion:access",
    "reportes:cierres:manage",
  ],
  "sgestion:gestor_clientes": [
    "pipeline:access",
    "sales:tratos:access",
    "sales:osi:executive",
    "finance:facturacion:create",
    "clientes:cuentas:manage",
  ],
  "sgestion:gestor_financiero": [
    "finance:ecc:edit",
    "finance:osi:edit",
    "finance:presupuestos:access",
    "finance:facturacion:access",
    "reportes:access:presupuestos",
  ],
  "sgestion:gestor_marketing": [
    "mkt:leads:write",
    "mkt:contactos:read",
    "pipeline:access",
    "reportes:access:leads",
  ],
  "sadministracion:admin": ["admin:access", "admin:facturacion:access"],
  "sadministracion:gestor": ["admin:access", "admin:facturacion:access"],
  "scalidad:analista": ["scalidad:all:access"],
  "scapacitacion:admin": ["scapacitacion:all:access"],
  "scapacitacion:analista": ["scapacitacion:all:access"],
  "srh:admin": ["srh:all:access"],
};

type ViewRow = {
  app_slug: string;
  app_nombre: string;
  role_slug: string;
  role_nombre: string;
  permission_slug?: string | null;
  permission_descripcion?: string | null;
};

function assemble(rows: ViewRow[]): ManualAppRoles[] {
  const by_app = new Map<string, ManualAppRoles>();
  for (const raw of rows) {
    const app_nombre =
      APP_DISPLAY_NAME[raw.app_slug] ?? raw.app_nombre ?? raw.app_slug;
    let app = by_app.get(raw.app_slug);
    if (!app) {
      app = { app_slug: raw.app_slug, app_nombre, roles: [] };
      by_app.set(raw.app_slug, app);
    }
    let role = app.roles.find((r) => r.role_slug === raw.role_slug);
    if (!role) {
      const key = `${raw.app_slug}:${raw.role_slug}`;
      role = {
        role_slug: raw.role_slug,
        role_nombre: raw.role_nombre,
        description:
          ROLE_BLURB[key] ??
          `Rol ${raw.role_nombre} en ${app_nombre}. Las funciones siguen los permisos asignados.`,
        permissions: [],
      };
      app.roles.push(role);
    }
    if (
      raw.permission_slug &&
      !role.permissions.some((p) => p.slug === raw.permission_slug)
    ) {
      role.permissions.push({
        slug: raw.permission_slug,
        descripcion: raw.permission_descripcion || raw.permission_slug,
      });
    }
  }

  for (const app of by_app.values()) {
    for (const role of app.roles) {
      if (role.permissions.length > 0) continue;
      const key = `${app.app_slug}:${role.role_slug}`;
      role.permissions = (FALLBACK_PERMS[key] ?? []).map((slug) => ({
        slug,
        descripcion: slug,
      }));
    }
  }

  const preferred = [
    "sgestion",
    "sadministracion",
    "st",
    "scalidad",
    "scapacitacion",
    "srh",
    "inventario",
  ];
  const apps = [...by_app.values()];
  apps.sort((a, b) => {
    const ia = preferred.indexOf(a.app_slug);
    const ib = preferred.indexOf(b.app_slug);
    if (ia === -1 && ib === -1) return a.app_nombre.localeCompare(b.app_nombre);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return apps;
}

export async function get_manual_app_roles(): Promise<ManualAppRoles[]> {
  const supabase = await createClient();

  const full = await supabase
    .from("v_manual_app_roles")
    .select(
      "app_slug, app_nombre, role_slug, role_nombre, permission_slug, permission_descripcion",
    );

  if (!full.error && full.data?.length) {
    return assemble(full.data as ViewRow[]);
  }

  const catalog = await supabase
    .from("v_osi_app_roles_catalog")
    .select("app_slug, app_nombre, role_slug, role_nombre");

  if (catalog.error || !catalog.data) {
    return [];
  }

  return assemble(catalog.data as ViewRow[]);
}
