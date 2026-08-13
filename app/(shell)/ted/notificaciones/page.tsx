import { redirect } from "next/navigation";

import {
  getAdminOsiRecipientsMode,
  listNotificationEvents,
} from "@/actions/notification-admin";
import { canManageNotificationAdmin } from "@/actions/notification-admin-access";
import { AdminOsiRecipientsModeSwitch } from "@/components/admin/notifications/admin-osi-recipients-mode-switch";
import { NotificationEventsList } from "@/components/admin/notifications/notification-events-list";

export const dynamic = "force-dynamic";

export default async function TedNotificationCatalogPage() {
  const allowed = await canManageNotificationAdmin();
  if (!allowed) {
    redirect("/dashboard");
  }

  const [events, admin_osi_mode] = await Promise.all([
    listNotificationEvents(),
    getAdminOsiRecipientsMode(),
  ]);

  return (
    <div className="p-8 w-full max-w-7xl mx-auto space-y-5">
      <AdminOsiRecipientsModeSwitch initial_mode={admin_osi_mode} />
      <NotificationEventsList events={events} />
    </div>
  );
}
