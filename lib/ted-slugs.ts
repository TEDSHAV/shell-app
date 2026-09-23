/** App, roles and permission slugs for TED (authprisma app `ted`). */

export const TED_APP_SLUG = "ted";

/** Operador del departamento TED (plan, usuarios, tickets, hub). */
export const TED_ROLE_OPERATOR = "ted";

/** Gerencia: objetivos del periodo y observar avances (Cubrir / Informe). */
export const TED_ROLE_GERENCIA = "gerencia";

export const TED_PERM_PLANIFICACION = "planificacion-ted:access-all";
export const TED_PERM_OBJETIVOS = "objetivos-ted:access-all";
export const TED_PERM_USUARIOS = "gestion-usuarios-prisma:access-all";

export function flatten_permission_slugs(
  perms_by_app: Record<string, string[]>,
): string[] {
  const out = new Set<string>();
  for (const list of Object.values(perms_by_app)) {
    for (const slug of list) {
      if (slug) out.add(slug);
    }
  }
  return [...out];
}

export function has_permission_slug(
  perms_by_app: Record<string, string[]>,
  slug: string,
): boolean {
  return Object.values(perms_by_app).some((list) => list.includes(slug));
}

export function ted_role_slug(
  roles_by_app: Record<string, string>,
): string | null {
  const role = roles_by_app[TED_APP_SLUG]?.trim().toLowerCase();
  return role || null;
}

export function is_ted_operator_role(role: string | null | undefined): boolean {
  return (role ?? "").toLowerCase() === TED_ROLE_OPERATOR;
}

export function is_ted_gerencia_role(role: string | null | undefined): boolean {
  return (role ?? "").toLowerCase() === TED_ROLE_GERENCIA;
}
