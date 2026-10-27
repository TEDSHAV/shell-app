import { is_objetivo_terminado } from "../lib/versiones";
import type { PlanObjetivo } from "../lib/types";
import { VersionBadge } from "./versiones-tree";

/** Badge de versión solo para objetivos terminados (cumplidos o al 100%). */
export function ObjetivoVersionBadge({ objetivo }: { objetivo: PlanObjetivo }) {
  if (!objetivo.version || !is_objetivo_terminado(objetivo)) return null;
  return (
    <VersionBadge
      version={objetivo.version.version}
      estado={objetivo.version.estado}
      title={`${objetivo.version.app_nombre} v${objetivo.version.version}`}
    />
  );
}
