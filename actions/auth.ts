"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sign_out_best_effort } from "@/lib/auth/safe-sign-out";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const supabase = await createClient();
  await sign_out_best_effort(supabase);
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

  const t0 = Date.now();

  // Create client and sign in in parallel where possible
  const [supabase] = await Promise.all([
    createClient()
  ]);
  
  console.log(`[signInAction] client created in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log(`[signInAction] signInWithPassword took ${Date.now() - t1}ms`, error ? `error: ${error.name} — ${error.message}` : "success");

  if (error) {
    console.error(`[signInAction] auth error after ${Date.now() - t0}ms total:`, {
      name: error.name,
      message: error.message,
      status: (error as any).status,
    });
    return { error: error.message };
  }

  // Block deactivated users (usuarios.esta_activo === false).
  // Uses data.user.id from the sign-in response directly (not getUsuarioRecord)
  // to avoid any cookie-timing dependency in server actions.
  const t2 = Date.now();
  const admin = await createAdminClient();
  const { data: usuario, error: usuarioError } = await admin
    .from("usuarios")
    .select("esta_activo")
    .eq("id_auth", data.user.id)
    .single();
  console.log(`[signInAction] usuarios lookup took ${Date.now() - t2}ms`, usuarioError ? `error: ${usuarioError.message}` : "ok");

  if (usuarioError) {
    console.error(`[signInAction] usuarios lookup error:`, usuarioError.message);
  }

  if (usuario?.esta_activo === false) {
    await supabase.auth.signOut().catch(() => {});
    return { error: "Tu cuenta está inactiva. Contacta al administrador." };
  }

  console.log(`[signInAction] total time: ${Date.now() - t0}ms — redirecting to /dashboard`);
  redirect("/dashboard");
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
