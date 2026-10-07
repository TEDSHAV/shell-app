"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAppById } from "@/config/apps";
import { buildFrameUrl } from "@/lib/frame-url";
import { use_shell_pathname } from "@/lib/shell-iframe-nav";
import { setActiveFrameWindow } from "@/lib/active-frame-window";
import { getActiveFramePath, setActiveFramePath } from "@/lib/active-frame-path";
import {
  ensure_frame_protocol_listener,
  frame_supports,
  post_frame_visibility,
  request_frame_navigation,
  subscribe_frame_ready,
} from "@/lib/frame-protocol";

const MAX_CACHED_FRAMES = 6;

interface PersistentAppFrameProps {
  appId: string;
}

function getSubPath(pathname: string, basePath: string): string {
  const rest = pathname.slice(basePath.length);
  return rest.startsWith("/") ? rest.slice(1) : rest;
}

interface FrameEntry {
  /** Stable React key — never changes after mount. */
  id: number;
  /** URL passed to <iframe src> on mount. Never changes after mount so the
   *  browser never reloads an existing iframe. */
  initialSrc: string;
  /** Logical current URL of this iframe. Updated when the iframe navigates
   *  internally so we can match it against future activeSrc values without
   *  creating a new iframe. */
  currentSrc: string;
}

let nextFrameId = 1;

function url_origin(src: string): string | null {
  try {
    return new URL(src).origin;
  } catch {
    return null;
  }
}

