"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSessionDateCookieOptions } from "@/lib/supabase/cookie-options";
import { sign_out_best_effort } from "@/lib/auth/safe-sign-out";
import { safe_internal_next_path } from "@/lib/auth/safe-next-path";
import {
  getCaracasWorkdaySessionStamp,
  PRISMA_SESSION_DATE_COOKIE,
} from "@/lib/asistencia/time";
import { recordDailyAttendanceForUsuario } from "@/lib/asistencia/record";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const supabase = await createClient();
  await sign_out_best_effort(supabase);
  try {
    const cookieStore = await cookies();
    cookieStore.set(PRISMA_SESSION_DATE_COOKIE, "", {
      ...getSessionDateCookieOptions(),
      maxAge: 0,
    });
  } catch {
    // Ignore cookie removal errors
  }
  redirect("/auth/login");
}

export async function signInAction(state: { error: string } | null, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Basic email validation to prevent unnecessary API calls
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Invalid email format" };
  }

  // Create client and sign in in parallel where possible
  const [supabase] = await Promise.all([
    createClient()
  ]);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Block deactivated users (usuarios.esta_activo === false).
  // Uses data.user.id from the sign-in response directly (not getUsuarioRecord)
  // to avoid any cookie-timing dependency in server actions.
  const admin = await createAdminClient();
  const { data: usuario } = await admin
    .from("usuarios")
    .select("id, esta_activo")
    .eq("id_auth", data.user.id)
    .single();

  if (usuario?.esta_activo === false) {
    await supabase.auth.signOut().catch(() => {});
    return { error: "Tu cuenta está inactiva. Contacta al administrador." };
  }

  // Stamp daily session date cookie (America/Caracas, with 06:00 AM workday boundary)
  // and record daily attendance if >= 06:00 AM.
  const sessionStamp = getCaracasWorkdaySessionStamp();
  try {
    const cookieStore = await cookies();
    cookieStore.set(
      PRISMA_SESSION_DATE_COOKIE,
      sessionStamp,
      getSessionDateCookieOptions(),
    );
  } catch {
    // Ignore if cookie cannot be set
  }

  if (usuario?.id) {
    await recordDailyAttendanceForUsuario(Number(usuario.id), "login");
  }

  const next = safe_internal_next_path(String(formData.get("next") ?? ""));
  redirect(next ?? "/dashboard");
}

export async function getUserEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.email as string | null;
}

export async function getUserClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    return null;
  }
  
  return data.claims;
}
