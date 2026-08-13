import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ appSlug: string; eventKey: string }>;
};

export default async function LegacyNotificationEventRedirect({
  params,
}: PageProps) {
  const { appSlug, eventKey } = await params;
  redirect(
    `/ted/notificaciones/${encodeURIComponent(appSlug)}/${encodeURIComponent(eventKey)}`,
  );
}
