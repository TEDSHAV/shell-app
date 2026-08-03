"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function notifyAdminsOfNewRequisicion(
  requisicionId: number,
  solicitanteName: string,
  requisicionLabel: string,
) {
  try {
    const supabase = await createAdminClient();

    const { data: depto, error: deptError } = await supabase
      .from("departamentos")
      .select("id, nombre")
      .ilike("nombre", "%admin%")
      .single();

    if (deptError || !depto) {
      console.error(
        "[notifyAdminsOfNewRequisicion] Could not find Administracion department:",
        deptError,
      );
      return;
    }

    const { data: adminUsers, error: usersError } = await supabase
      .from("usuarios")
      .select("id_auth")
      .eq("departamento", depto.id)
      .not("id_auth", "is", null)
      .eq("esta_activo", true);

    if (usersError || !adminUsers || adminUsers.length === 0) {
      console.warn(
        "[notifyAdminsOfNewRequisicion] No active admin users found:",
        usersError,
      );
      return;
    }

    const rows = adminUsers
      .filter((u: { id_auth: string | null }) => u.id_auth)
      .map((u: { id_auth: string }) => ({
        app_slug: "administracion",
        event_key: "requisicion_created",
        recipient_id_auth: u.id_auth,
        title: "Nueva Requisición Creada",
        body: `${solicitanteName} ha creado una nueva requisición ${requisicionLabel}.`,
        link_path: `/requisiciones/edit/${requisicionId}`,
        dedupe_key: `requisicion:${requisicionId}:created`,
        priority: 2,
      }));

    if (rows.length === 0) return;

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert(rows);

    if (insertError) {
      console.error(
        "[notifyAdminsOfNewRequisicion] Error inserting notifications:",
        insertError,
      );
    }
  } catch (err) {
    console.error("[notifyAdminsOfNewRequisicion] Unexpected error:", err);
  }
}

// Notify the gerencia's lider that an interna is pending their approval.
// Resolves the lider via departamentos.gerencia → gerencias.lider → usuarios.id_auth.
export async function notifyLiderOfPendingInterna(
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  try {
    const supabase = await createAdminClient();

    // Resolve the lider's auth id for the given department's gerencia.
    const { data: dept, error: deptError } = await supabase
      .from("departamentos")
      .select("gerencia, gerencias!departamentos_gerencia_fkey(lider)")
      .ilike("nombre", departamentoName)
      .maybeSingle();

    console.log("[notifyLiderOfPendingInterna] dept lookup:", { departamentoName, dept, deptError });

    if (deptError || !dept) {
      console.error("[notifyLiderOfPendingInterna] Could not resolve department:", deptError);
      return;
    }

    const liderUsuarioId = (dept.gerencias as any)?.lider;
    console.log("[notifyLiderOfPendingInterna] liderUsuarioId:", liderUsuarioId, "gerencia:", dept.gerencia);
    if (!liderUsuarioId) {
      console.warn("[notifyLiderOfPendingInterna] No lider set on gerencia:", dept.gerencia);
      return;
    }

    const { data: lider, error: liderError } = await supabase
      .from("usuarios")
      .select("id_auth")
      .eq("id", liderUsuarioId)
      .maybeSingle();

    console.log("[notifyLiderOfPendingInterna] lider user lookup:", { lider, liderError });
    if (liderError || !lider?.id_auth) {
      console.warn("[notifyLiderOfPendingInterna] Could not resolve lider auth id:", liderError);
      return;
    }

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
        app_slug: "administracion",
        event_key: "requisicion_pending_lider",
        recipient_id_auth: lider.id_auth,
        title: "Requisición Interna Pendiente de Aprobación",
        body: `${solicitanteName} ha creado una requisición interna que requiere su aprobación como Lider de la Gerencia.`,
        link_path: `/requisiciones/view/${requisicionId}`,
        dedupe_key: `requisicion:${requisicionId}:pending_lider`,
        priority: 2,
      });

    if (insertError) {
      console.error("[notifyLiderOfPendingInterna] Error inserting notification:", insertError);
    }
  } catch (err) {
    console.error("[notifyLiderOfPendingInterna] Unexpected error:", err);
  }
}

