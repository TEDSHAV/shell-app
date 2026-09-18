import { redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import { PlanificacionManual } from "@/features/planificacion/components/planificacion-manual";

export const dynamic = "force-dynamic";

export default async function PlanificacionManualPage() {
  const allowed = await isTedMember();
  if (!allowed) redirect("/dashboard");
  return <PlanificacionManual />;
}
