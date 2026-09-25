export type DevDbTarget = "staging" | "production";

export const DEV_DB_COOKIE = "sha-dev-db";

export function is_dev_db_switcher_enabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function parse_dev_db_target(raw: string | null | undefined): DevDbTarget {
  return raw === "production" ? "production" : "staging";
}

export function supabase_auth_cookie_name(target: DevDbTarget): string {
  if (is_dev_db_switcher_enabled() && target === "production") {
    return "sb-shade-auth-token-production";
  }
  return "sb-shade-auth-token";
}

export type DevDbPublicBundle = {
  url: string;
  publishableKey: string;
};

export type DevDbSnapshot = {
  enabled: boolean;
  target: DevDbTarget;
  staging: DevDbPublicBundle | null;
  production: DevDbPublicBundle | null;
};

function trim_env(name: string): string {
  return (process.env[name] || "").trim();
}

function bundle(
  url: string,
  publishable: string,
): DevDbPublicBundle | null {
  if (!url || !publishable) return null;
  return { url, publishableKey: publishable };
}

export function staging_public_bundle(): DevDbPublicBundle | null {
  return bundle(
    trim_env("DEV_SUPABASE_STAGING_URL") || trim_env("NEXT_PUBLIC_SUPABASE_URL"),
    trim_env("DEV_SUPABASE_STAGING_PUBLISHABLE_KEY") ||
      trim_env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}

export function production_public_bundle(): DevDbPublicBundle | null {
  const pub = bundle(
    trim_env("DEV_SUPABASE_PROD_URL"),
    trim_env("DEV_SUPABASE_PROD_PUBLISHABLE_KEY"),
  );
  if (!pub || !trim_env("DEV_SUPABASE_PROD_SERVICE_ROLE_KEY")) return null;
  return pub;
}

export function service_role_for(target: DevDbTarget): string {
  if (target === "production") {
    return trim_env("DEV_SUPABASE_PROD_SERVICE_ROLE_KEY");
  }
  return (
    trim_env("DEV_SUPABASE_STAGING_SERVICE_ROLE_KEY") ||
    trim_env("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export function public_bundle_for(target: DevDbTarget): DevDbPublicBundle | null {
  return target === "production"
    ? production_public_bundle()
    : staging_public_bundle();
}

export function resolve_supabase_env(target: DevDbTarget): {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
  target: DevDbTarget;
} {
  const pub = public_bundle_for(target) || staging_public_bundle();
  if (!pub) {
    return {
      url: trim_env("NEXT_PUBLIC_SUPABASE_URL"),
      publishableKey: trim_env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      serviceRoleKey: trim_env("SUPABASE_SERVICE_ROLE_KEY"),
      target,
    };
  }
  return {
    url: pub.url,
    publishableKey: pub.publishableKey,
    serviceRoleKey: service_role_for(target),
    target,
  };
}

export function dev_db_snapshot(target: DevDbTarget): DevDbSnapshot {
  if (!is_dev_db_switcher_enabled()) {
    return {
      enabled: false,
      target: "staging",
      staging: null,
      production: null,
    };
  }
  return {
    enabled: true,
    target,
    staging: staging_public_bundle(),
    production: production_public_bundle(),
  };
}

export function read_target_from_cookie_header(cookie_header: string): DevDbTarget {
  const match = cookie_header.match(new RegExp(`(?:^|;\\s*)${DEV_DB_COOKIE}=([^;]*)`));
  return parse_dev_db_target(match ? decodeURIComponent(match[1]) : undefined);
}

/** Cookie is source of truth; keep window.__SHA_DEV_SB.target in sync after soft nav. */
export function sync_browser_dev_db_target(): DevDbTarget {
  if (typeof document === "undefined") {
    return parse_dev_db_target(undefined);
  }
  const target = read_target_from_cookie_header(document.cookie);
  const scope = window as unknown as {
    __SHA_DEV_SB?: { target: DevDbTarget } & Record<string, unknown>;
  };
  if (scope.__SHA_DEV_SB && scope.__SHA_DEV_SB.target !== target) {
    scope.__SHA_DEV_SB = { ...scope.__SHA_DEV_SB, target };
  }
  return target;
}
