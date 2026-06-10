"use client";

import { useEffect, useRef } from "react";
import { apps } from "@/config/apps";

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

function get_shell_app_origins(): Set<string> {
  const origins = new Set<string>();
  for (const app of apps) {
    if (app.embedMode !== "shell") {
      continue;
    }
    try {
      origins.add(new URL(app.upstreamUrl).origin);
    } catch {
      // Ignore invalid upstream URLs.
    }
  }
  return origins;
}

/**
 * Listens for auth-required postMessages from embedded apps and redirects
 * the full shell window to login (never the iframe alone).
 */
export function ShellAuthBridge() {
  const redirect_in_flight_ref = useRef(false);
  const expiry_notice_shown_ref = useRef(false);
  const allowed_origins_ref = useRef<Set<string> | null>(null);

  useEffect(() => {
    allowed_origins_ref.current = get_shell_app_origins();

    const redirect_to_login = () => {
      if (redirect_in_flight_ref.current) {
        return;
      }
      redirect_in_flight_ref.current = true;

      const login_base =
        process.env.NEXT_PUBLIC_SHELL_LOGIN_URL || DEFAULT_LOGIN_URL;
      const next_path = `${window.location.pathname}${window.location.search}`;

      try {
        const login_url = new URL(login_base);
        login_url.searchParams.set("next", next_path);
        window.location.assign(login_url.toString());
      } catch {
        const separator = login_base.includes("?") ? "&" : "?";
        window.location.assign(
          `${login_base}${separator}next=${encodeURIComponent(next_path)}`,
        );
      }
    };

    const on_message = (event: MessageEvent) => {
      const allowed = allowed_origins_ref.current;
      if (!allowed?.has(event.origin)) {
        return;
      }

      const data = event.data as AuthRequiredMessage | null;
      if (!data || data.type !== AUTH_REQUIRED_EVENT) {
        return;
      }

      const source_window = event.source;
      if (source_window instanceof Window) {
        try {
          source_window.postMessage(
            {
              type: AUTH_REQUIRED_ACK_EVENT,
              appId: data.appId,
              ts: Date.now(),
            },
            event.origin,
          );
        } catch {
          // Parent redirect still proceeds.
        }
      }

      if (data.reason === "session_expired" && !expiry_notice_shown_ref.current) {
        expiry_notice_shown_ref.current = true;
        window.alert("Sesion expirada. Redirigiendo a inicio de sesion.");
      }

      redirect_to_login();
    };

    window.addEventListener("message", on_message);
    return () => {
      window.removeEventListener("message", on_message);
    };
  }, []);

  return null;
}
