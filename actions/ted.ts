"use server";

import { cache } from "react";
import { getUsuarioDepartamento } from "@/actions/apps";

/**
 * Returns true if the current logged-in user belongs to the "TED"
 * department (programmers). Matches `departamentos.nombre` case-insensitively
 * against "TED" via the `usuarios.departamento` foreign key.
 *
 * Uses the shared cached `getUsuarioDepartamento` lookup so it doesn't
 * re-fetch auth.getUser + usuarios + departamentos on every call — those
 * are already fetched by the shell layout and shared via React cache().
 */
export const isTedMember = cache(async (): Promise<boolean> => {
  try {
    const deptName = await getUsuarioDepartamento();
    if (!deptName) return false;
    return deptName.trim().toLowerCase() === "ted";
  } catch (error) {
    console.error("[isTedMember] Unexpected error:", error);
    return false;
  }
});
