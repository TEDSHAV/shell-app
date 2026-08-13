import { redirect, notFound } from "next/navigation";

import {
  getNotificationEventDetail,
  listNotificationAppRoleMembers,
  listNotificationAppRoles,
  listNotificationPermissionMembers,
  listNotificationPermissions,
  listNotificationUsers,
} from "@/actions/notification-admin";
import { canManageNotificationAdmin } from "@/actions/notification-admin-access";
import { getAllDepartments } from "@/actions/directory";
import { NotificationEventWorkspace } from "@/components/admin/notifications/notification-event-workspace";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ appSlug: string; eventKey: string }>;
};

export default async function TedNotificationEventDetailPage({
  params,
}: PageProps) {
  const allowed = await canManageNotificationAdmin();
  if (!allowed) {
    redirect("/dashboard");
  }

  const { appSlug, eventKey } = await params;
  const decoded_app = decodeURIComponent(appSlug);
  const decoded_event = decodeURIComponent(eventKey);

  const [
    detail,
    usuarios,
    departments,
    app_roles,
    role_members,
    permission_members,
    permissions,
  ] = await Promise.all([
    getNotificationEventDetail(decoded_app, decoded_event),
    listNotificationUsers(),
    getAllDepartments(),
    listNotificationAppRoles(),
    listNotificationAppRoleMembers(),
    listNotificationPermissionMembers(),
    listNotificationPermissions(),
  ]);

  if (!detail.event) {
    notFound();
  }

  const departamento_names = new Map(
    departments.map((dept) => [dept.id, dept.nombre]),
  );

  let app_roles_error: string | null = null;
  if (app_roles.length === 0) {
    app_roles_error =
      "No se pudo cargar el catálogo de roles. Revisa v_osi_app_roles_catalog.";
  }

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <NotificationEventWorkspace
        event={detail.event}
        config={detail.config}
        usuarios={usuarios}
        departamento_names={departamento_names}
        app_roles={app_roles}
        role_members={role_members}
        permission_members={permission_members}
        permissions={permissions}
        app_roles_error={app_roles_error}
      />
    </div>
  );
}
