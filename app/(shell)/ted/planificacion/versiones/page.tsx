import { redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import { VersionesPage } from "@/features/planificacion/components/versiones-page";

export const dynamic = "force-dynamic";

export default async function TedPlanVersionesPage() {
  if (!(await isTedMember())) redirect("/dashboard");
  return <VersionesPage />;
}
