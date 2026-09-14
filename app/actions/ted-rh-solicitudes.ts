"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { setUserActiveStatus } from "@/actions/admin-users";

const APP_SLUG = "srh";

type SolicitudEstado = "pendiente" | "en_proceso" | "completada" | "rechazada";
type SolicitudTipo =
  | "creacion"
  | "desactivacion"
  | "reactivacion"
  | "restablecer_contrasena"
  | "cambio_email"
  | "cambio_permisos";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Build a specific notification body based on what was requested.
 */
function buildCompletionBody(
  nombreApellido: string,
  solicitarEmail: boolean,
  solicitarFirmaEmail: boolean,
): string {
  const parts: string[] = [];
  if (solicitarEmail) parts.push("el usuario y el email corporativo");
  else if (solicitarFirmaEmail) parts.push("el usuario y la firma de email");
  else parts.push("el usuario");
  return `Tu solicitud para crear ${parts.join(", ")} para ${nombreApellido} ha sido completada por TED.`;
}

/**
 * Build a tipo-specific completion body for non-creacion types.
 */
function buildTipoCompletionBody(
  nombreApellido: string,
  tipo: SolicitudTipo,
): string {
  switch (tipo) {
    case "desactivacion":
      return `La desactivación de ${nombreApellido} ha sido completada por TED. El usuario ya no tiene acceso.`;
    case "reactivacion":
      return `La reactivación de ${nombreApellido} ha sido completada por TED. El usuario ya tiene acceso.`;
    case "restablecer_contrasena":
      return `Se ha enviado un correo de recuperación de contraseña a ${nombreApellido}. Pídele que revise su email.`;
    case "cambio_email":
      return `El cambio de email corporativo de ${nombreApellido} ha sido completado por TED.`;
    case "cambio_permisos":
      return `El cambio de permisos para ${nombreApellido} ha sido completado por TED.`;
    default:
      return `Tu solicitud para ${nombreApellido} ha sido completada por TED.`;
  }
}

/**
 * Build a tipo-specific rejection body.
 */
function buildRejectionBody(
  nombreApellido: string,
  tipo: SolicitudTipo,
  motivo: string | null | undefined,
): string {
  const base = (() => {
    switch (tipo) {
      case "creacion":
        return `Tu solicitud para crear un usuario para ${nombreApellido}`;
      case "desactivacion":
        return `Tu solicitud de desactivación de ${nombreApellido}`;
      case "reactivacion":
        return `Tu solicitud de reactivación de ${nombreApellido}`;
      case "restablecer_contrasena":
        return `Tu solicitud de restablecer la contraseña de ${nombreApellido}`;
      case "cambio_email":
        return `Tu solicitud de cambio de email de ${nombreApellido}`;
      case "cambio_permisos":
        return `Tu solicitud de cambio de permisos para ${nombreApellido}`;
      default:
        return `Tu solicitud para ${nombreApellido}`;
    }
  })();
  return motivo?.trim()
    ? `${base} ha sido rechazada por TED. Motivo: ${motivo.trim()}`
    : `${base} ha sido rechazada por TED.`;
}

/**
 * Auto-execute the requested action for a non-creacion solicitud.
 * Returns { success, error } — if it fails, the solicitud should NOT be
 * marked as complete.
 */
