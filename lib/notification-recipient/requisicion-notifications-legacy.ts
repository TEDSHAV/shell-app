import type { SupabaseClient } from "@supabase/supabase-js";

/** Fan-out hardcode previo al cableado TED (modo legacy). */

const ADMIN_OPERATIVE_ROLE_KEYS = [
  { app: "sadministracion", role: "gestor" },
  { app: "sadministracion", role: "coordinador" },
] as const;

async function resolveAuthIdsForAdminOperativeRoles(
  supabase: SupabaseClient,
): Promise<string[]> {
  const ids: string[] = [];
  for (const entry of ADMIN_OPERATIVE_ROLE_KEYS) {
    const { data: app } = await supabase
      .schema("authprisma")
      .from("apps")
      .select("id")
      .eq("slug", entry.app)
      .maybeSingle();
    if (!app?.id) continue;
    const { data: role } = await supabase
      .schema("authprisma")
      .from("roles")
      .select("id")
      .eq("app_id", app.id)
      .eq("slug", entry.role)
      .maybeSingle();
    if (!role?.id) continue;
    const { data: assignments } = await supabase
      .schema("authprisma")
      .from("user_app_roles")
      .select("usuario_id")
      .eq("app_id", app.id)
      .eq("role_id", role.id);
    const usuarioIds = (assignments || [])
      .map((row: { usuario_id: number }) => row.usuario_id)
      .filter(Boolean);
    if (usuarioIds.length === 0) continue;
    const { data: users } = await supabase
      .from("usuarios")
      .select("id_auth")
      .in("id", usuarioIds)
      .not("id_auth", "is", null)
      .eq("esta_activo", true);
    for (const user of users || []) {
      if (user.id_auth) ids.push(user.id_auth);
    }
  }
  return [...new Set(ids)];
}

/** @deprecated Prefer legacyNotifyPendingAdmin */
export async function legacyNotifyAdminsOfNewRequisicion(
  supabase: SupabaseClient,
  requisicionId: number,
  solicitanteName: string,
  requisicionLabel: string,
) {
  await legacyNotifyPendingAdmin(
    supabase,
    requisicionId,
    solicitanteName,
    requisicionLabel,
  );
}

export async function legacyNotifyPendingAdmin(
  supabase: SupabaseClient,
  requisicionId: number,
  solicitanteName: string,
  requisicionLabel: string,
  override?: {
    title?: string;
    body?: string;
    event_key?: string;
  },
) {
  let recipientIds = await resolveAuthIdsForAdminOperativeRoles(supabase);

  if (recipientIds.length === 0) {
    const { data: depto } = await supabase
      .from("departamentos")
      .select("id")
      .ilike("nombre", "%admin%")
      .maybeSingle();
    if (depto?.id) {
      const { data: adminUsers } = await supabase
        .from("usuarios")
        .select("id_auth")
        .eq("departamento", depto.id)
        .not("id_auth", "is", null)
        .eq("esta_activo", true);
      recipientIds = (adminUsers || [])
        .map((u: { id_auth: string | null }) => u.id_auth)
        .filter((id): id is string => Boolean(id));
    }
  }

  if (recipientIds.length === 0) {
    console.warn("[legacyNotifyPendingAdmin] No operative Admin recipients");
    return;
  }

  const event_key = override?.event_key || "requisicion_pending_admin";
  const title =
    override?.title ||
    (requisicionLabel === "interna"
      ? "Requisición pendiente de estimar costos"
      : "Requisición lista para Administración");
  const body =
    override?.body ||
    `${solicitanteName} tiene una requisición ${requisicionLabel} lista para trámite de Administración.`;

  const stamp = Date.now();
  const rows = recipientIds.map((recipient_id_auth) => ({
    app_slug: "administracion",
    event_key,
    recipient_id_auth,
    title,
    body,
    link_path: `/requisiciones/view/${requisicionId}`,
    dedupe_key: `requisicion:${requisicionId}:${event_key}:${stamp}:${recipient_id_auth}`,
    priority: 2,
  }));

  const { error: insertError } = await supabase
    .schema("notify")
    .from("inbox")
    .insert(rows);

  if (insertError) {
    console.error("[legacyNotifyPendingAdmin] Error inserting:", insertError);
  }
}

