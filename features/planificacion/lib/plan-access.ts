export const PLAN_GERENCIA_USER_IDS = [1, 13] as const;

export function is_gerencia_user_id(id: number | null | undefined): boolean {
  return id === 1 || id === 13;
}
