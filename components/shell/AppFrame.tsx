"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppFrameProps } from "@/types";

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

export function AppFrame({ appId, src, title }: AppFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const redirectInFlightRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const expectedOrigin = useMemo(() => {
    try {
      return new URL(src).origin;
    } catch {
      return null;
    }
  }, [src]);

  const redirectToLogin = useCallback(() => {
    if (redirectInFlightRef.current) {
      return;
    }
    redirectInFlightRef.current = true;
    const loginBase = process.env.NEXT_PUBLIC_SHELL_LOGIN_URL || DEFAULT_LOGIN_URL;
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
    const onMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) {
        return;
      }
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

      try {
        iframeWindow.postMessage(
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
  }, [appId, expectedOrigin, redirectToLogin]);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    redirectInFlightRef.current = false;
  }, [src]);

  return (
    <div className="relative flex-1 min-h-0 h-full w-full overflow-hidden">
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        allow="clipboard-read; clipboard-write"
      />
      {isLoading && !hasError && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-background"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cargando {title}...</p>
          </div>
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm p-6">
            <p className="text-sm font-medium text-foreground">
              No se pudo cargar {title}
            </p>
            <p className="text-xs text-muted-foreground">
              Verifica que la aplicación esté disponible e intenta nuevamente.
            </p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (iframeRef.current) {
                  iframeRef.current.src = src;
                }
              }}
              className="mt-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}