import type { CookieOptions } from "@supabase/ssr";

export function getSupabaseCookieOptions(): CookieOptions & { name?: string } {
  if (process.env.NODE_ENV !== "production") {
    return { name: "sb-shade-auth-token" };
  }

  return {
    name: "sb-shade-auth-token",
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || ".shadevenezuela.com.ve",
    sameSite: "lax",
    secure: process.env.NEXT_PUBLIC_COOKIE_SECURE !== "false",
  };
}
