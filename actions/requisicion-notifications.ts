"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { fanOutNotifyByConfig } from "@/lib/notification-recipient/runtime-resolve";
import { isAdminOsiConfigMode } from "@/lib/notification-recipient/runtime-mode";
import {
  legacyInsertInboxRow,
  legacyNotifyAdminsOfNewRequisicion,
  legacyNotifyCoordinadorOfPendingExterna,
  legacyNotifyLiderOfPendingInterna,
} from "@/lib/notification-recipient/requisicion-notifications-legacy";
import {
  resolveInternaApprovalGerencia,
  isServiciosTecnicosDept,
  isAdministracionDept,
} from "@/lib/requisiciones-gerencia";

const APP_SLUG = "administracion";
const ST_APP_ID = 5;
const SADMINISTRACION_APP_ID = 4;

async function getAppLiderAuthIds(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  appId: number,
): Promise<string[]> {
  const { data: role } = await supabase
    .schema("authprisma")
    .from("roles")
    .select("id")
    .eq("app_id", appId)
    .eq("slug", "lider")
    .maybeSingle();
  if (!role?.id) return [];

  const { data: assignments } = await supabase
    .schema("authprisma")
    .from("user_app_roles")
    .select("usuario_id")
    .eq("app_id", appId)
    .eq("role_id", role.id);
  const usuarioIds = (assignments || [])
    .map((row: { usuario_id: number }) => row.usuario_id)
    .filter(Boolean);
  if (usuarioIds.length === 0) return [];

  const { data: users } = await supabase
    .from("usuarios")
    .select("id_auth")
    .in("id", usuarioIds)
    .not("id_auth", "is", null);
  return [...new Set(
    (users || [])
      .map((u: { id_auth: string | null }) => u.id_auth)
      .filter((id): id is string => Boolean(id)),
  )];
}

export async function notifyAdminsOfNewRequisicion(
  requisicionId: number,
  solicitanteName: string,
  requisicionLabel: string,
) {
  try {
    const supabase = await createAdminClient();
    if (!(await isAdminOsiConfigMode(supabase))) {
      await legacyNotifyAdminsOfNewRequisicion(
        supabase,
        requisicionId,
        solicitanteName,
        requisicionLabel,
      );
      return;
    }

    const rows = await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: "requisicion_created",
      title: "Nueva Requisición Creada",
      body: `${solicitanteName} ha creado una nueva requisición ${requisicionLabel}.`,
      linkPath: `/requisiciones/edit/${requisicionId}`,
      dedupeKey: `requisicion:${requisicionId}:created`,
      priority: 2,
    });

    if (rows === 0) {
      console.warn("[notifyAdminsOfNewRequisicion] No recipients resolved");
    }
  } catch (err) {
    console.error("[notifyAdminsOfNewRequisicion] Unexpected error:", err);
  }
}

