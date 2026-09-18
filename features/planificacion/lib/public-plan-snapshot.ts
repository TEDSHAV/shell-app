import type { PlanWorkspaceData } from "./types";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,48}$/;

export function is_public_snapshot_token(token: string): boolean {
  return TOKEN_RE.test(token);
}

export function as_plan_workspace_data(
  value: unknown,
): PlanWorkspaceData | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { apps?: unknown; usuarios?: unknown };
  if (!Array.isArray(row.apps) || !Array.isArray(row.usuarios)) return null;
  return row as PlanWorkspaceData;
}
