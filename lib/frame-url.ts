import { getAppById } from "@/config/apps";
import { build_tickets_frame_url } from "@/lib/tickets-form-url";

const SCAP_OSI_PREVIEW_PATH_RE =
  /^(?:scapacitacion\/)?osi\/preview\/\d+(?:\/.*)?$/;

function is_capacitacion_scap_osi_preview_path(subPath?: string): boolean {
  const normalized = subPath?.replace(/^\//, "") ?? "";
  return SCAP_OSI_PREVIEW_PATH_RE.test(normalized);
}

/** Gestion hosts SCap OSI preview at /scapacitacion/osi/preview/:id */
function gestion_scap_osi_preview_path(subPath?: string): string {
  const normalized = subPath?.replace(/^\//, "") ?? "";
  if (normalized.startsWith("scapacitacion/")) {
    return `/${normalized}`;
  }
  return `/scapacitacion/${normalized}`;
}

export function buildFrameUrl(appId: string, subPath?: string): string {
  const app = getAppById(appId);
  if (!app) {
    throw new Error(`Unknown app: ${appId}`);
  }

  if (appId === "tickets") {
    return build_tickets_frame_url();
  }

  if (app.embedMode === "native") {
    throw new Error(`App ${appId} is native and does not have a frame URL`);
  }

  if (
    appId === "capacitacion" &&
    is_capacitacion_scap_osi_preview_path(subPath)
  ) {
    const negocios = getAppById("negocios");
    if (!negocios?.upstreamUrl) {
      throw new Error("Negocios upstream URL is not configured");
    }
    const gestionPath = gestion_scap_osi_preview_path(subPath);
    return `${negocios.upstreamUrl}${gestionPath}?shell=1`;
  }

  const normalized = subPath?.replace(/^\//, "") ?? "";
  const path =
    appId === "reportes"
      ? normalized.length > 0
        ? `/reportes/${normalized}`
        : "/reportes"
      : appId === "tareas"
        ? normalized.length > 0
          ? `/${normalized}`
          : "/tareas"
        : appId === "comentarios"
          ? normalized.length > 0
            ? `/${normalized}`
            : "/comentarios"
          : normalized.length > 0
            ? `/${normalized}`
            : "";

  if (app.embedMode === "raw") {
    return `${app.upstreamUrl!}${path}`;
  }

  return `${app.upstreamUrl!}${path}?shell=1`;
}

const prefetched_srcs = new Set<string>();

function is_non_prefetchable_frame_url(src: string): boolean {
  try {
    const host = new URL(src).hostname;
    return (
      host.includes("google.com") ||
      host.includes("forms.gle") ||
      host.includes("gstatic.com")
    );
  } catch {
    return false;
  }
}

export function prefetchFrameUrl(src: string): void {
  if (
    typeof document === "undefined" ||
    prefetched_srcs.has(src) ||
    is_non_prefetchable_frame_url(src)
  ) {
    return;
  }

  prefetched_srcs.add(src);

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = src;
  document.head.appendChild(link);
}

export function prefetchFramePath(appId: string, subPath?: string): void {
  const app = getAppById(appId);
  if (!app || app.embedMode !== "shell") {
    return;
  }
  prefetchFrameUrl(buildFrameUrl(appId, subPath));
}
