import { getAppById } from "@/config/apps";

export function buildFrameUrl(appId: string, subPath?: string): string {
  const app = getAppById(appId);
  if (!app) {
    throw new Error(`Unknown app: ${appId}`);
  }

  const normalized = subPath?.replace(/^\//, "") ?? "";
  const path = normalized.length > 0 ? `/${normalized}` : "";
  return `${app.upstreamUrl}${path}?shell=1`;
}

const prefetched_srcs = new Set<string>();

export function prefetchFrameUrl(src: string): void {
  if (typeof document === "undefined" || prefetched_srcs.has(src)) {
    return;
  }

  prefetched_srcs.add(src);

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = src;
  document.head.appendChild(link);
}

export function prefetchFramePath(appId: string, subPath?: string): void {
  prefetchFrameUrl(buildFrameUrl(appId, subPath));
}
