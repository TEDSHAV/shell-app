import { redirect } from "next/navigation";

import { listNotificationEvents } from "@/actions/notification-admin";
import { canManageNotificationAdmin } from "@/actions/notification-admin-access";
import { NotificationEventsList } from "@/components/admin/notifications/notification-events-list";

export const dynamic = "force-dynamic";

export default async function TedNotificationCatalogPage() {
  const allowed = await canManageNotificationAdmin();
  if (!allowed) {
    redirect("/dashboard");
  }

  const events = await listNotificationEvents();

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <NotificationEventsList events={events} />
    </div>
  );
}
