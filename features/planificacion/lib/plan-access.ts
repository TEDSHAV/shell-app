export const PLAN_GERENCIA_USER_IDS = [1, 13] as const;

/**
 * @deprecated Prefer authprisma role `gerencia` on app `ted`
 * (`isPlanGerenciaUser` in actions/ted). Kept for rare offline checks.
 */
export function is_gerencia_user_id(id: number | null | undefined): boolean {
  return id === 1 || id === 13;
}
