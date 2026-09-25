"use server";

import { createAdminClient } from "@/lib/supabase/server";

export interface CitizenLookupResponse {
  success: boolean;
  name?: string;
  rif?: string;
  nacionalidad?: "V" | "E";
  cedula?: string;
  error?: string;
  fromCache?: boolean;
}

// In-memory cache to guarantee sub-millisecond response for repeated queries in Node.js runtime
const memoryCache = new Map<
  string,
  { name: string; rif?: string; timestamp: number }
>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days memory retention

const CEDULA_API_URL = "https://api.cedula.com.ve/api/v1";
const CEDULA_APP_ID = process.env.CEDULA_APP_ID || "9225";
const CEDULA_TOKEN =
  process.env.CEDULA_API_TOKEN || "1dd9a819f1e9c888a443810c7a9f9a6f";

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Core lookup function for Venezuelan citizen identity.
 * Employs a multi-tier cache: In-Memory -> Supabase Shared Cache -> External REST API.
 */
export async function lookupCitizen(
  rawNacionalidad: string = "V",
  rawCedula: string,
): Promise<CitizenLookupResponse> {
  const nac = rawNacionalidad.toUpperCase() === "E" ? "E" : "V";
  const digits = rawCedula.replace(/\D/g, "");

  if (!digits || digits.length < 5 || digits.length > 9) {
    return {
      success: false,
      error: "Número de cédula inválido (debe tener entre 5 y 9 dígitos).",
    };
  }

  const cacheKey = `${nac}-${digits}`;

  // 1. Tier 1: In-memory cache hit
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() - memEntry.timestamp < CACHE_TTL_MS) {
    return {
      success: true,
      name: memEntry.name,
      rif: memEntry.rif,
      nacionalidad: nac,
      cedula: digits,
      fromCache: true,
    };
  }

  // 2. Tier 2: Supabase persistent database cache (cat_cedulas_cache)
  try {
    const supabase = await createAdminClient();
    const { data: dbEntry, error: dbError } = await supabase
      .from("cat_cedulas_cache")
      .select("nombre_completo, rif")
      .eq("nacionalidad", nac)
      .eq("cedula", digits)
      .maybeSingle();

    if (!dbError && dbEntry?.nombre_completo) {
      // Save to memory cache for subsequent instant hits
      memoryCache.set(cacheKey, {
        name: dbEntry.nombre_completo,
        rif: dbEntry.rif || undefined,
        timestamp: Date.now(),
      });

      return {
        success: true,
        name: dbEntry.nombre_completo,
        rif: dbEntry.rif || undefined,
        nacionalidad: nac,
        cedula: digits,
        fromCache: true,
      };
    }
  } catch (err) {
    // If the cache table doesn't exist yet or connection fails, gracefully proceed to API
    console.warn("[Cedula Action] Supabase cache lookup skipped:", err);
  }

  // 3. Tier 3: External API lookup (cedula.com.ve)
  try {
    const url = new URL(CEDULA_API_URL);
    url.searchParams.append("app_id", CEDULA_APP_ID);
    url.searchParams.append("token", CEDULA_TOKEN);
    url.searchParams.append("nacionalidad", nac);
    url.searchParams.append("cedula", digits);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 86400 }, // Next.js fetch cache for 24h
    });

    if (!res.ok) {
      throw new Error(`El servicio de cédula respondió con status ${res.status}`);
    }

    const json = await res.json();

    if (json.error) {
      return {
        success: false,
        error: json.error_str || "No se encontró el ciudadano en el registro.",
      };
    }

    const data = json.data;
    if (!data) {
      return {
        success: false,
        error: "No se encontraron datos para esta cédula.",
      };
    }

    const firstName = data.primer_nombre || "";
    const secondName = data.segundo_nombre || "";
    const firstSurname = data.primer_apellido || "";
    const secondSurname = data.segundo_apellido || "";

    const rawFullName = `${firstName} ${secondName} ${firstSurname} ${secondSurname}`
      .trim()
      .replace(/\s+/g, " ");

    if (!rawFullName) {
      return {
        success: false,
        error: "No se pudo extraer el nombre del ciudadano.",
      };
    }

    const formattedName = toTitleCase(rawFullName);
    const rif = data.rif || undefined;

    // Cache in memory
    memoryCache.set(cacheKey, {
      name: formattedName,
      rif,
      timestamp: Date.now(),
    });

    // Asynchronously save to Supabase cache table (silent on error)
    (async () => {
      try {
        const supabase = await createAdminClient();
        await supabase.from("cat_cedulas_cache").upsert(
          {
            nacionalidad: nac,
            cedula: digits,
            nombre_completo: formattedName,
            rif: rif || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "nacionalidad,cedula" },
        );
      } catch {
        // Ignored if table doesn't exist yet
      }
    })();

    return {
      success: true,
      name: formattedName,
      rif,
      nacionalidad: nac,
      cedula: digits,
      fromCache: false,
    };
  } catch (error) {
    console.error("[Cedula Action] External API error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al conectar con el servicio de verificación.",
    };
  }
}

/**
 * Server action callable directly from forms or client components.
 */
export async function verifyCedulaAction(
  nacionalidad: "V" | "E",
  cedula: string,
): Promise<CitizenLookupResponse> {
  return lookupCitizen(nacionalidad, cedula);
}