export async function notifyLiderOfPendingInterna(
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  try {
    const supabase = await createAdminClient();
    if (!(await isAdminOsiConfigMode(supabase))) {
      await legacyNotifyLiderOfPendingInterna(
        supabase,
        requisicionId,
        solicitanteName,
        departamentoName,
      );
      return;
    }

    const gerenciaLabel = resolveInternaApprovalGerencia(departamentoName);
    const context: Record<string, unknown> = {};

    if (gerenciaLabel) {
      const { data: gerencia, error: gerenciaError } = await supabase
        .from("gerencias")
        .select("lider")
        .ilike("nombre", gerenciaLabel)
        .maybeSingle();

      if (gerenciaError || !gerencia?.lider) {
        console.error(
          "[notifyLiderOfPendingInterna] Could not resolve override gerencia:",
          gerenciaLabel,
          gerenciaError,
        );
        return;
      }

      const { data: lider, error: liderError } = await supabase
        .from("usuarios")
        .select("id_auth")
        .eq("id", gerencia.lider)
        .maybeSingle();

      if (liderError || !lider?.id_auth) {
        console.warn(
          "[notifyLiderOfPendingInterna] Could not resolve override lider auth:",
          liderError,
        );
        return;
      }

      context.recipient_auth_ids = [lider.id_auth];
    } else {
      context.departamento_nombre = departamentoName;
    }

    const extraLiderAuthIds: string[] = [];
    if (isServiciosTecnicosDept(departamentoName)) {
      extraLiderAuthIds.push(...(await getAppLiderAuthIds(supabase, ST_APP_ID)));
    }
    if (isAdministracionDept(departamentoName)) {
      extraLiderAuthIds.push(
        ...(await getAppLiderAuthIds(supabase, SADMINISTRACION_APP_ID)),
      );
    }
    if (extraLiderAuthIds.length > 0) {
      const existing = Array.isArray(context.recipient_auth_ids)
        ? (context.recipient_auth_ids as string[])
        : [];
      context.recipient_auth_ids = [...new Set([...existing, ...extraLiderAuthIds])];
    }

    await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: "requisicion_pending_lider",
      title: "Requisición Interna Pendiente de Aprobación",
      body: `${solicitanteName} ha creado una requisición interna que requiere su aprobación como Lider de la Gerencia.`,
      linkPath: `/requisiciones/view/${requisicionId}`,
      dedupeKey: `requisicion:${requisicionId}:pending_lider`,
      priority: 2,
      context,
    });
  } catch (err) {
    console.error("[notifyLiderOfPendingInterna] Unexpected error:", err);
  }
}

export async function notifyCoordinadorOfPendingExterna(
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  try {
    const supabase = await createAdminClient();
    if (!(await isAdminOsiConfigMode(supabase))) {
      await legacyNotifyCoordinadorOfPendingExterna(
        supabase,
        requisicionId,
        solicitanteName,
        departamentoName,
      );
      return;
    }

    const { data: dept, error: deptError } = await supabase
      .from("departamentos")
      .select("coordinador, gerencia, gerencias!departamentos_gerencia_fkey(lider)")
      .ilike("nombre", departamentoName)
      .maybeSingle();

    if (deptError || !dept) {
      console.error(
        "[notifyCoordinadorOfPendingExterna] Could not resolve department:",
        deptError,
      );
      return;
    }

    const isFallback = !dept.coordinador;
    const title = isFallback
      ? "Requisición Externa Pendiente de Aprobación (Lider)"
      : "Requisición Externa Pendiente de Aprobación (Coordinador)";
    const body = isFallback
      ? `${solicitanteName} ha creado una requisición externa que requiere su aprobación como Lider (el departamento no tiene coordinador asignado).`
      : `${solicitanteName} ha creado una requisición externa que requiere su aprobación como Coordinador del departamento.`;

    await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: "requisicion_pending_coordinador",
      title,
      body,
      linkPath: `/requisiciones/view/${requisicionId}`,
      dedupeKey: `requisicion:${requisicionId}:pending_coordinador`,
      priority: 2,
      context: { departamento_nombre: departamentoName },
    });
  } catch (err) {
    console.error("[notifyCoordinadorOfPendingExterna] Unexpected error:", err);
  }
}

async function notifyCreatorEvent(
  eventKey: string,
  requisicionId: number,
  creatorAuthId: string,
  title: string,
  body: string,
  dedupeKey: string,
  priority = 2,
) {
  try {
    const supabase = await createAdminClient();
    if (!(await isAdminOsiConfigMode(supabase))) {
      await legacyInsertInboxRow(supabase, {
        event_key: eventKey,
        recipient_id_auth: creatorAuthId,
        title,
        body,
        link_path: `/requisiciones/view/${requisicionId}`,
        dedupe_key: dedupeKey,
        priority,
      });
      return;
    }

    await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey,
      title,
      body,
      linkPath: `/requisiciones/view/${requisicionId}`,
      dedupeKey,
      priority,
      context: { creador_auth: creatorAuthId },
    });
  } catch (err) {
    console.error(`[${eventKey}] Unexpected error:`, err);
  }
}