async function resolveLiderAuthId(
  supabase: SupabaseClient,
  departamentoName: string,
): Promise<string | null> {
  const { data: dept, error: deptError } = await supabase
    .from("departamentos")
    .select("gerencia, gerencias!departamentos_gerencia_fkey(lider)")
    .ilike("nombre", departamentoName)
    .maybeSingle();

  if (deptError || !dept) {
    console.error(
      "[legacyNotify] Could not resolve department:",
      departamentoName,
      deptError,
    );
    return null;
  }

  const liderUsuarioId =
    (dept.gerencias as { lider?: number | null } | null)?.lider ?? null;

  if (!liderUsuarioId) {
    console.warn("[legacyNotify] No lider set on gerencia:", dept.gerencia);
    return null;
  }

  const { data: lider, error: liderError } = await supabase
    .from("usuarios")
    .select("id_auth")
    .eq("id", liderUsuarioId)
    .maybeSingle();

  if (liderError || !lider?.id_auth) {
    console.warn("[legacyNotify] Could not resolve lider auth id:", liderError);
    return null;
  }

  return lider.id_auth;
}

async function resolveCoordinadorAuthId(
  supabase: SupabaseClient,
  departamentoName: string,
): Promise<string | null> {
  const { data: dept, error: deptError } = await supabase
    .from("departamentos")
    .select("coordinador, gerencias!departamentos_gerencia_fkey(lider)")
    .ilike("nombre", departamentoName)
    .maybeSingle();

  if (deptError || !dept) {
    console.error(
      "[legacyNotify] Could not resolve department for coordinador:",
      departamentoName,
      deptError,
    );
    return null;
  }

  const usuarioId =
    dept.coordinador ??
    (dept.gerencias as { lider?: number | null } | null)?.lider ??
    null;

  if (!usuarioId) {
    console.warn(
      "[legacyNotify] No coordinador/lider on department:",
      departamentoName,
    );
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from("usuarios")
    .select("id_auth")
    .eq("id", usuarioId)
    .maybeSingle();

  if (userError || !user?.id_auth) {
    console.warn(
      "[legacyNotify] Could not resolve coordinador auth id:",
      userError,
    );
    return null;
  }

  return user.id_auth;
}

export async function legacyNotifyLiderOfPendingInterna(
  supabase: SupabaseClient,
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  const authId = await resolveLiderAuthId(supabase, departamentoName);
  if (!authId) return;

  const { error: insertError } = await supabase
    .schema("notify")
    .from("inbox")
    .insert({
      app_slug: "administracion",
      event_key: "requisicion_pending_lider",
      recipient_id_auth: authId,
      title: "Requisición Interna Pendiente de Aprobación",
      body: `${solicitanteName} tiene una requisición interna que requiere su aprobación como Líder.`,
      link_path: `/requisiciones/view/${requisicionId}`,
      dedupe_key: `requisicion:${requisicionId}:pending_lider:${Date.now()}`,
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
  const authId = await resolveCoordinadorAuthId(supabase, departamentoName);
  if (!authId) return;

  const { error: insertError } = await supabase
    .schema("notify")
    .from("inbox")
    .insert({
      app_slug: "administracion",
      event_key: "requisicion_pending_coordinador",
      recipient_id_auth: authId,
      title: "Requisición Pendiente de Aprobación (Coordinador)",
      body: `${solicitanteName} tiene una requisición interna que requiere su aprobación como Coordinador.`,
      link_path: `/requisiciones/view/${requisicionId}`,
      dedupe_key: `requisicion:${requisicionId}:pending_coordinador:${Date.now()}`,
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
    console.error(`[legacyInsertInboxRow] ${row.event_key}:`, insertError);
  }
}

/** Copia al coordinador del depto (organigrama), si no es el mismo destinatario. */
export async function legacyNotifyDeptCoordinadorCopy(
  supabase: SupabaseClient,
  args: {
    event_key: string;
    departamento_nombre: string;
    exclude_auth_id?: string | null;
    title: string;
    body: string;
    link_path: string;
    dedupe_key: string;
    priority: number;
  },
) {
  const authId = await resolveCoordinadorAuthId(
    supabase,
    args.departamento_nombre,
  );
  if (!authId || authId === args.exclude_auth_id) return;
  await legacyInsertInboxRow(supabase, {
    event_key: args.event_key,
    recipient_id_auth: authId,
    title: args.title,
    body: args.body,
    link_path: args.link_path,
    dedupe_key: args.dedupe_key,
    priority: args.priority,
  });
}
