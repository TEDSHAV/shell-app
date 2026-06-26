import { getAppById } from "@/config/apps";
import { build_tickets_frame_url } from "@/lib/tickets-form-url";

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

  const normalized = subPath?.replace(/^\//, "") ?? "";
  const path =
    appId === "reportes"
      ? normalized.length > 0
        ? `/reportes/${normalized}`
        : "/reportes"
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
