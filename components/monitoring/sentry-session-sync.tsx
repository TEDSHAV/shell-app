"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type NavigatorWithConnection = Navigator & {
  connection?: { effectiveType?: string };
};

function read_connection_effective_type(): string {
  if (typeof navigator === "undefined") {
    return "unknown";
  }
  const effective = (navigator as NavigatorWithConnection).connection
    ?.effectiveType;
  return effective ?? "unknown";
}

function apply_session_to_sentry(
  session: Session | null,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const user = session?.user;
  if (!user?.id) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
  });
  Sentry.setTag("conexion", read_connection_effective_type());
}

/**
 * Keeps Sentry user context in sync with Supabase auth (all routes).
 */
export function SentrySessionSync() {
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth
      .getSession()
      .then((result: { data: { session: Session | null } }) => {
        apply_session_to_sentry(result.data.session);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
      apply_session_to_sentry(session);
      },
    );
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
