import type { CookieOptions } from "@supabase/ssr";

export function getSupabaseCookieOptions(): CookieOptions & { name?: string } {
  if (process.env.NODE_ENV !== "production") {
    return { name: "sb-shade-auth-token" };
  }

  return {
    name: "sb-shade-auth-token",
    domain: ".shadevenezuela.com.ve",
    sameSite: "lax",
    secure: true,
  };
}
