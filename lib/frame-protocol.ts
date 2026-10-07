/**
 * Protocolo postMessage Shell ↔ apps embebidas (iframes `embedMode: "shell"`).
 * Debe coincidir con `SGestion/apps/web/src/lib/shell/shell-frame-protocol.ts`.
 *
 * - App → Shell `SHELL_FRAME_READY`: anuncia capacidades (`navigate`, `visibility`).
 * - Shell → App `SHELL_NAVIGATE_TO`: navegar dentro del iframe existente en vez
 *   de crear uno nuevo (cada iframe nuevo es un arranque completo de la app).
 * - App → Shell `SHELL_NAVIGATE_ACK`: confirma o rechaza la navegación.
 * - Shell → App `SHELL_FRAME_VISIBILITY`: el iframe quedó oculto o visible en
 *   la caché de frames (`visibility:hidden` no pausa el JS del iframe).
 *
 * Las apps que no anuncian capacidades siguen funcionando como antes.
 */
import { apps } from "@/config/apps";

export const SHELL_FRAME_READY = "SHELL_FRAME_READY";
export const SHELL_NAVIGATE_TO = "SHELL_NAVIGATE_TO";
export const SHELL_NAVIGATE_ACK = "SHELL_NAVIGATE_ACK";
export const SHELL_FRAME_VISIBILITY = "SHELL_FRAME_VISIBILITY";

export type FrameCapability = "navigate" | "visibility";

const capabilities_by_window = new WeakMap<Window, Set<string>>();
/** Origen de cada ventana según su READY (no se puede leer `location` cross-origin). */
const frame_origins = new WeakMap<Window, string>();
/** Ventanas que anunciaron `navigate`; se purgan las de iframes ya removidos. */
const navigable_windows = new Set<Window>();
const pending_acks = new Map<string, (ok: boolean) => void>();
const ready_listeners = new Set<(source: Window) => void>();

let allowed_origins: Set<string> | null = null;
let listening = false;
let next_request_id = 1;

function get_allowed_origins(): Set<string> {
  if (allowed_origins) return allowed_origins;
  const origins = new Set<string>();
  for (const app of apps) {
    if (app.embedMode !== "shell" || !app.upstreamUrl) continue;
    try {
      origins.add(new URL(app.upstreamUrl).origin);
    } catch {
      // URL inválida: se ignora.
    }
  }
  allowed_origins = origins;
  return origins;
}

function on_message(event: MessageEvent): void {
  if (!get_allowed_origins().has(event.origin)) return;
  const source = event.source;
  if (!source || typeof (source as Window).postMessage !== "function") return;
  const data = event.data as { type?: unknown } | null;
  if (!data || typeof data !== "object") return;

  if (data.type === SHELL_FRAME_READY) {
    const raw = (data as { capabilities?: unknown }).capabilities;
    const capabilities = new Set(
      Array.isArray(raw)
        ? raw.filter((item): item is string => typeof item === "string")
        : [],
    );
    const win = source as Window;
    capabilities_by_window.set(win, capabilities);
    frame_origins.set(win, event.origin);
    if (capabilities.has("navigate")) {
      navigable_windows.add(win);
    }
    for (const listener of ready_listeners) {
      listener(win);
    }
    return;
  }

  if (data.type === SHELL_NAVIGATE_ACK) {
    const { requestId, ok } = data as { requestId?: unknown; ok?: unknown };
    if (typeof requestId !== "string") return;
    const resolve = pending_acks.get(requestId);
    if (resolve) {
      pending_acks.delete(requestId);
      resolve(ok === true);
    }
  }
}

export function ensure_frame_protocol_listener(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("message", on_message);
}

export function frame_supports(
  win: Window | null | undefined,
  capability: FrameCapability,
): boolean {
  if (!win) return false;
  return capabilities_by_window.get(win)?.has(capability) ?? false;
}

/** Hay un iframe vivo de ese origen que navega por mensaje (no hace falta prefetch del HTML). */
export function has_live_navigable_frame(origin: string): boolean {
  for (const win of navigable_windows) {
    let closed = true;
    try {
      closed = win.closed;
    } catch {
      closed = true;
    }
    if (closed) {
      navigable_windows.delete(win);
      continue;
    }
    if (frame_origins.get(win) === origin) return true;
  }
  return false;
}

export function subscribe_frame_ready(
  listener: (source: Window) => void,
): () => void {
  ready_listeners.add(listener);
  return () => {
    ready_listeners.delete(listener);
  };
}

/** Pide al iframe navegar a `path`; resuelve `false` si no confirma a tiempo. */
export function request_frame_navigation(
  win: Window,
  target_origin: string,
  path: string,
  timeout_ms = 2500,
): Promise<boolean> {
  const request_id = `nav-${Date.now()}-${next_request_id++}`;
  return new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => {
      pending_acks.delete(request_id);
      resolve(false);
    }, timeout_ms);
    pending_acks.set(request_id, (ok) => {
      window.clearTimeout(timer);
      resolve(ok);
    });
    try {
      win.postMessage(
        { type: SHELL_NAVIGATE_TO, requestId: request_id, path },
        target_origin,
      );
    } catch {
      window.clearTimeout(timer);
      pending_acks.delete(request_id);
      resolve(false);
    }
  });
}

export function post_frame_visibility(
  win: Window,
  target_origin: string,
  visible: boolean,
): void {
  try {
    win.postMessage({ type: SHELL_FRAME_VISIBILITY, visible }, target_origin);
  } catch {
    // Iframe removido o de otro origen: se ignora.
  }
}