/** pathname + search de la URL del frame (lo que la app interpreta como ruta). */
function url_internal_path(src: string): string | null {
  try {
    const url = new URL(src);
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function PersistentAppFrame({ appId }: PersistentAppFrameProps) {
  const pathname = use_shell_pathname();
  const app = getAppById(appId)!;

  const subPath = useMemo(
    () => getSubPath(pathname, app.basePath),
    [pathname, app.basePath],
  );

  const activeSrc = useMemo(
    () => buildFrameUrl(appId, subPath || undefined),
    [appId, subPath],
  );

  const [frames, setFrames] = useState<FrameEntry[]>(() => [
    { id: nextFrameId++, initialSrc: activeSrc, currentSrc: activeSrc },
  ]);
  const [loadedSrcs, setLoadedSrcs] = useState<Set<string>>(() => new Set());
  const [isLoadingActive, setIsLoadingActive] = useState(true);

  // Espejo de `frames` para decidir fuera del updater de setFrames (que no
  // debe tener efectos: StrictMode lo invoca dos veces).
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensure_frame_protocol_listener();
  }, []);

  /** contentWindow de un frame por id (sin refs extra: la ref del activo ya tiene efectos). */
  const getFrameWindow = useCallback((id: number): Window | null => {
    const el = containerRef.current?.querySelector<HTMLIFrameElement>(
      `iframe[data-frame-id="${id}"]`,
    );
    return el?.contentWindow ?? null;
  }, []);

  // Latest activeSrc in a ref so the effect closure sees the current value
  // without re-running on every activeSrc change (we read the active-frame
  // path inside the effect to decide whether to create a new iframe).
  const activeSrcRef = useRef(activeSrc);
  activeSrcRef.current = activeSrc;

  useEffect(() => {
    const current = activeSrcRef.current;
    const activePath = getActiveFramePath();

    // Navegación del Shell (sidebar/breadcrumb/back) hacia otra ruta de la
    // misma app: si el iframe activo sabe navegar por mensaje, se reutiliza
    // en vez de arrancar otra instancia completa de la app.
    const snapshot = framesRef.current;
    const activeFrame = snapshot[0];
    const alreadyCached = snapshot.some((f) => f.currentSrc === current);
    const reportedByFrame = (() => {
      if (!activeFrame || !activePath) return false;
      const expectedSubPath = activePath.split("?")[0].replace(/^\//, "");
      return buildFrameUrl(appId, expectedSubPath || undefined) === current;
    })();
    if (activeFrame && !alreadyCached && !reportedByFrame) {
      const win = getFrameWindow(activeFrame.id);
      const origin = url_origin(current);
      const path = url_internal_path(current);
      if (
        win &&
        origin &&
        path &&
        origin === url_origin(activeFrame.initialSrc) &&
        frame_supports(win, "navigate")
      ) {
        const previousSrc = activeFrame.currentSrc;
        setFrames((prev) =>
          prev[0]?.id === activeFrame.id
            ? [{ ...prev[0], currentSrc: current }, ...prev.slice(1)]
            : prev,
        );
        void request_frame_navigation(win, origin, path).then((ok) => {
          if (ok || activeSrcRef.current !== current) return;
          // Sin confirmación: comportamiento anterior (iframe nuevo).
          setFrames((prev) => {
            if (prev.some((f) => f.initialSrc === current)) return prev;
            const restored = prev.map((f) =>
              f.id === activeFrame.id ? { ...f, currentSrc: previousSrc } : f,
            );
            const entry: FrameEntry = {
              id: nextFrameId++,
              initialSrc: current,
              currentSrc: current,
            };
            return [entry, ...restored].slice(0, MAX_CACHED_FRAMES);
          });
        });
        return;
      }
    }

    setFrames((prev) => {
      // Case 1: an existing frame already has this URL as its currentSrc.
      // This happens when the user navigates back to a previously visited
      // page (cached iframe) OR when the active iframe itself navigated
      // here internally. In both cases we just activate it — no new iframe.
      const existing = prev.find((f) => f.currentSrc === current);
      if (existing) {
        // Move it to the front (most recently used) and cap the cache.
        const without = prev.filter((f) => f.id !== existing.id);
        return [{ ...existing }, ...without].slice(0, MAX_CACHED_FRAMES);
      }

      // Case 2: the active iframe just navigated internally to this URL.
      // ShellURLSync recorded the active iframe's reported path, which
      // matches the new subPath. Update the active frame's currentSrc
      // instead of creating a new iframe — the iframe already shows this
      // page, so no reload is needed.
      const activeFrame = prev[0];
      if (activeFrame && activePath) {
        const expectedPathOnly = activePath.split("?")[0];
        const expectedSubPath = expectedPathOnly.replace(/^\//, "");
        const expectedSrc = buildFrameUrl(appId, expectedSubPath || undefined);
        if (expectedSrc === current) {
          const updated = { ...activeFrame, currentSrc: current };
          const rest = prev.slice(1);
          return [updated, ...rest].slice(0, MAX_CACHED_FRAMES);
        }
      }

      // Case 3: shell-initiated navigation (sidebar/breadcrumb). Create a
      // new iframe entry. The existing active frame stays in the cache so
      // the user can navigate back to it.
      const entry: FrameEntry = {
        id: nextFrameId++,
        initialSrc: current,
        currentSrc: current,
      };
      return [entry, ...prev].slice(0, MAX_CACHED_FRAMES);
    });
  }, [activeSrc, appId, getFrameWindow]);

  // Determine whether the active frame is loaded. We track loaded srcs by
  // the frame's initialSrc (the <iframe src> attribute), since onLoad
  // fires for that URL. The active frame's currentSrc may differ from its
  // initialSrc after internal navigation, but in that case it's already
  // loaded (it navigated internally, no new load event).
  const activeFrame = frames[0];
  const activeIsLoaded = activeFrame
    ? loadedSrcs.has(activeFrame.initialSrc) ||
      activeFrame.currentSrc !== activeFrame.initialSrc
    : false;

  useEffect(() => {
    setIsLoadingActive(!activeIsLoaded);
  }, [activeIsLoaded]);

  // Avisar a cada iframe si quedó visible u oculto en la caché, para que pause
  // refetch/realtime mientras no se ve (si la app lo soporta).
  const postVisibility = useCallback(() => {
    framesRef.current.forEach((frame, index) => {
      const win = getFrameWindow(frame.id);
      const origin = url_origin(frame.initialSrc);
      if (win && origin && frame_supports(win, "visibility")) {
        post_frame_visibility(win, origin, index === 0);
      }
    });
  }, [getFrameWindow]);

  useEffect(() => {
    postVisibility();
  }, [frames, postVisibility]);

  useEffect(() => subscribe_frame_ready(() => postVisibility()), [postVisibility]);

  const handleFrameLoad = useCallback(
    (initialSrc: string) => {
      setLoadedSrcs((prev) => {
        const next = new Set(prev);
        next.add(initialSrc);
        return next;
      });
    },
    [],
  );

  // Track the active iframe's contentWindow so ShellURLSync can filter
  // IFRAME_NAVIGATION messages from background/cached iframes. The ref
  // callback runs during React's commit phase, before any effects or
  // message events, so the active window is set before URLSync can fire.
  const setActiveRef = useCallback((el: HTMLIFrameElement | null) => {
    setActiveFrameWindow(el?.contentWindow ?? null);
    if (!el) {
      // Clear the active frame path when the active iframe unmounts so
      // stale paths don't cause false matches on the next navigation.
      setActiveFramePath(null);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-0 h-full w-full overflow-hidden"
    >
      {frames.map((frame, index) => {
        const isActive = index === 0;
        return (
          <iframe
            key={frame.id}
            src={frame.initialSrc}
            data-frame-id={frame.id}
            ref={isActive ? setActiveRef : undefined}
            title={app.name}
            className="absolute inset-0 h-full w-full border-0"
            style={{
              visibility: isActive ? "visible" : "hidden",
              pointerEvents: isActive ? "auto" : "none",
            }}
            onLoad={() => handleFrameLoad(frame.initialSrc)}
            allow="clipboard-read; clipboard-write"
          />
        );
      })}
      {isLoadingActive && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-background"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Cargando {app.name}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
