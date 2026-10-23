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
  userDept?: string | null,
): boolean {
  const roles = collect_user_roles(userRolesByApp, globalRole);

  if (roles.some((r) => r === "admin" || r === "superadmin")) {
    return true;
  }

  // App-specific rule for Satisfacción de Clientes:
  // Visible only for Negocios, TED, Calidad, and admin/superadmins
  if (app.id === "satisfaccion-clientes") {
    // 1. Roles in Negocios (sgestion/negocios), Calidad (scalidad/calidad), or TED
    if (
      userRolesByApp.sgestion ||
      userRolesByApp.negocios ||
      userRolesByApp.scalidad ||
      userRolesByApp.calidad ||
      userRolesByApp.ted
    ) {
      return true;
    }
    // 2. Department check
    const deptUpper = userDept?.toUpperCase() || "";
    if (
      deptUpper.includes("NEGOCIOS") ||
      deptUpper.includes("GESTION") ||
      deptUpper.includes("CALIDAD") ||
      deptUpper.includes("TED")
    ) {
      return true;
    }
    return false;
  }

  if (app.requiredRoles && app.requiredRoles.length > 0) {
    const allowed = app.requiredRoles.map((r) => r.toLowerCase());
    return roles.some((r) => allowed.includes(r));
  }

  return true;
}
