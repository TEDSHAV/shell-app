"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAppById } from "@/config/apps";
import { buildFrameUrl } from "@/lib/frame-url";
import { use_shell_pathname } from "@/lib/shell-iframe-nav";
import { setActiveFrameWindow } from "@/lib/active-frame-window";
import { getActiveFramePath, setActiveFramePath } from "@/lib/active-frame-path";

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

  // Latest activeSrc in a ref so the effect closure sees the current value
  // without re-running on every activeSrc change (we read the active-frame
  // path inside the effect to decide whether to create a new iframe).
  const activeSrcRef = useRef(activeSrc);
  activeSrcRef.current = activeSrc;

  useEffect(() => {
    const current = activeSrcRef.current;
    const activePath = getActiveFramePath();

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
  }, [activeSrc, appId]);

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
    <div className="relative flex-1 min-h-0 h-full w-full overflow-hidden">
      {frames.map((frame, index) => {
        const isActive = index === 0;
        return (
          <iframe
            key={frame.id}
            src={frame.initialSrc}
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
