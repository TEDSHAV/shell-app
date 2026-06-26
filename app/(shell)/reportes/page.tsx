import { redirect } from "next/navigation";
import { isSgestionAdmin } from "@/actions/apps";

export default async function ReportesPage() {
  if (await isSgestionAdmin()) {
    redirect("/reportes/presupuestos");
  }

  return null;
}
