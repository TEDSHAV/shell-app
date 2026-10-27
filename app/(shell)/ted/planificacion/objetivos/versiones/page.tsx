import { redirect } from "next/navigation";
import { canReadObjetivosArea } from "@/actions/ted";
import { VersionesPage } from "@/features/planificacion/components/versiones-page";

export const dynamic = "force-dynamic";

export default async function TedObjetivosVersionesPage() {
  if (!(await canReadObjetivosArea())) redirect("/dashboard");
  return <VersionesPage />;
}
