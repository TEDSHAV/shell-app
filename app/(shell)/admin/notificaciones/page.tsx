import { redirect } from "next/navigation";

export default function LegacyNotificationAdminRedirect() {
  redirect("/ted/notificaciones");
}
