import { redirect } from "next/navigation";

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
import { NotificationUsersList } from "@/components/admin/notifications/notification-users-list";
import { build_user_subscription_summaries } from "@/lib/notification-catalog-groups";

export const dynamic = "force-dynamic";

export default async function TedNotificationUsersPage() {
  const allowed = await canManageNotificationAdmin();
  if (!allowed) {
    redirect("/dashboard");
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

  const departamento_names = new Map(
    departments.map((dept) => [dept.id, dept.nombre]),
  );

  const subscription_summaries = build_user_subscription_summaries({
    usuarios,
    events,
    configs,
    app_roles,
    role_members,
    permission_members,
    departamento_names,
    inbox_by_auth_id,
    active_events_only: true,
  });

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <NotificationUsersList
        usuarios={usuarios}
        departamento_names={departamento_names}
        subscription_summaries={subscription_summaries}
      />
    </div>
  );
}
