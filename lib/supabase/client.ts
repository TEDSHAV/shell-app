import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "./cookie-options";

type BrowserClient = ReturnType<typeof createBrowserClient>;

const global_scope = globalThis as unknown as {
  __shell_supabase_browser?: BrowserClient;
};

function create_browser_client(): BrowserClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Supported at runtime by auth-js; ssr types may lag.
        // @ts-expect-error valid runtime option
        lockAcquireTimeout: 20000,
      },
      cookieOptions: getSupabaseCookieOptions(),
    },
  );
}

/** Reuse one browser client instance per tab. */
export function createClient(): BrowserClient {
  if (global_scope.__shell_supabase_browser == null) {
    global_scope.__shell_supabase_browser = create_browser_client();
  }
  return global_scope.__shell_supabase_browser;
}
