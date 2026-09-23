"use server";

import { cache } from "react";
import { getUserPermissionsByApp, getUserRolesByApp } from "@/actions/apps";
import {
  TED_PERM_OBJETIVOS,
  TED_PERM_PLANIFICACION,
  TED_PERM_USUARIOS,
  has_permission_slug,
  is_ted_gerencia_role,
  is_ted_operator_role,
  ted_role_slug,
} from "@/lib/ted-slugs";

export const getTedAppRole = cache(async (): Promise<string | null> => {
  const roles = await getUserRolesByApp();
  return ted_role_slug(roles);
});

/**
 * Operador TED (rol `ted` en app `ted`): hub, planificación writable,
 * usuarios/accesos, tickets inbox TED.
 */
export const isTedMember = cache(async (): Promise<boolean> => {
  try {
    const role = await getTedAppRole();
    if (is_ted_operator_role(role)) return true;
    // Permiso de usuarios implica operador aunque el slug de rol cambie.
    const perms = await getUserPermissionsByApp();
    return has_permission_slug(perms, TED_PERM_USUARIOS);
  } catch (error) {
    console.error("[isTedMember] Unexpected error:", error);
    return false;
  }
});

/** Rol `gerencia` en app TED (antes: allowlist hardcodeada de usuarios). */
export const isPlanGerenciaUser = cache(async (): Promise<boolean> => {
  try {
    return is_ted_gerencia_role(await getTedAppRole());
  } catch (error) {
    console.error("[isPlanGerenciaUser] Unexpected error:", error);
    return false;
  }
});

/** Cualquier rol/permiso de la app TED (operador o gerencia). */
export const canAccessTedApp = cache(async (): Promise<boolean> => {
  if (await isTedMember()) return true;
  if (await isPlanGerenciaUser()) return true;
  const perms = await getUserPermissionsByApp();
  return (
    has_permission_slug(perms, TED_PERM_OBJETIVOS) ||
    has_permission_slug(perms, TED_PERM_PLANIFICACION)
  );
});

export const canReadObjetivosArea = cache(async (): Promise<boolean> => {
  if (await isTedMember()) return true;
  if (await isPlanGerenciaUser()) return true;
  const perms = await getUserPermissionsByApp();
  return has_permission_slug(perms, TED_PERM_OBJETIVOS);
});

/** Crear/editar objetivos: permiso objetivos (TED y gerencia lo tienen). */
export const canWriteObjetivos = cache(async (): Promise<boolean> => {
  const perms = await getUserPermissionsByApp();
  if (has_permission_slug(perms, TED_PERM_OBJETIVOS)) return true;
  return is_ted_operator_role(await getTedAppRole());
});

/** Cubrir / mutar tareas del plan: solo operadores TED. */
export const canWritePlanTareas = isTedMember;

/** Consola de accesos y manejo de usuarios Prisma. */
export const canManageUsuariosPrisma = cache(async (): Promise<boolean> => {
  const perms = await getUserPermissionsByApp();
  if (has_permission_slug(perms, TED_PERM_USUARIOS)) return true;
  return is_ted_operator_role(await getTedAppRole());
});
