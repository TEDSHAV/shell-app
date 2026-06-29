import type { AppConfig } from "@/types";

function collect_user_roles(
  userRolesByApp: Record<string, string>,
  globalRole?: string,
): string[] {
  const roles = new Set<string>();
  for (const role of Object.values(userRolesByApp)) {
    const lower = role?.toLowerCase();
    if (lower) roles.add(lower);
  }
  const global = globalRole?.toLowerCase();
  if (global) roles.add(global);
  return [...roles];
}

export function can_access_shell_app(
  app: AppConfig,
  userRolesByApp: Record<string, string>,
  globalRole?: string,
): boolean {
  const roles = collect_user_roles(userRolesByApp, globalRole);

  if (roles.some((r) => r === "admin" || r === "superadmin")) {
    return true;
  }

  if (app.requiredRoles && app.requiredRoles.length > 0) {
    const allowed = app.requiredRoles.map((r) => r.toLowerCase());
    return roles.some((r) => allowed.includes(r));
  }

  return true;
}

const REQUISICIONES_ROLES = ["admin", "lider", "superadmin"] as const;

export function can_access_requisiciones(
  userRolesByApp: Record<string, string>,
  globalRole?: string,
): boolean {
  const roles = collect_user_roles(userRolesByApp, globalRole);
  return roles.some((r) =>
    REQUISICIONES_ROLES.includes(r as (typeof REQUISICIONES_ROLES)[number]),
  );
}
