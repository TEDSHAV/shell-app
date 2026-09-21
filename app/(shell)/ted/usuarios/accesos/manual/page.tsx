import { redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import { load_acceso_catalog } from "@/features/accesos/actions/list-accesos";
import { AccesosManual } from "@/features/accesos/components/accesos-manual";

export const dynamic = "force-dynamic";

export default async function AccesosManualPage() {
  const allowed = await isTedMember();
  if (!allowed) redirect("/dashboard");
  const catalog = await load_acceso_catalog();
  return <AccesosManual catalog={catalog} />;
}
