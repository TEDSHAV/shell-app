"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DirectoryUser, UserUpdatePayload, Department } from "@/types/directory";

export async function getAllUsers(): Promise<DirectoryUser[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("usuarios")
      .select(
        "id, nombre_apellido, email_corporativo, telefono, cargo, departamento, esta_activo, departamentos(nombre)",
      )
      .order("nombre_apellido");

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }

    return (data || [])
      .filter((u: any) => u.esta_activo !== false)
      .map((u: any) => ({
        id: u.id,
        nombre_apellido: u.nombre_apellido,
        email_corporativo: u.email_corporativo,
        telefono: u.telefono,
        cargo: u.cargo,
        departamento: u.departamento,
        departamento_nombre: u.departamentos?.nombre ?? null,
        esta_activo: u.esta_activo,
      }));
  } catch (err) {
    console.error("Unexpected error in getAllUsers:", err);
    return [];
  }
}

export async function getAllDepartments(): Promise<Department[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("departamentos")
      .select("id, nombre, descripcion")
      .order("nombre");

    if (error) {
      console.error("Error fetching departments:", error);
      return [];
    }

    return (data || []) as Department[];
  } catch (err) {
    console.error("Unexpected error in getAllDepartments:", err);
    return [];
  }
}

export async function updateUserDetails(
  userId: number,
  payload: UserUpdatePayload,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre_apellido: payload.nombre_apellido,
        email_corporativo: payload.email_corporativo,
        telefono: payload.telefono,
        cargo: payload.cargo,
        departamento: payload.departamento,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user:", error);
      return { error: error.message };
    }

    revalidatePath("/directorio");
    revalidatePath("/gestion-usuarios");
    return { success: true };
  } catch (err) {
    console.error("Unexpected error in updateUserDetails:", err);
    return { error: "Error inesperado al actualizar el usuario" };
  }
}

export async function canAccessUserManagement(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: claimsData } = await supabase.auth.getClaims();
    const globalRole = (
      claimsData?.claims?.user_role as string
    )?.toLowerCase();

    if (globalRole === "admin" || globalRole === "superadmin") return true;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("departamento")
      .eq("id_auth", user.id)
      .single();

    if (!usuario?.departamento) return false;

    const { data: depto } = await supabase
      .from("departamentos")
      .select("nombre")
      .eq("id", usuario.departamento)
      .single();

    if (!depto?.nombre) return false;

    return depto.nombre.toUpperCase().includes("TED");
  } catch (err) {
    console.error("Error checking user management access:", err);
    return false;
  }
}
