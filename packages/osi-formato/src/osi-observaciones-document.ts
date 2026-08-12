import { strip_legacy_osi_concat_markers } from "./rich-html";

const OBS_EJECUCION_PIPE_RE = /\s*\|\s*OBS\.\s*EJECUCIÓN:\s*/i;

export type OsiObservacionDocumentItem = {
  servicio?: string;
  etiqueta: string;
  contenido: string;
  maskKey?: string;
};

function normalize_observacion_text(value: string | null | undefined): string {
  return strip_legacy_osi_concat_markers(String(value ?? "").trim());
}

function split_observaciones_legacy_pipe(value: string): {
  solped: string;
  obs_ejecucion: string | null;
} {
  const match = value.match(OBS_EJECUCION_PIPE_RE);
  if (!match || match.index === undefined) {
    return { solped: value.trim(), obs_ejecucion: null };
  }
  return {
    solped: value.slice(0, match.index).trim(),
    obs_ejecucion: value.slice(match.index + match[0].length).trim(),
  };
}

export function build_osi_observaciones_document_items(params: {
  stServicios?: Array<{
    nombre: string;
    observaciones?: string | null;
  }>;
  observacionesSolped?: string | null;
  observacionesOsiSolicitud?: string | null;
  observacionesOsi?: string | null;
  hideOsiSolicitud?: boolean;
}): OsiObservacionDocumentItem[] {
  const items: OsiObservacionDocumentItem[] = [];

  for (const svc of params.stServicios ?? []) {
    const contenido = normalize_observacion_text(svc.observaciones);
    if (!contenido) continue;
    items.push({
      servicio: svc.nombre,
      etiqueta: "SOLPED",
      contenido,
      maskKey: `osi_content_hidden:obs:${items.length}`,
    });
  }

  if (items.length === 0) {
    const solped_raw = normalize_observacion_text(params.observacionesSolped);
    if (solped_raw) {
      const split = split_observaciones_legacy_pipe(solped_raw);
      if (split.solped) {
        items.push({
          etiqueta: "SOLPED",
          contenido: split.solped,
          maskKey: "osi_content_hidden:obs:base",
        });
      }
      if (split.obs_ejecucion) {
        items.push({
          etiqueta: "OBS. EJECUCIÓN",
          contenido: split.obs_ejecucion,
        });
      }
    }
  }

  if (!params.hideOsiSolicitud) {
    const obs_solicitud = normalize_observacion_text(
      params.observacionesOsiSolicitud,
    );
    if (obs_solicitud) {
      const split = split_observaciones_legacy_pipe(obs_solicitud);
      const candidatos = [split.solped, split.obs_ejecucion].filter(
        (value): value is string => Boolean(value),
      );
      for (const contenido of candidatos) {
        const exists = items.some(
          (item) =>
            item.etiqueta === "OBS. EJECUCIÓN" && item.contenido === contenido,
        );
        if (!exists) {
          items.push({
            etiqueta: "OBS. EJECUCIÓN",
            contenido,
          });
        }
      }
    }
  }

  const obs_emision = normalize_observacion_text(params.observacionesOsi);
  if (obs_emision) {
    items.push({
      etiqueta: "OSI",
      contenido: obs_emision,
    });
  }

  return items;
}
