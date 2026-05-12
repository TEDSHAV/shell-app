import type { ErrorEvent } from "@sentry/core";
import * as Sentry from "@sentry/nextjs";

function pick_user_id(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as { user?: unknown };
  const user = record.user;
  if (!user || typeof user !== "object") return undefined;
  const id = (user as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

function add_host_pattern(
  targets: (string | RegExp)[],
  url: string | undefined,
): void {
  if (!url) return;
  try {
    const host = new URL(url).host;
    const escaped = host.replace(/\./g, "\\.");
    targets.push(new RegExp(`^https?:\\/\\/${escaped}(\\/|$)`));
  } catch {
    targets.push(url);
  }
}

/**
 * Resolve user id for Sentry: shell bridge key, custom LS key, or Supabase
 * browser storage (`*-auth-token`).
 */
function read_client_user_id_for_sentry(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const shell_id = window.localStorage.getItem("sha-session-id");
    if (shell_id) return shell_id;
    const custom_key = process.env.NEXT_PUBLIC_SENTRY_USER_LS_KEY;
    if (custom_key) {
      const custom = window.localStorage.getItem(custom_key);
      if (custom) return custom;
    }
  } catch {
    return undefined;
  }
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.endsWith("-auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const data: unknown = JSON.parse(raw);
      const direct = pick_user_id(data);
      if (direct) return direct;
      if (data && typeof data === "object" && "currentSession" in data) {
        const nested = pick_user_id(
          (data as { currentSession?: unknown }).currentSession,
        );
        if (nested) return nested;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function build_trace_propagation_targets(): (string | RegExp)[] {
  const targets: (string | RegExp)[] = ["localhost"];
  add_host_pattern(targets, process.env.NEXT_PUBLIC_SUPABASE_URL);
  add_host_pattern(targets, process.env.NEXT_PUBLIC_APP_URL);
  add_host_pattern(targets, process.env.NEXT_PUBLIC_NEGOCIOS_URL);
  add_host_pattern(targets, process.env.NEGOCIOS_INTERNAL_URL);
  add_host_pattern(targets, process.env.NEXT_PUBLIC_CAPACITACION_URL);
  add_host_pattern(targets, process.env.CAPACITACION_INTERNAL_URL);
  return targets;
}

const is_dev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  tracesSampleRate: is_dev ? 1.0 : 0.1,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  tracePropagationTargets: build_trace_propagation_targets(),

  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NODE_ENV,

  beforeSend(event: ErrorEvent) {
    const user_id = read_client_user_id_for_sentry();
    if (user_id) {
      event.user = { ...event.user, id: user_id };
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