// Notify the department's coordinador that an externa is pending their approval.
// If the department has no coordinador, notifies the gerencia's lider (fallback).
export async function notifyCoordinadorOfPendingExterna(
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  try {
    const supabase = await createAdminClient();

    const { data: dept, error: deptError } = await supabase
      .from("departamentos")
      .select("coordinador, gerencia, gerencias!departamentos_gerencia_fkey(lider)")
      .ilike("nombre", departamentoName)
      .maybeSingle();

    if (deptError || !dept) {
      console.error("[notifyCoordinadorOfPendingExterna] Could not resolve department:", deptError);
      return;
    }

    // Prefer the department's coordinador; fall back to the gerencia's lider.
    const approverUsuarioId = dept.coordinador || (dept.gerencias as any)?.lider;
    if (!approverUsuarioId) {
      console.warn("[notifyCoordinadorOfPendingExterna] No approver found for department:", departamentoName);
      return;
    }

    const { data: approver, error: approverError } = await supabase
      .from("usuarios")
      .select("id_auth")
      .eq("id", approverUsuarioId)
      .maybeSingle();

    if (approverError || !approver?.id_auth) {
      console.warn("[notifyCoordinadorOfPendingExterna] Could not resolve approver auth id:", approverError);
      return;
    }

    const isFallback = !dept.coordinador;
    const title = isFallback
      ? "Requisición Externa Pendiente de Aprobación (Lider)"
      : "Requisición Externa Pendiente de Aprobación (Coordinador)";
    const body = isFallback
      ? `${solicitanteName} ha creado una requisición externa que requiere su aprobación como Lider (el departamento no tiene coordinador asignado).`
      : `${solicitanteName} ha creado una requisición externa que requiere su aprobación como Coordinador del departamento.`;

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
        app_slug: "administracion",
        event_key: "requisicion_pending_coordinador",
        recipient_id_auth: approver.id_auth,
        title,
        body,
        link_path: `/requisiciones/view/${requisicionId}`,
        dedupe_key: `requisicion:${requisicionId}:pending_coordinador`,
        priority: 2,
      });

    if (insertError) {
      console.error("[notifyCoordinadorOfPendingExterna] Error inserting notification:", insertError);
    }
  } catch (err) {
    console.error("[notifyCoordinadorOfPendingExterna] Unexpected error:", err);
  }
}

export async function notifyCreatorOfProcesada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
) {
  try {
    const supabase = await createAdminClient();

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
          app_slug: "administracion",
          event_key: "requisicion_procesada",
          recipient_id_auth: creatorAuthId,
          title: "Requisición Procesada",
          body: `Tu requisición ${requisicionLabel} ha sido procesada por Administración.`,
          link_path: `/requisiciones/view/${requisicionId}`,
          dedupe_key: `requisicion:${requisicionId}:procesada:${Date.now()}`,
          priority: 2,
        });

    if (insertError) {
      console.error(
        "[notifyCreatorOfProcesada] Error inserting notification:",
        insertError,
      );
    }
    } catch (err) {
    console.error("[notifyCreatorOfProcesada] Unexpected error:", err);
  }
}

export async function notifyCreatorOfRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivoRechazo?: string,
) {
  try {
    const supabase = await createAdminClient();

    console.log(`[notifyCreatorOfRechazada] Inserting notification for creator ${creatorAuthId}, req #${requisicionId}`);

    const body = motivoRechazo?.trim()
      ? `Tu requisición ${requisicionLabel} ha sido rechazada por Administración. Motivo: ${motivoRechazo.trim()}`
      : `Tu requisición ${requisicionLabel} ha sido rechazada por Administración.`;

    const { data: insertData, error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
          app_slug: "administracion",
          event_key: "requisicion_rechazada",
          recipient_id_auth: creatorAuthId,
          title: "Requisición Rechazada",
          body,
          link_path: `/requisiciones/view/${requisicionId}`,
          dedupe_key: `requisicion:${requisicionId}:rechazada:${Date.now()}`,
          priority: 2,
        })
      .select();

    if (insertError) {
      console.error(
        "[notifyCreatorOfRechazada] Error inserting notification:",
        insertError,
      );
    } else {
      console.log(`[notifyCreatorOfRechazada] Insert successful:`, insertData);
    }
  } catch (err) {
    console.error("[notifyCreatorOfRechazada] Unexpected error:", err);
  }
}