async function executeSolicitudAction(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  cookieClient: Awaited<ReturnType<typeof createClient>>,
  solicitud: {
    tipo: SolicitudTipo;
    usuario_id: number | null;
    valor_nuevo: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!solicitud.usuario_id) {
    return { success: false, error: "La solicitud no tiene un usuario asociado." };
  }

  switch (solicitud.tipo) {
    case "desactivacion": {
      const result = await setUserActiveStatus({
        usuarioId: solicitud.usuario_id,
        isActive: false,
      });
      if (result.error) return { success: false, error: result.error };
      return { success: true };
    }

    case "reactivacion": {
      const result = await setUserActiveStatus({
        usuarioId: solicitud.usuario_id,
        isActive: true,
      });
      if (result.error) return { success: false, error: result.error };
      return { success: true };
    }

    case "restablecer_contrasena": {
      // Fetch the usuario's email_corporativo to send the recovery email
      const { data: usuario, error: uError } = await admin
        .from("usuarios")
        .select("email_corporativo")
        .eq("id", solicitud.usuario_id)
        .maybeSingle();
      if (uError || !usuario?.email_corporativo) {
        return {
          success: false,
          error: "No se pudo encontrar el email del usuario.",
        };
      }
      const { error: resetError } = await cookieClient.auth.resetPasswordForEmail(
        usuario.email_corporativo,
      );
      if (resetError) {
        return {
          success: false,
          error: `Error al enviar el correo de recuperación: ${resetError.message}`,
        };
      }
      return { success: true };
    }

    case "cambio_email": {
      const newEmail = (solicitud.valor_nuevo || "").trim().toLowerCase();
      if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
        return { success: false, error: "El nuevo email no es válido." };
      }
      // Fetch the usuario's id_auth
      const { data: usuario, error: uError } = await admin
        .from("usuarios")
        .select("id_auth")
        .eq("id", solicitud.usuario_id)
        .maybeSingle();
      if (uError || !usuario?.id_auth) {
        return {
          success: false,
          error: "No se pudo encontrar la cuenta de auth del usuario.",
        };
      }
      // Update Supabase Auth email
      const { error: authError } = await admin.auth.admin.updateUserById(
        usuario.id_auth,
        { email: newEmail },
      );
      if (authError) {
        return {
          success: false,
          error: `Error al actualizar el email en Auth: ${authError.message}`,
        };
      }
      // Update usuarios.email_corporativo
      const { error: dbError } = await admin
        .from("usuarios")
        .update({ email_corporativo: newEmail })
        .eq("id", solicitud.usuario_id);
      if (dbError) {
        return {
          success: false,
          error: `Error al actualizar el email en la base de datos: ${dbError.message}`,
        };
      }
      return { success: true };
    }

    case "cambio_permisos": {
      const valor = (solicitud.valor_nuevo || "").trim();
      const parts = valor.split(":");
      if (parts.length !== 2) {
        return { success: false, error: "El valor de permisos no es válido." };
      }
      const [appSlug, accion] = parts;
      if (accion !== "conceder" && accion !== "revocar") {
        return { success: false, error: "La acción de permisos no es válida." };
      }

      // Resolve app_id and the "access" role_id from authprisma.
      // Use the regular cookie client (not admin) because the service role
      // key lacks USAGE permission on the authprisma schema — same pattern
      // as admin-users.ts createUser.
      const { data: appRow, error: appError } = await cookieClient
        .schema("authprisma")
        .from("apps")
        .select("id")
        .eq("slug", appSlug)
        .maybeSingle();
      if (appError || !appRow) {
        return { success: false, error: `No se encontró el módulo "${appSlug}".` };
      }

      // Resolve the "access" role for this app (the default role created by
      // the register_*_app migrations).
      const { data: roleRow, error: roleError } = await cookieClient
        .schema("authprisma")
        .from("roles")
        .select("id")
        .eq("app_id", appRow.id)
        .eq("slug", "access")
        .maybeSingle();
      if (roleError || !roleRow) {
        return {
          success: false,
          error: `No se encontró el rol "access" para el módulo "${appSlug}".`,
        };
      }

      if (accion === "conceder") {
        // Insert (idempotent — on conflict do nothing)
        const { error: insertError } = await cookieClient
          .schema("authprisma")
          .from("user_app_roles")
          .insert({
            usuario_id: solicitud.usuario_id,
            app_id: appRow.id,
            role_id: roleRow.id,
          });
        if (insertError) {
          // Ignore unique constraint violations (already has the role)
          if (!insertError.message.includes("duplicate") &&
              !insertError.message.includes("unique")) {
            return {
              success: false,
              error: `Error al conceder el permiso: ${insertError.message}`,
            };
          }
        }
      } else {
        // Revocar — delete the role
        const { error: deleteError } = await cookieClient
          .schema("authprisma")
          .from("user_app_roles")
          .delete()
          .eq("usuario_id", solicitud.usuario_id)
          .eq("app_id", appRow.id)
          .eq("role_id", roleRow.id);
        if (deleteError) {
          return {
            success: false,
            error: `Error al revocar el permiso: ${deleteError.message}`,
          };
        }
      }
      return { success: true };
    }

    default:
      return { success: false, error: `Tipo de solicitud no soportado: ${solicitud.tipo}` };
  }
}

/**
 * TED updates the status of an RH solicitud from the shell's TED page.
 * For non-creacion types, "completada" auto-executes the requested action
 * (toggle active, send recovery email, update email, update app roles).
 * If execution fails, the solicitud is NOT marked as complete and the
 * error is returned to the caller.
 *
 * Updates the row directly via admin client and fires a notification
 * to the solicitante (best-effort).
 */
