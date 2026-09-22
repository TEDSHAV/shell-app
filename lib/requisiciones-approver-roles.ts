import {
  isAdministracionDept,
  isCapacitacionDept,
  isServiciosTecnicosDept,
} from "@/lib/requisiciones-gerencia";

export type CoordinadorRoleMapEntry = {
  roleId: number;
  appId: number;
  appSlug: string;
  roleSlug: "coordinador";
  matchesDept: (deptName: string | null | undefined) => boolean;
};

// DEPRECATED: el runtime de requisiciones ya no usa roleId 21/22/23.
// El sello sale de slugs requisiciones:* + territorio de ficha (ver requisiciones-dept-context.ts).
export const REQUISICION_COORDINADOR_ROLES: CoordinadorRoleMapEntry[] = [
  {
    roleId: 21,
    appId: 5,
    appSlug: "st",
    roleSlug: "coordinador",
    matchesDept: isServiciosTecnicosDept,
  },
  {
    roleId: 23,
    appId: 4,
    appSlug: "sadministracion",
    roleSlug: "coordinador",
    matchesDept: isAdministracionDept,
  },
  {
    roleId: 22,
    appId: 2,
    appSlug: "scapacitacion",
    roleSlug: "coordinador",
    matchesDept: isCapacitacionDept,
  },
];

export const COORDINADOR_ROLE_IDS = REQUISICION_COORDINADOR_ROLES.map(
  (entry) => entry.roleId,
);

export function coordinadorRoleCoversDept(
  roleId: number,
  appId: number,
  deptName: string | null | undefined,
): boolean {
  const byId = REQUISICION_COORDINADOR_ROLES.find(
    (entry) => entry.roleId === roleId,
  );
  if (byId) return byId.matchesDept(deptName);
  const byApp = REQUISICION_COORDINADOR_ROLES.find(
    (entry) => entry.appId === appId && entry.roleSlug === "coordinador",
  );
  if (byApp) return byApp.matchesDept(deptName);
  return false;
}

export function coordinadorMatchersForAssignments(
  assignments: Array<{ role_id: number; app_id: number }>,
): Array<(deptName: string | null | undefined) => boolean> {
  const matchers: Array<(deptName: string | null | undefined) => boolean> = [];
  for (const row of assignments) {
    const entry =
      REQUISICION_COORDINADOR_ROLES.find((item) => item.roleId === row.role_id) ||
      REQUISICION_COORDINADOR_ROLES.find(
        (item) => item.appId === row.app_id && item.roleSlug === "coordinador",
      );
    if (entry) matchers.push(entry.matchesDept);
  }
  return matchers;
}

export function deptCoveredByCoordinadorMatchers(
  deptName: string | null | undefined,
  matchers: Array<(deptName: string | null | undefined) => boolean>,
): boolean {
  return matchers.some((matches) => matches(deptName));
}
