"use server";

import { build_osi_preview_data, type OsiPreviewData } from "@sha/osi-formato";
import { getOSIPreviewBundle, getUserOSIAccessFilter } from "@/actions/osi";

type Result = { ok: true; data: OsiPreviewData } | { ok: false; error: string };

/** Datos del formato OSI para la vista previa del calendario. Mismo control de acceso que /consulta-osi/preview. */
export async function getOSIPreviewData(osiId: number): Promise<Result> {
  if (!Number.isFinite(osiId) || osiId <= 0) return { ok: false, error: "OSI inválida" };

  const [access, bundle] = await Promise.all([getUserOSIAccessFilter(), getOSIPreviewBundle(osiId)]);
  if (access === "none") return { ok: false, error: "Sin acceso a OSIs" };
  if (!bundle) return { ok: false, error: "No se encontró la OSI" };

  const tipo = String(bundle.view_row?.tipo_servicio ?? "").toUpperCase();
  if (access === "capacitacion" && !tipo.includes("CAPACITACION")) return { ok: false, error: "Sin acceso a esta OSI" };
  if (access === "servicios_tecnicos" && !tipo.includes("SERVICIOS TECNICOS") && !tipo.includes("SERVICIO TECNICO")) {
    return { ok: false, error: "Sin acceso a esta OSI" };
  }

  return { ok: true, data: build_osi_preview_data(bundle) };
}
