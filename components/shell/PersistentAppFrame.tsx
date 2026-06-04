"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAppById } from "@/config/apps";
import { buildFrameUrl } from "@/lib/frame-url";

const MAX_CACHED_FRAMES = 6;
const AUTH_REQUIRED_EVENT = "SHA_AUTH_REQUIRED";
const AUTH_REQUIRED_ACK_EVENT = "SHA_AUTH_ACK";
const DEFAULT_LOGIN_URL = "https://prisma.shadevenezuela.com.ve/auth/login";

type AuthRequiredMessage = {
  type?: string;
  appId?: string;
  reason?: string;
  currentPath?: string;
  ts?: number;
};

interface PersistentAppFrameProps {
  appId: string;
}

function getSubPath(pathname: string, basePath: string): string {
  const rest = pathname.slice(basePath.length);
  return rest.startsWith("/") ? rest.slice(1) : rest;
}

export function PersistentAppFrame({ appId }: PersistentAppFrameProps) {
  const pathname = usePathname();
  const app = getAppById(appId)!;
  const redirectInFlightRef = useRef(false);

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

  const expectedOrigin = useMemo(() => {
    try {
      return new URL(activeSrc).origin;
    } catch {
      return null;
    }
  }, [activeSrc]);

  const redirectToLogin = useCallback(() => {
    if (redirectInFlightRef.current) {
      return;
    }
    redirectInFlightRef.current = true;
    const loginBase =
      process.env.NEXT_PUBLIC_SHELL_LOGIN_URL || DEFAULT_LOGIN_URL;
    const nextPath = `${window.location.pathname}${window.location.search}`;
    try {
      const loginUrl = new URL(loginBase);
      loginUrl.searchParams.set("next", nextPath);
      window.location.assign(loginUrl.toString());
    } catch {
      const separator = loginBase.includes("?") ? "&" : "?";
      window.location.assign(
        `${loginBase}${separator}next=${encodeURIComponent(nextPath)}`,
      );
    }
  }, []);

  useEffect(() => {
    redirectInFlightRef.current = false;
  }, [activeSrc]);

  useEffect(() => {
    if (app.embedMode !== "shell") {
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (expectedOrigin && event.origin !== expectedOrigin) {
        return;
      }

      const data = event.data as AuthRequiredMessage | null;
      if (!data || data.type !== AUTH_REQUIRED_EVENT) {
        return;
      }
      if (data.appId && data.appId !== appId) {
        return;
      }

      const sourceWindow = event.source;
      if (!(sourceWindow instanceof Window)) {
        return;
      }

      try {
        sourceWindow.postMessage(
          {
            type: AUTH_REQUIRED_ACK_EVENT,
            appId,
            ts: Date.now(),
          },
          event.origin,
        );
      } catch {
        // Ignore ack errors; redirect still must happen.
      }

      redirectToLogin();
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [app, appId, expectedOrigin, redirectToLogin]);

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

  return (
    <div className="relative flex-1 min-h-0 h-full w-full overflow-hidden">
      {cachedSrcs.map((src) => {
        const isActive = src === activeSrc;
        return (
          <iframe
            key={src}
            src={src}
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
