import { redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import { TicketsManual } from "@/features/planificacion/components/tickets-manual";

export const dynamic = "force-dynamic";

export default async function TicketsManualPage() {
  const allowed = await isTedMember();
  if (!allowed) redirect("/dashboard");
  return <TicketsManual />;
}
