import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveInternaApprovalGerencia } from "@/lib/requisiciones-gerencia";
import { REQUISICION_COORDINADOR_ROLES } from "@/lib/requisiciones-approver-roles";

/** Fan-out hardcode previo al cableado TED (modo legacy). */
export async function legacyNotifyAdminsOfNewRequisicion(
  supabase: SupabaseClient,
  requisicionId: number,
  solicitanteName: string,
  requisicionLabel: string,
) {
  const { data: depto, error: deptError } = await supabase
    .from("departamentos")
    .select("id, nombre")
    .ilike("nombre", "%admin%")
    .single();

  if (deptError || !depto) {
    console.error(
      "[legacyNotifyAdminsOfNewRequisicion] Could not find Administracion department:",
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
      "[legacyNotifyAdminsOfNewRequisicion] No active admin users found:",
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
      "[legacyNotifyAdminsOfNewRequisicion] Error inserting notifications:",
      insertError,
    );
  }
}

export async function legacyNotifyLiderOfPendingInterna(
  supabase: SupabaseClient,
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  let liderUsuarioId: number | null = null;
  let gerenciaLabel: string | null =
    resolveInternaApprovalGerencia(departamentoName);

  if (gerenciaLabel) {
    const { data: gerencia, error: gerenciaError } = await supabase
      .from("gerencias")
      .select("lider")
      .ilike("nombre", gerenciaLabel)
      .maybeSingle();
    if (gerenciaError || !gerencia) {
      console.error(
        "[legacyNotifyLiderOfPendingInterna] Could not resolve override gerencia:",
        gerenciaLabel,
        gerenciaError,
      );
      return;
    }
    liderUsuarioId = gerencia.lider;
  } else {
    const { data: dept, error: deptError } = await supabase
      .from("departamentos")
      .select("gerencia, gerencias!departamentos_gerencia_fkey(lider)")
      .ilike("nombre", departamentoName)
      .maybeSingle();

    if (deptError || !dept) {
      console.error(
        "[legacyNotifyLiderOfPendingInterna] Could not resolve department:",
        deptError,
      );
      return;
    }

    gerenciaLabel = dept.gerencia;
    liderUsuarioId =
      (dept.gerencias as { lider?: number | null } | null)?.lider ?? null;
  }

  if (!liderUsuarioId) {
    console.warn(
      "[legacyNotifyLiderOfPendingInterna] No lider set on gerencia:",
      gerenciaLabel,
    );
    return;
  }

  const { data: lider, error: liderError } = await supabase
    .from("usuarios")
    .select("id_auth")
    .eq("id", liderUsuarioId)
    .maybeSingle();

  if (liderError || !lider?.id_auth) {
    console.warn(
      "[legacyNotifyLiderOfPendingInterna] Could not resolve lider auth id:",
      liderError,
    );
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
    console.error(
      "[legacyNotifyLiderOfPendingInterna] Error inserting notification:",
      insertError,
    );
  }
}

export async function legacyNotifyCoordinadorOfPendingExterna(
  supabase: SupabaseClient,
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  const recipientIds: string[] = [];
  for (const entry of REQUISICION_COORDINADOR_ROLES) {
    if (!entry.matchesDept(departamentoName)) continue;
    const { data: role } = await supabase
      .schema("authprisma")
      .from("roles")
      .select("id")
      .eq("app_id", entry.appId)
      .eq("slug", entry.roleSlug)
      .maybeSingle();
    if (!role?.id) continue;
    const { data: assignments } = await supabase
      .schema("authprisma")
      .from("user_app_roles")
      .select("usuario_id")
      .eq("app_id", entry.appId)
      .eq("role_id", role.id);
    const usuarioIds = (assignments || [])
      .map((row: { usuario_id: number }) => row.usuario_id)
      .filter(Boolean);
    if (usuarioIds.length === 0) continue;
    const { data: users } = await supabase
      .from("usuarios")
      .select("id_auth")
      .in("id", usuarioIds)
      .not("id_auth", "is", null);
    for (const user of users || []) {
      if (user.id_auth) recipientIds.push(user.id_auth);
    }
  }
  const uniqueIds = [...new Set(recipientIds)];
  if (uniqueIds.length === 0) {
    console.warn(
      "[legacyNotifyCoordinadorOfPendingExterna] No coordinador role recipients for:",
      departamentoName,
    );
    return;
  }

  for (const recipient_id_auth of uniqueIds) {
    const { error: insertError } = await supabase
      .schema("notify")
      .from("inbox")
      .insert({
        app_slug: "administracion",
        event_key: "requisicion_pending_coordinador",
        recipient_id_auth,
        title: "Requisición Pendiente de Aprobación (Coordinador)",
        body: `${solicitanteName} ha creado una requisición interna que requiere su aprobación como Coordinador.`,
        link_path: `/requisiciones/view/${requisicionId}`,
        dedupe_key: `requisicion:${requisicionId}:pending_coordinador:${recipient_id_auth}`,
        priority: 2,
      });
    if (insertError) {
      console.error(
        "[legacyNotifyCoordinadorOfPendingExterna] Error inserting notification:",
        insertError,
      );
    }
  }
}

export async function legacyInsertInboxRow(
  supabase: SupabaseClient,
  row: {
    event_key: string;
    recipient_id_auth: string;
    title: string;
    body: string;
    link_path: string;
    dedupe_key: string;
    priority: number;
  },
) {
  const { error: insertError } = await supabase
    .schema("notify")
    .from("inbox")
    .insert({
      app_slug: "administracion",
      ...row,
    });

  if (insertError) {
    console.error(
      `[legacyInsertInboxRow] ${row.event_key}:`,
      insertError,
    );
  }
}
