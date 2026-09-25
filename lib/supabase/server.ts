import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseCookieOptions } from "./cookie-options";
import {
  DEV_DB_COOKIE,
  is_dev_db_switcher_enabled,
  parse_dev_db_target,
  resolve_supabase_env,
  type DevDbTarget,
} from "./dev-db";

export async function peek_dev_db_target(): Promise<DevDbTarget> {
  if (!is_dev_db_switcher_enabled()) return parse_dev_db_target(undefined);
  const cookieStore = await cookies();
  return parse_dev_db_target(cookieStore.get(DEV_DB_COOKIE)?.value);
}

export async function createAdminClient(target?: DevDbTarget) {
  const env = resolve_supabase_env(target ?? (await peek_dev_db_target()));
  return createServerClient(env.url, env.serviceRoleKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op for admin client
      },
    },
  });
}

export async function createClient() {
  const cookieStore = await cookies();
  const target = is_dev_db_switcher_enabled()
    ? parse_dev_db_target(cookieStore.get(DEV_DB_COOKIE)?.value)
    : parse_dev_db_target(undefined);
  const env = resolve_supabase_env(target);
  const cookieOptions = getSupabaseCookieOptions(env.target);

  return createServerClient(env.url, env.publishableKey, {
    ...(cookieOptions && {
      cookieOptions,
    }),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  });
}
