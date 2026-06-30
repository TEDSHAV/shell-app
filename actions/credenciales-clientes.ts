"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import type { ClienteCredential, EmpresaLogo, City, Sede } from "@/types/credenciales-clientes";

// ─── Auth Helpers ───

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// ─── Credential Management (Admin) ───

export async function createClienteCredentials(
  empresaId: number,
  username: string,
  password: string,
  displayName?: string,
  cityId?: number | null,
  sedeIds?: number[] | null,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();
  const passwordHash = hashPassword(password);

  const { data, error } = await supabase
    .from("cliente_credenciales")
    .insert({
      empresa_id: empresaId,
      username,
      password_hash: passwordHash,
      display_name: displayName || null,
      is_active: true,
      updated_at: new Date().toISOString(),
      id_ciudad: cityId || null,
      id_sede: sedeIds && sedeIds.length > 0 ? sedeIds : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating cliente credentials:", error);
    return { error: error.message };
  }

  revalidatePath("/credenciales-clientes");
  return { success: true };
}

export async function getClienteCredentials(
  empresaId: number,
): Promise<{ data?: ClienteCredential[]; error?: string }> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("cliente_credenciales")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching cliente credentials:", error);
    return { error: error.message };
  }

  return { data: (data as ClienteCredential[]) || [] };
}

export async function updateClienteCredentials(
  credentialId: number,
  updates: {
    username?: string;
    password?: string;
    display_name?: string;
    is_active?: boolean;
    sedeIds?: number[] | null;
    cityId?: number | null;
  },
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.username !== undefined) updateData.username = updates.username;
  if (updates.display_name !== undefined)
    updateData.display_name = updates.display_name;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
  if (updates.password) {
    updateData.password_hash = hashPassword(updates.password);
  }
  if (updates.sedeIds !== undefined) {
    updateData.id_sede = updates.sedeIds && updates.sedeIds.length > 0 ? updates.sedeIds : null;
  }
  if (updates.cityId !== undefined) {
    updateData.id_ciudad = updates.cityId || null;
  }

  const { error } = await supabase
    .from("cliente_credenciales")
    .update(updateData)
    .eq("id", credentialId);

  if (error) {
    console.error("Error updating cliente credentials:", error);
    return { error: error.message };
  }

  revalidatePath("/credenciales-clientes");
  return { success: true };
}

export async function deleteClienteCredentials(
  credentialId: number,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("cliente_credenciales")
    .delete()
    .eq("id", credentialId);

  if (error) {
    console.error("Error deleting cliente credentials:", error);
    return { error: error.message };
  }

  revalidatePath("/credenciales-clientes");
  return { success: true };
}

// ─── Company & Sede Queries ───

export async function getClienteCompanies(): Promise<{
  data?: { id: number; razon_social: string; rif: string; es_cliente: boolean }[];
  error?: string;
}> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("empresas")
    .select("id, razon_social, rif, es_cliente")
    .eq("es_cliente", true)
    .order("razon_social", { ascending: true });

  if (error) {
    console.error("Error fetching cliente companies:", error);
    return { error: error.message };
  }

  return { data: data || [] };
}

export async function getCompaniesAndCities(): Promise<{
  success: boolean;
  cities?: City[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: cities, error: citiesError } = await supabase
      .from("cat_ciudades")
      .select("id, nombre_ciudad, id_estado")
      .order("nombre_ciudad", { ascending: true });

    if (citiesError) {
      console.error("Error fetching cities:", citiesError);
      return {
        success: false,
        error: `Error fetching cities: ${citiesError.message}`,
      };
    }

    return {
      success: true,
      cities: cities || [],
    };
  } catch (error) {
    console.error("Error in getCompaniesAndCities:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching companies and cities",
    };
  }
}

export async function getSedesByEmpresaAction(
  empresaId: number,
): Promise<{ data?: Sede[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("empresa_sedes")
      .select("id, nombre_sede, id_empresa, id_estado, esta_activo")
      .eq("id_empresa", empresaId)
      .eq("esta_activo", true)
      .order("nombre_sede", { ascending: true });

    if (error) {
      console.error("Error fetching sedes by empresa:", error);
      return { error: error.message };
    }

    return { data: (data as Sede[]) || [] };
  } catch (error) {
    console.error("Error in getSedesByEmpresaAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching sedes",
    };
  }
}

// ─── Company Logo Management ───

export async function getEmpresaLogoAction(
  empresaId: number,
): Promise<{ data?: EmpresaLogo | null; error?: string }> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("empresa_logos")
      .select("*")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching empresa logo:", error);
      return { error: error.message };
    }

    return { data: (data as EmpresaLogo) || null };
  } catch (error) {
    console.error("Error in getEmpresaLogoAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching logo",
    };
  }
}

export async function uploadEmpresaLogoAction(
  empresaId: number,
  base64Data: string,
): Promise<{ success?: boolean; error?: string; logoUrl?: string }> {
  try {
    const supabase = await createAdminClient();

    // Ensure the storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "empresa-logos");
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket(
        "empresa-logos",
        { public: true },
      );
      if (bucketError) {
        console.error("Error creating bucket:", bucketError);
        return { error: `Error creating storage bucket: ${bucketError.message}` };
      }
    }

    // Check if logo already exists (to delete old file)
    const { data: existing } = await supabase
      .from("empresa_logos")
      .select("storage_path")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (existing?.storage_path) {
      await supabase.storage
        .from("empresa-logos")
        .remove([existing.storage_path]);
    }

    // Convert base64 to blob
    const base64Parts = base64Data.split(",");
    const base64String = base64Parts[1] || base64Parts[0];
    const buffer = Buffer.from(base64String, "base64");

    const timestamp = Date.now();
    const storagePath = `empresa-${empresaId}-${timestamp}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("empresa-logos")
      .upload(storagePath, buffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      return { error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("empresa-logos")
      .getPublicUrl(storagePath);

    const logoUrl = publicUrlData.publicUrl;

    // Upsert into empresa_logos table
    const { error: dbError } = await supabase
      .from("empresa_logos")
      .upsert(
        {
          empresa_id: empresaId,
          logo_url: logoUrl,
          storage_path: storagePath,
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "empresa_id" },
      );

    if (dbError) {
      console.error("Error saving logo record:", dbError);
      return { error: dbError.message };
    }

    revalidatePath("/credenciales-clientes");
    return { success: true, logoUrl };
  } catch (error) {
    console.error("Error in uploadEmpresaLogoAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error uploading logo",
    };
  }
}

export async function removeEmpresaLogoAction(
  empresaId: number,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient();

    const { data: existing } = await supabase
      .from("empresa_logos")
      .select("storage_path")
      .eq("empresa_id", empresaId)
      .maybeSingle();

    if (existing?.storage_path) {
      await supabase.storage
        .from("empresa-logos")
        .remove([existing.storage_path]);
    }

    const { error: dbError } = await supabase
      .from("empresa_logos")
      .delete()
      .eq("empresa_id", empresaId);

    if (dbError) {
      console.error("Error deleting logo record:", dbError);
      return { error: dbError.message };
    }

    revalidatePath("/credenciales-clientes");
    return { success: true };
  } catch (error) {
    console.error("Error in removeEmpresaLogoAction:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unknown error removing logo",
    };
  }
}
