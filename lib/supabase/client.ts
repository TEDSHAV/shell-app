import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "./cookie-options";
import {
  DEV_DB_COOKIE,
  is_dev_db_switcher_enabled,
  parse_dev_db_target,
  read_target_from_cookie_header,
  type DevDbTarget,
} from "./dev-db";

type BrowserClient = ReturnType<typeof createBrowserClient>;

const global_scope = globalThis as unknown as {
  __shell_supabase_browser?: BrowserClient;
  __shell_supabase_browser_target?: string;
};

type Injected = {
  target: DevDbTarget;
  staging: { url: string; publishableKey: string } | null;
  production: { url: string; publishableKey: string } | null;
};

function injected_snapshot(): Injected | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __SHA_DEV_SB?: Injected }).__SHA_DEV_SB ?? null;
}

function browser_target(): DevDbTarget {
  const injected = injected_snapshot();
  if (injected?.target) return injected.target;
  if (typeof document !== "undefined") {
    return read_target_from_cookie_header(document.cookie);
  }
  return parse_dev_db_target(undefined);
}

function browser_public_env(): { url: string; publishableKey: string; target: DevDbTarget } {
  const target = browser_target();
  const injected = injected_snapshot();
  const from_inject =
    target === "production" ? injected?.production : injected?.staging;
  if (from_inject?.url && from_inject.publishableKey) {
    return { ...from_inject, target };
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    target,
  };
}

function create_browser_client(): BrowserClient {
  const env = browser_public_env();
  return createBrowserClient(env.url, env.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Supported at runtime by auth-js; ssr types may lag.
      // @ts-expect-error valid runtime option
      lockAcquireTimeout: 20000,
    },
    cookieOptions: getSupabaseCookieOptions(env.target),
  });
}

/** Reuse one browser client instance per tab and per DB target. */
export function createClient(): BrowserClient {
  const target = is_dev_db_switcher_enabled()
    ? browser_target()
    : parse_dev_db_target(undefined);
  if (
    global_scope.__shell_supabase_browser == null ||
    global_scope.__shell_supabase_browser_target !== target
  ) {
    global_scope.__shell_supabase_browser = create_browser_client();
    global_scope.__shell_supabase_browser_target = target;
  }
  return global_scope.__shell_supabase_browser;
}

export { DEV_DB_COOKIE };
