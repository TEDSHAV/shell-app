"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns true if the current logged-in user belongs to the "TED"
 * department (programmers). Matches `departamentos.nombre` case-insensitively
 * against "TED" via the `usuarios.departamento` foreign key.
 */
export const isTedMember = cache(async (): Promise<boolean> => {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("departamento")
      .eq("id_auth", user.id)
      .single();

    if (usuarioError || !usuario || usuario.departamento == null) {
      return false;
    }

    const { data: depto, error: deptoError } = await supabase
      .from("departamentos")
      .select("nombre")
      .eq("id", usuario.departamento)
      .single();

    if (deptoError || !depto) return false;

    return depto.nombre.trim().toLowerCase() === "ted";
  } catch (error) {
    console.error("[isTedMember] Unexpected error:", error);
    return false;
  }
});
