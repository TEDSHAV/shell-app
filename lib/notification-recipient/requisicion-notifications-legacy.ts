import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveInternaApprovalGerencia } from "@/lib/requisiciones-gerencia";

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
  const { data: dept, error: deptError } = await supabase
    .from("departamentos")
    .select("coordinador, gerencia, gerencias!departamentos_gerencia_fkey(lider)")
    .ilike("nombre", departamentoName)
    .maybeSingle();

  if (deptError || !dept) {
    console.error(
      "[legacyNotifyCoordinadorOfPendingExterna] Could not resolve department:",
      deptError,
    );
    return;
  }

  const approverUsuarioId =
    dept.coordinador ||
    (dept.gerencias as { lider?: number | null } | null)?.lider;
  if (!approverUsuarioId) {
    console.warn(
      "[legacyNotifyCoordinadorOfPendingExterna] No approver found for department:",
      departamentoName,
    );
    return;
  }

  const { data: approver, error: approverError } = await supabase
    .from("usuarios")
    .select("id_auth")
    .eq("id", approverUsuarioId)
    .maybeSingle();

  if (approverError || !approver?.id_auth) {
    console.warn(
      "[legacyNotifyCoordinadorOfPendingExterna] Could not resolve approver auth id:",
      approverError,
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
    console.error(
      "[legacyNotifyCoordinadorOfPendingExterna] Error inserting notification:",
      insertError,
    );
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
