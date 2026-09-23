"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { fanOutNotifyByConfig } from "@/lib/notification-recipient/runtime-resolve";
import { isAdminOsiConfigMode } from "@/lib/notification-recipient/runtime-mode";
import {
  legacyInsertInboxRow,
  legacyNotifyPendingAdmin,
  legacyNotifyCoordinadorOfPendingExterna,
  legacyNotifyLiderOfPendingInterna,
  legacyNotifyDeptCoordinadorCopy,
} from "@/lib/notification-recipient/requisicion-notifications-legacy";

/**
 * Notificaciones de requisiciones.
 *
 * Destinatarios = TED `notify.event_recipient_config` (editable en
 * /ted/notificaciones). El código solo dispara el event_key + contexto.
 *
 * Defaults:
 * - pending_admin → gestor + coordinador Admin (estimar / trámite inicial)
 * - costos_aprobados → mismo set (tras sello del líder por monto)
 * - pending_coordinador / pending_lider → organigrama ∩ permiso/rol
 */
const APP_SLUG = "administracion";

export async function notifyAdminsOfNewRequisicion(
  requisicionId: number,
  solicitanteName: string,
  requisicionLabel: string,
) {
  try {
    const supabase = await createAdminClient();
    const isInterna = requisicionLabel === "interna" || requisicionLabel.includes("interna");
    const title = isInterna
      ? "Requisición pendiente de estimar costos"
      : "Requisición lista para Administración";
    const body = isInterna
      ? `${solicitanteName} tiene una requisición interna lista para que Administración estime costos.`
      : `${solicitanteName} tiene una requisición ${requisicionLabel} lista para trámite de Administración.`;

    if (!(await isAdminOsiConfigMode(supabase))) {
      await legacyNotifyPendingAdmin(
        supabase,
        requisicionId,
        solicitanteName,
        requisicionLabel,
        { title, body, event_key: "requisicion_pending_admin" },
      );
      return;
    }

    const rows = await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: "requisicion_pending_admin",
      title,
      body,
      linkPath: `/requisiciones/view/${requisicionId}`,
      dedupeKey: `requisicion:${requisicionId}:pending_admin:${Date.now()}`,
      priority: 2,
    });

    if (rows === 0) {
      console.error(
        "[notifyAdminsOfNewRequisicion] No recipients for requisicion_pending_admin",
        { requisicionId },
      );
    }
  } catch (err) {
    console.error("[notifyAdminsOfNewRequisicion] Unexpected error:", err);
  }
}

/** Tras aprobación del líder por monto: Admin puede procesar (costos ya sellados). */
export async function notifyAdminsOfCostosAprobados(
  requisicionId: number,
  solicitanteName: string,
  requisicionLabel: string,
) {
  try {
    const supabase = await createAdminClient();
    const title = "Costos aprobados — lista para procesar";
    const body = `${solicitanteName}: el líder aprobó los costos de la requisición ${requisicionLabel}. Administración ya puede procesarla.`;

    if (!(await isAdminOsiConfigMode(supabase))) {
      await legacyNotifyPendingAdmin(
        supabase,
        requisicionId,
        solicitanteName,
        requisicionLabel,
        { title, body, event_key: "requisicion_costos_aprobados" },
      );
      return;
    }

    const rows = await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: "requisicion_costos_aprobados",
      title,
      body,
      linkPath: `/requisiciones/view/${requisicionId}`,
      dedupeKey: `requisicion:${requisicionId}:costos_aprobados:${Date.now()}`,
      priority: 2,
    });

    if (rows === 0) {
      console.error(
        "[notifyAdminsOfCostosAprobados] No recipients for requisicion_costos_aprobados",
        { requisicionId },
      );
    }
  } catch (err) {
    console.error("[notifyAdminsOfCostosAprobados] Unexpected error:", err);
  }
}

export async function notifyLiderOfPendingInterna(
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  try {
    if (!departamentoName?.trim()) {
      console.error(
        "[notifyLiderOfPendingInterna] Missing departamento_nombre",
        { requisicionId },
      );
      return;
    }

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

    const rows = await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: "requisicion_pending_lider",
      title: "Requisición Interna Pendiente de Aprobación",
      body: `${solicitanteName} tiene una requisición interna que requiere su aprobación como Líder.`,
      linkPath: `/requisiciones/view/${requisicionId}`,
      dedupeKey: `requisicion:${requisicionId}:pending_lider:${Date.now()}`,
      priority: 2,
      context: { departamento_nombre: departamentoName.trim() },
    });

    if (rows === 0) {
      console.error(
        "[notifyLiderOfPendingInterna] No recipients for pending_lider",
        { requisicionId, departamentoName },
      );
    }
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
    if (!departamentoName?.trim()) {
      console.error(
        "[notifyCoordinadorOfPendingExterna] Missing departamento_nombre",
        { requisicionId },
      );
      return;
    }

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

    const rows = await fanOutNotifyByConfig(supabase, {
      appSlug: APP_SLUG,
      eventKey: "requisicion_pending_coordinador",
      title: "Requisición Pendiente de Aprobación (Coordinador)",
      body: `${solicitanteName} tiene una requisición interna que requiere su aprobación como Coordinador.`,
      linkPath: `/requisiciones/view/${requisicionId}`,
      dedupeKey: `requisicion:${requisicionId}:pending_coordinador:${Date.now()}`,
      priority: 2,
      context: { departamento_nombre: departamentoName.trim() },
    });

    if (rows === 0) {
      console.error(
        "[notifyCoordinadorOfPendingExterna] No recipients for pending_coordinador",
        { requisicionId, departamentoName },
      );
    }
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
  context: { departamento_nombre?: string } = {},
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
      if (context.departamento_nombre?.trim()) {
        await legacyNotifyDeptCoordinadorCopy(supabase, {
          event_key: eventKey,
          departamento_nombre: context.departamento_nombre.trim(),
          exclude_auth_id: creatorAuthId,
          title,
          body,
          link_path: `/requisiciones/view/${requisicionId}`,
          dedupe_key: `${dedupeKey}:coord`,
          priority,
        });
      }
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
      context: {
        creador_auth: creatorAuthId,
        ...(context.departamento_nombre?.trim()
          ? { departamento_nombre: context.departamento_nombre.trim() }
          : {}),
      },
    });
  } catch (err) {
    console.error(`[${eventKey}] Unexpected error:`, err);
  }
}

export async function notifyCreatorOfProcesada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  departamentoName?: string | null,
) {
  await notifyCreatorEvent(
    "requisicion_procesada",
    requisicionId,
    creatorAuthId,
    "Requisición Procesada",
    `La requisición ${requisicionLabel} ha sido procesada por Administración.`,
    `requisicion:${requisicionId}:procesada:${Date.now()}`,
    2,
    { departamento_nombre: departamentoName ?? undefined },
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
