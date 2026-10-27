import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import {
  getSessionDateCookieOptions,
  getSupabaseCookieOptions,
} from "./cookie-options";
import {
  DEV_DB_COOKIE,
  is_dev_db_switcher_enabled,
  parse_dev_db_target,
  resolve_supabase_env,
} from "./dev-db";
import {
  getCaracasWorkdaySessionStamp,
  PRISMA_SESSION_DATE_COOKIE,
} from "@/lib/asistencia/time";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (request.nextUrl.pathname.startsWith("/registro-visitante")) {
    return supabaseResponse;
  }

  const target = is_dev_db_switcher_enabled()
    ? parse_dev_db_target(request.cookies.get(DEV_DB_COOKIE)?.value)
    : parse_dev_db_target(undefined);
  const env = resolve_supabase_env(target);
  const cookieOptions = getSupabaseCookieOptions(env.target);

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    env.url,
    env.publishableKey,
    {
      ...(cookieOptions && {
        cookieOptions,
      }),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  let user = data?.claims;

  const isPublicOrApiRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/prisma-publico") ||
    request.nextUrl.pathname.startsWith("/informe-publico") ||
    request.nextUrl.pathname.startsWith("/satisfaccion/") ||
    request.nextUrl.pathname === "/satisfaccion" ||
    request.nextUrl.pathname.startsWith("/registro-visitante");

  // Enforce shift logins in America/Caracas timezone (08:00 AM morning & 12:30 PM lunch boundaries):
  // If the user's session is from a previous day, pre-08:00 AM, or morning shift once 12:30 PM arrives,
  // sign them out so they authenticate fresh upon arrival and upon returning from lunch.
  if (user && !isPublicOrApiRoute) {
    const expectedStamp = getCaracasWorkdaySessionStamp();
    const sessionDate = request.cookies.get(PRISMA_SESSION_DATE_COOKIE)?.value;
    if (sessionDate !== expectedStamp) {
      await supabase.auth.signOut().catch(() => {});
      user = undefined;
      const url = request.nextUrl.clone();
      const next_path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      url.pathname = "/auth/login";
      url.search = "";
      url.searchParams.set("next", next_path);
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c);
      });
      redirectResponse.cookies.set(PRISMA_SESSION_DATE_COOKIE, "", {
        ...getSessionDateCookieOptions(),
        maxAge: 0,
      });
      return redirectResponse;
    }
  }

  if (!user && !isPublicOrApiRoute) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    const next_path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.pathname = "/auth/login";
    url.search = "";
    url.searchParams.set("next", next_path);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
