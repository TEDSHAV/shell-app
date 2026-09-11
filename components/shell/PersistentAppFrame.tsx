"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAppById } from "@/config/apps";
import { buildFrameUrl } from "@/lib/frame-url";
import { use_shell_pathname } from "@/lib/shell-iframe-nav";
import { setActiveFrameWindow } from "@/lib/active-frame-window";

const MAX_CACHED_FRAMES = 6;

interface PersistentAppFrameProps {
  appId: string;
}

function getSubPath(pathname: string, basePath: string): string {
  const rest = pathname.slice(basePath.length);
  return rest.startsWith("/") ? rest.slice(1) : rest;
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

  const [cachedSrcs, setCachedSrcs] = useState<string[]>([activeSrc]);
  const [loadedSrcs, setLoadedSrcs] = useState<Set<string>>(() => new Set());
  const [isLoadingActive, setIsLoadingActive] = useState(true);

  useEffect(() => {
    setCachedSrcs((prev) => {
      const withoutActive = prev.filter((src) => src !== activeSrc);
      return [activeSrc, ...withoutActive].slice(0, MAX_CACHED_FRAMES);
    });
  }, [activeSrc]);

  useEffect(() => {
    setIsLoadingActive(!loadedSrcs.has(activeSrc));
  }, [activeSrc, loadedSrcs]);

  const handleFrameLoad = useCallback(
    (src: string) => {
      setLoadedSrcs((prev) => {
        const next = new Set(prev);
        next.add(src);
        return next;
      });
      if (src === activeSrc) {
        setIsLoadingActive(false);
      }
    },
    [activeSrc],
  );

  // Track the active iframe's contentWindow so ShellURLSync can filter
  // IFRAME_NAVIGATION messages from background/cached iframes. The ref
  // callback runs during React's commit phase, before any effects or
  // message events, so the active window is set before URLSync can fire.
  const setActiveRef = useCallback((el: HTMLIFrameElement | null) => {
    setActiveFrameWindow(el?.contentWindow ?? null);
  }, []);

  return (
    <div className="relative flex-1 min-h-0 h-full w-full overflow-hidden">
      {cachedSrcs.map((src) => {
        const isActive = src === activeSrc;
        return (
          <iframe
            key={src}
            src={src}
            ref={isActive ? setActiveRef : undefined}
            title={app.name}
            className="absolute inset-0 h-full w-full border-0"
            style={{
              visibility: isActive ? "visible" : "hidden",
              pointerEvents: isActive ? "auto" : "none",
            }}
            onLoad={() => handleFrameLoad(src)}
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
