import { get_manual_app_roles } from "@/actions/manual-roles";
import { ManualHubClient } from "@/components/manual/ManualHubClient";

export const dynamic = "force-dynamic";

export default async function ManualPage() {
  const apps = await get_manual_app_roles();
  return <ManualHubClient apps={apps} />;
}