// Notify the creator that a coordinador rejected their interna with a reason.
export async function notifyCreatorOfCoordinadorRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivo: string,
) {
  try {
    const supabase = await createAdminClient();

    const body = `Tu requisición ${requisicionLabel} fue rechazada por el Coordinador. Motivo: ${motivo}`;

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
          app_slug: "administracion",
          event_key: "requisicion_rechazada",
          recipient_id_auth: creatorAuthId,
          title: "Requisición Rechazada por Coordinador",
          body,
          link_path: `/requisiciones/view/${requisicionId}`,
          dedupe_key: `requisicion:${requisicionId}:coordinador_rechazada:${Date.now()}`,
          priority: 2,
        });

    if (insertError) {
      console.error(
        "[notifyCreatorOfCoordinadorRechazada] Error inserting notification:",
        insertError,
      );
    }
  } catch (err) {
    console.error("[notifyCreatorOfCoordinadorRechazada] Unexpected error:", err);
  }
}

export async function notifyCreatorOfLiderRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivo: string,
) {
  try {
    const supabase = await createAdminClient();

    const body = `Tu requisición ${requisicionLabel} fue rechazada por el Lider. Motivo: ${motivo}`;

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
          app_slug: "administracion",
          event_key: "requisicion_rechazada",
          recipient_id_auth: creatorAuthId,
          title: "Requisición Rechazada por Lider",
          body,
          link_path: `/requisiciones/view/${requisicionId}`,
          dedupe_key: `requisicion:${requisicionId}:lider_rechazada:${Date.now()}`,
          priority: 2,
        });

    if (insertError) {
      console.error(
        "[notifyCreatorOfLiderRechazada] Error inserting notification:",
        insertError,
      );
    }
  } catch (err) {
    console.error("[notifyCreatorOfLiderRechazada] Unexpected error:", err);
  }
}

export async function notifyCreatorOfPartialVerificacion(
  requisicionId: number,
  creatorAuthId: string,
  verifiedCount: number,
  totalCount: number,
  requisicionLabel: string,
) {
  try {
    const supabase = await createAdminClient();

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
          app_slug: "administracion",
          event_key: "requisicion_parcial",
          recipient_id_auth: creatorAuthId,
          title: "Avance en Requisición",
          body: `Tu requisición ${requisicionLabel} tiene ${verifiedCount} de ${totalCount} items verificados por Administración.`,
          link_path: `/requisiciones/view/${requisicionId}`,
          dedupe_key: `requisicion:${requisicionId}:parcial:${Date.now()}`,
          priority: 1,
        });

    if (insertError) {
      console.error(
        "[notifyCreatorOfPartialVerificacion] Error inserting notification:",
        insertError,
      );
    }
  } catch (err) {
    console.error("[notifyCreatorOfPartialVerificacion] Unexpected error:", err);
  }
}

export async function notifyAdminOfAcuseRecibo(
  requisicionId: number,
  adminAuthId: string,
  solicitanteName: string,
  requisicionLabel: string,
) {
  try {
    const supabase = await createAdminClient();

    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
          app_slug: "administracion",
          event_key: "requisicion_acuse",
          recipient_id_auth: adminAuthId,
          title: "Acuse de Recibo Confirmado",
          body: `${solicitanteName} ha confirmado la recepción de la requisición ${requisicionLabel}.`,
          link_path: `/requisiciones/view/${requisicionId}`,
          dedupe_key: `requisicion:${requisicionId}:acuse:${Date.now()}`,
          priority: 2,
        });

    if (insertError) {
      console.error(
        "[notifyAdminOfAcuseRecibo] Error inserting notification:",
        insertError,
      );
    }
  } catch (err) {
    console.error("[notifyAdminOfAcuseRecibo] Unexpected error:", err);
  }
}
