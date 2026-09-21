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
    "Opera y configura Negocios: directorio, embudo, costos, facturación y reportes del día a día.",
  "sgestion:superadmin":
    "Supervisa Negocios: visibilidad total del proceso comercial y la última palabra en aprobaciones de la gerencia.",
  "sgestion:gestor_clientes":
    "Ejecutivo comercial: atiende el embudo, la cartera de clientes y las órdenes de servicio de su equipo.",
  "sgestion:gestor_financiero":
    "Ingeniería y finanzas de Negocios: costea, arma presupuestos y lleva la facturación del proceso comercial.",
  "sgestion:gestor_marketing":
    "Captación: leads, contactos y el embudo de marketing.",
  "sadministracion:admin":
    "Administra la app de Administración y las bandejas de emisión fiscal.",
  "sadministracion:gestor":
    "Opera Administración: registra la factura fiscal cuando el proceso comercial ya está listo para emitir.",
  "sadministracion:coordinador":
    "Coordina el trabajo diario de Administración y las requisiciones del área.",
  "sadministracion:lider":
    "Lidera Administración y aprueba las requisiciones de ese departamento.",
  "st:analista":
    "Ejecuta órdenes de servicio en campo: visita, informe y cierre operativo.",
  "st:coordinador":
    "Coordina la ejecución de OSI en Servicios Técnicos y las requisiciones del equipo.",
  "st:lider":
    "Lidera Servicios Técnicos y aprueba las requisiciones de ese departamento.",
  "scalidad:analista":
    "Ejecuta el control de procesos y registros de Calidad.",
  "scalidad:superadmin":
    "Supervisa Calidad: políticas, auditorías y el estándar del módulo.",
  "scapacitacion:admin":
    "Administra Capacitación: catálogo de cursos, participantes y operación del módulo.",
  "scapacitacion:analista":
    "Opera el día a día de Capacitación: inscripciones, asistencia y seguimiento.",
  "scapacitacion:coordinador":
    "Coordina la operación de Capacitación y las requisiciones de ese equipo.",
  "scapacitacion:lider":
    "Lidera Capacitación y aprueba las requisiciones de ese departamento.",
  "scapacitacion:superadmin":
    "Supervisa Capacitación a nivel de módulo: estándares y operación completa.",
  "srh:admin":
    "Administra Recursos Humanos: personas, solicitudes y trámites del área.",
  "inventario:admin":
    "Administra inventario: catálogo, movimientos y control de almacén.",
  "inventario:analista":
    "Opera inventario: entradas, salidas y consulta de existencias.",
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
          `Función ${raw.role_nombre} en ${app_nombre}.`,
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

async function overlay_role_descriptions(
  apps: ManualAppRoles[],
): Promise<ManualAppRoles[]> {
  const supabase = await createClient();
  const [appsRes, rolesRes] = await Promise.all([
    supabase.schema("authprisma").from("apps").select("id, slug, descripcion"),
    supabase
      .schema("authprisma")
      .from("roles")
      .select("slug, descripcion, app_id"),
  ]);
  if (appsRes.error || rolesRes.error) return apps;

  const app_slug_by_id = new Map<number, string>(
    ((appsRes.data || []) as Array<{ id: number; slug: string }>).map((a) => [
      Number(a.id),
      a.slug,
    ]),
  );
  const desc_by_key = new Map<string, string>();
  for (const row of (rolesRes.data || []) as Array<{
    slug: string;
    descripcion: string | null;
    app_id: number;
  }>) {
    if (!row.descripcion) continue;
    const app_slug = app_slug_by_id.get(Number(row.app_id));
    if (!app_slug) continue;
    desc_by_key.set(`${app_slug}:${row.slug}`, row.descripcion);
  }

  return apps.map((app) => ({
    ...app,
    roles: app.roles.map((role) => ({
      ...role,
      description:
        desc_by_key.get(`${app.app_slug}:${role.role_slug}`) ?? role.description,
    })),
  }));
}

export async function get_manual_app_roles(): Promise<ManualAppRoles[]> {
  const supabase = await createClient();

  const full = await supabase
    .from("v_manual_app_roles")
    .select(
      "app_slug, app_nombre, role_slug, role_nombre, permission_slug, permission_descripcion",
    );

  let assembled: ManualAppRoles[] = [];
  if (!full.error && full.data?.length) {
    assembled = assemble(full.data as ViewRow[]);
  } else {
    const catalog = await supabase
      .from("v_osi_app_roles_catalog")
      .select("app_slug, app_nombre, role_slug, role_nombre");
    if (catalog.error || !catalog.data) {
      return [];
    }
    assembled = assemble(catalog.data as ViewRow[]);
  }

  return overlay_role_descriptions(assembled);
}
