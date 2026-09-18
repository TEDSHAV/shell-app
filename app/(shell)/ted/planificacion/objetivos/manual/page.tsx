import { redirect } from "next/navigation";
import { canReadObjetivosArea } from "@/actions/ted";
import { ObjetivosManual } from "@/features/planificacion/components/objetivos-manual";

export const dynamic = "force-dynamic";

export default async function ObjetivosManualPage() {
  const allowed = await canReadObjetivosArea();
  if (!allowed) redirect("/dashboard");
  return <ObjetivosManual />;
}
