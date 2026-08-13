import { redirect, notFound } from "next/navigation";

import {
  listAllNotificationRecipientConfigs,
  listNotificationAppRoleMembers,
  listNotificationAppRoles,
  listNotificationEvents,
  listNotificationInboxSummaries,
  listNotificationPermissionMembers,
  listNotificationUsers,
} from "@/actions/notification-admin";
import { canManageNotificationAdmin } from "@/actions/notification-admin-access";
import { getAllDepartments } from "@/actions/directory";
import { NotificationUserSubscriptions } from "@/components/admin/notifications/notification-user-subscriptions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function TedNotificationUserDetailPage({
  params,
}: PageProps) {
  const allowed = await canManageNotificationAdmin();
  if (!allowed) {
    redirect("/dashboard");
  }

  const { userId } = await params;
  const usuario_id = Number(userId);
  if (!Number.isFinite(usuario_id) || usuario_id <= 0) {
    notFound();
  }

  const [
    usuarios,
    departments,
    events,
    configs,
    app_roles,
    role_members,
    permission_members,
    inbox_by_auth_id,
  ] = await Promise.all([
    listNotificationUsers(),
    getAllDepartments(),
    listNotificationEvents(),
    listAllNotificationRecipientConfigs(),
    listNotificationAppRoles(),
    listNotificationAppRoleMembers(),
    listNotificationPermissionMembers(),
    listNotificationInboxSummaries(),
  ]);

  const user = usuarios.find((u) => u.id === usuario_id);
  if (!user) {
    notFound();
  }

  const departamento_nombre =
    user.departamento_id != null
      ? (departments.find((d) => d.id === user.departamento_id)?.nombre ?? null)
      : null;

  const departamento_names = new Map(
    departments.map((dept) => [dept.id, dept.nombre]),
  );

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <NotificationUserSubscriptions
        user={user}
        departamento_nombre={departamento_nombre}
        departamento_names={departamento_names}
        events={events}
        configs={configs}
        app_roles={app_roles}
        role_members={role_members}
        permission_members={permission_members}
        inbox_by_auth_id={inbox_by_auth_id}
      />
    </div>
  );
}
