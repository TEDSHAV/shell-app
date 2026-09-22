import type { CookieOptions } from "@supabase/ssr";
import {
  parse_dev_db_target,
  supabase_auth_cookie_name,
  type DevDbTarget,
} from "./dev-db";

export function getSupabaseCookieOptions(
  target: DevDbTarget = parse_dev_db_target(undefined),
): CookieOptions & { name?: string } {
  const name = supabase_auth_cookie_name(target);
  if (process.env.NODE_ENV !== "production") {
    return { name };
  }

  return {
    name,
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".shadevenezuela.com.ve",
    sameSite: "lax",
    secure: process.env.NEXT_PUBLIC_COOKIE_SECURE !== "false",
  };
}