export async function notifyCreatorOfProcesada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
) {
  await notifyCreatorEvent(
    "requisicion_procesada",
    requisicionId,
    creatorAuthId,
    "Requisición Procesada",
    `Tu requisición ${requisicionLabel} ha sido procesada por Administración.`,
    `requisicion:${requisicionId}:procesada:${Date.now()}`,
  );
}

export async function notifyCreatorOfRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivoRechazo?: string,
) {
  const body = motivoRechazo?.trim()
    ? `Tu requisición ${requisicionLabel} ha sido rechazada por Administración. Motivo: ${motivoRechazo.trim()}`
    : `Tu requisición ${requisicionLabel} ha sido rechazada por Administración.`;

  await notifyCreatorEvent(
    "requisicion_rechazada",
    requisicionId,
    creatorAuthId,
    "Requisición Rechazada",
    body,
    `requisicion:${requisicionId}:rechazada:${Date.now()}`,
  );
}

export async function notifyCreatorOfCoordinadorRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivo: string,
) {
  await notifyCreatorEvent(
    "requisicion_rechazada",
    requisicionId,
    creatorAuthId,
    "Requisición Rechazada por Coordinador",
    `Tu requisición ${requisicionLabel} fue rechazada por el Coordinador. Motivo: ${motivo}`,
    `requisicion:${requisicionId}:coordinador_rechazada:${Date.now()}`,
  );
}

export async function notifyCreatorOfLiderRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivo: string,
) {
  await notifyCreatorEvent(
    "requisicion_rechazada",
    requisicionId,
    creatorAuthId,
    "Requisición Rechazada por Lider",
    `Tu requisición ${requisicionLabel} fue rechazada por el Lider. Motivo: ${motivo}`,
    `requisicion:${requisicionId}:lider_rechazada:${Date.now()}`,
  );
}

export async function notifyCreatorOfPartialVerificacion(
  requisicionId: number,
  creatorAuthId: string,
  verifiedCount: number,
  totalCount: number,
  requisicionLabel: string,
) {
  await notifyCreatorEvent(
    "requisicion_parcial",
    requisicionId,
    creatorAuthId,
    "Avance en Requisición",
    `Tu requisición ${requisicionLabel} tiene ${verifiedCount} de ${totalCount} items verificados por Administración.`,
    `requisicion:${requisicionId}:parcial:${Date.now()}`,
    1,
  );
}

export async function notifyAdminOfAcuseRecibo(
  requisicionId: number,
  adminAuthId: string,
  solicitanteName: string,
  requisicionLabel: string,
) {
  try {
    const supabase = await createAdminClient();
    if (!(await isAdminOsiConfigMode(supabase))) {
      await legacyInsertInboxRow(supabase, {
        event_key: "requisicion_acuse",
        recipient_id_auth: adminAuthId,
        title: "Acuse de Recibo Confirmado",
        body: `${solicitanteName} ha confirmado la recepción de la requisición ${requisicionLabel}.`,
        link_path: `/requisiciones/view/${requisicionId}`,
        dedupe_key: `requisicion:${requisicionId}:acuse:${Date.now()}`,
        priority: 2,
      });
      return;
    }

    await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: "requisicion_acuse",
      title: "Acuse de Recibo Confirmado",
      body: `${solicitanteName} ha confirmado la recepción de la requisición ${requisicionLabel}.`,
      linkPath: `/requisiciones/view/${requisicionId}`,
      dedupeKey: `requisicion:${requisicionId}:acuse:${Date.now()}`,
      priority: 2,
      context: { assignee_auth: adminAuthId },
    });
  } catch (err) {
    console.error("[notifyAdminOfAcuseRecibo] Unexpected error:", err);
  }
}

export async function notifyCreatorOfApproverChanges(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  approverRole: string,
) {
  await notifyCreatorEvent(
    "requisicion_aprobador_cambios",
    requisicionId,
    creatorAuthId,
    "Cambios en tu Requisición",
    `El ${approverRole} modificó el contenido de tu requisición ${requisicionLabel} antes de aprobarla. Revisa los cambios en el detalle de la requisición.`,
    `requisicion:${requisicionId}:aprobador_cambios`,
  );
}
