import {
  extract_osi_solicitud_observacion_text,
  strip_legacy_osi_concat_markers,
} from "./rich-html";

export type OsiObservacionDocumentItem = {
  servicio?: string;
  etiqueta: "SOLPED" | "OSI";
  contenido: string;
  maskKey?: string;
};

function normalize_observacion_text(value: string | null | undefined): string {
  return strip_legacy_osi_concat_markers(String(value ?? "").trim());
}

function plain_fingerprint(value: string | null | undefined): string {
  return normalize_observacion_text(value)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function is_same_as_detalle(
  contenido: string,
  detalle: string | null | undefined,
): boolean {
  const obs = plain_fingerprint(contenido);
  const det = plain_fingerprint(detalle);
  if (!obs || !det) return false;
  return obs === det || det.includes(obs) || obs.includes(det);
}

/** Notas libres posteriores al bloque automático SOLPED; vacío si todo es el detalle. */
export function extra_solped_observaciones(
  html: string | null | undefined,
): string | null {
  const raw = String(html ?? "");
  const lower = raw.toLowerCase();
  const auto_end = lower.indexOf("<!--/solped-auto-->");
  if (auto_end >= 0) {
    const extra = raw.slice(auto_end + "<!--/solped-auto-->".length).trim();
    return extra || null;
  }
  const qty_end = lower.indexOf("<!--/solped-qty-->");
  if (qty_end >= 0) {
    const extra = raw.slice(qty_end + "<!--/solped-qty-->".length).trim();
    return extra || null;
  }
  return null;
}

/** Delimitadores de vista (`| OSI:`) + legados (`OBS. EJECUCIÓN` / `ADICIONAL OSI`). */
const OBS_PIPE_SPLIT_RE =
  /\s*\|\s*(?:OBS\.\s*EJECUCIÓN|ADICIONAL\s+OSI|OSI)\s*:\s*/i;

function split_observaciones_legacy_pipe(value: string): {
  solped: string;
  osi: string | null;
} {
  const match = value.match(OBS_PIPE_SPLIT_RE);
  if (!match || match.index === undefined) {
    return { solped: value.trim(), osi: null };
  }
  return {
    solped: value.slice(0, match.index).trim(),
    osi: value.slice(match.index + match[0].length).trim(),
  };
}

function push_unique_obs_item(
  items: OsiObservacionDocumentItem[],
  item: OsiObservacionDocumentItem,
): void {
  const exists = items.some(
    (current) =>
      current.etiqueta === item.etiqueta &&
      current.contenido === item.contenido,
  );
  if (!exists) items.push(item);
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
  detalleServicio?: string | null;
}): OsiObservacionDocumentItem[] {
  const items: OsiObservacionDocumentItem[] = [];

  for (const svc of params.stServicios ?? []) {
    const contenido = normalize_observacion_text(svc.observaciones);
    if (!contenido) continue;
    if (is_same_as_detalle(contenido, params.detalleServicio)) continue;
    items.push({
      servicio: svc.nombre,
      etiqueta: "SOLPED",
      contenido,
      maskKey: `osi_content_hidden:obs:${items.length}`,
    });
  }

  if (items.length === 0) {
    const solped_raw = String(params.observacionesSolped ?? "").trim();
    if (solped_raw) {
      const split = split_observaciones_legacy_pipe(solped_raw);
      if (
        split.solped &&
        !is_same_as_detalle(split.solped, params.detalleServicio)
      ) {
        items.push({
          etiqueta: "SOLPED",
          contenido: normalize_observacion_text(split.solped),
          maskKey: "osi_content_hidden:obs:base",
        });
      }
      if (split.osi) {
        push_unique_obs_item(items, {
          etiqueta: "OSI",
          contenido: extract_osi_solicitud_observacion_text(split.osi),
        });
      }
    }
  }

  if (!params.hideOsiSolicitud) {
    const obs_solicitud = extract_osi_solicitud_observacion_text(
      params.observacionesOsiSolicitud,
    );
    if (
      obs_solicitud &&
      !is_same_as_detalle(obs_solicitud, params.detalleServicio)
    ) {
      push_unique_obs_item(items, {
        etiqueta: "OSI",
        contenido: obs_solicitud,
      });
    }
  }

  const obs_emision = normalize_observacion_text(params.observacionesOsi);
  if (obs_emision) {
    push_unique_obs_item(items, {
      etiqueta: "OSI",
      contenido: obs_emision,
    });
  }

  return items;
}

export { extract_osi_solicitud_observacion_text };