export async function updateRhSolicitudStatus(
  id: number,
  estado: SolicitudEstado,
  notas?: string | null,
): Promise<{ success: boolean; error?: string }> {
  if (!id || !estado) {
    return { success: false, error: "Parámetros inválidos" };
  }

  const validEstados: SolicitudEstado[] = [
    "pendiente",
    "en_proceso",
    "completada",
    "rechazada",
  ];
  if (!validEstados.includes(estado)) {
    return { success: false, error: "Estado inválido" };
  }

  try {
    // Use cookie client to get the current user (for procesado_por)
    const cookieClient = await createClient();
    const admin = await createAdminClient();

    const {
      data: { user },
    } = await cookieClient.auth.getUser();
    let procesadoPor: number | null = null;
    if (user) {
      const { data: userData } = await admin
        .from("usuarios")
        .select("id")
        .eq("id_auth", user.id)
        .maybeSingle();
      procesadoPor = userData?.id ?? null;
    }

    // Fetch the solicitud to get tipo + usuario_id + valor_nuevo
    const { data: solicitud, error: fetchError } = await admin
      .from("rh_solicitudes")
      .select("tipo, usuario_id, valor_nuevo, solicitado_por, nombre_apellido, solicitar_email, solicitar_firma_email")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !solicitud) {
      console.error("[updateRhSolicitudStatus] Could not fetch solicitud:", fetchError);
      return { success: false, error: "Solicitud no encontrada." };
    }

    const tipo = (solicitud.tipo as SolicitudTipo) ?? "creacion";

    // ─── Auto-execute for non-creacion types on completion ───
    if (estado === "completada" && tipo !== "creacion") {
      const execResult = await executeSolicitudAction(admin, cookieClient, {
        tipo,
        usuario_id: solicitud.usuario_id as number | null,
        valor_nuevo: solicitud.valor_nuevo as string | null,
      });
      if (!execResult.success) {
        // Do NOT mark as complete — return the error to the caller
        console.error(
          `[updateRhSolicitudStatus] Auto-execute failed for solicitud ${id} (${tipo}):`,
          execResult.error,
        );
        return {
          success: false,
          error: execResult.error || "Error al ejecutar la acción solicitada.",
        };
      }
    }

    const updateData: Record<string, unknown> = {
      estado,
      updated_at: new Date().toISOString(),
    };

    if (notas !== undefined) {
      updateData.notas = notas?.trim() || null;
    }

    if (estado !== "pendiente") {
      updateData.procesado_por = procesadoPor;
    }

    const { error: updateError } = await admin
      .from("rh_solicitudes")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("[updateRhSolicitudStatus] DB error:", updateError);
      return { success: false, error: "Error al actualizar la solicitud" };
    }

    // Fire-and-forget notification to the solicitante when status changes
    // to completada or rechazada
    if (estado === "completada" || estado === "rechazada") {
      try {
        if (solicitud.solicitado_por) {
          const { data: solicitante, error: solicError } = await admin
            .from("usuarios")
            .select("id_auth")
            .eq("id", solicitud.solicitado_por)
            .maybeSingle();

          if (solicError || !solicitante?.id_auth) {
            console.warn("[updateRhSolicitudStatus] Could not resolve solicitante id_auth:", solicError);
            revalidatePath("/ted/rh-solicitudes");
            return { success: true };
          }

          const isRechazada = estado === "rechazada";
          const eventKey = isRechazada
            ? "rh_solicitud_rechazada"
            : "rh_solicitud_completada";

          const title = isRechazada
            ? (() => {
                switch (tipo) {
                  case "creacion": return "Solicitud de Usuario Rechazada";
                  case "desactivacion": return "Solicitud de Desactivación Rechazada";
                  case "reactivacion": return "Solicitud de Reactivación Rechazada";
                  case "restablecer_contrasena": return "Solicitud de Restablecer Contraseña Rechazada";
                  case "cambio_email": return "Solicitud de Cambio de Email Rechazada";
                  case "cambio_permisos": return "Solicitud de Cambio de Permisos Rechazada";
                  default: return "Solicitud Rechazada";
                }
              })()
            : (() => {
                switch (tipo) {
                  case "creacion": return "Solicitud de Usuario Completada";
                  case "desactivacion": return "Desactivación Completada";
                  case "reactivacion": return "Reactivación Completada";
                  case "restablecer_contrasena": return "Restablecimiento de Contraseña Completado";
                  case "cambio_email": return "Cambio de Email Completado";
                  case "cambio_permisos": return "Cambio de Permisos Completado";
                  default: return "Solicitud Completada";
                }
              })();

          const body = isRechazada
            ? buildRejectionBody(solicitud.nombre_apellido, tipo, notas)
            : tipo === "creacion"
              ? buildCompletionBody(
                  solicitud.nombre_apellido,
                  solicitud.solicitar_email,
                  solicitud.solicitar_firma_email,
                )
              : buildTipoCompletionBody(solicitud.nombre_apellido, tipo);

          const { error: insertError } = await admin
            .schema("notify")
            .from("inbox")
            .insert({
              app_slug: APP_SLUG,
              event_key: eventKey,
              recipient_id_auth: solicitante.id_auth,
              title,
              body,
              link_path: `/dashboard/rh/solicitudes/${id}`,
              metadata: {
                solicitud_id: id,
                nombre_apellido: solicitud.nombre_apellido,
                is_rechazada: isRechazada,
                tipo,
                solicitar_email: solicitud.solicitar_email,
                solicitar_firma_email: solicitud.solicitar_firma_email,
              },
              dedupe_key: `rh_solicitud:${id}:${isRechazada ? "rechazada" : "completada"}:${Date.now()}`,
              priority: 2,
            });

          if (insertError) {
            console.error("[updateRhSolicitudStatus] Notify insert error:", insertError);
          } else {
            console.log(`[updateRhSolicitudStatus] Notified solicitante for solicitud ${id} (${estado}, ${tipo})`);
          }
        }
      } catch (notifErr) {
        console.error(
          "[updateRhSolicitudStatus] Notification error:",
          notifErr,
        );
      }
    }

    revalidatePath("/ted/rh-solicitudes");
    return { success: true };
  } catch (err) {
    console.error("[updateRhSolicitudStatus] Unexpected error:", err);
    return { success: false, error: "Error inesperado" };
  }
}
