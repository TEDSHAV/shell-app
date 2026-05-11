import type { CookieOptions } from "@supabase/ssr";

export function getSupabaseCookieOptions(): CookieOptions | undefined {
  if (process.env.NODE_ENV !== "production") {
    return undefined;
  }

  return {
    domain: ".shadevenezuela.com.ve",
    sameSite: "lax",
    secure: true,
  };
}
