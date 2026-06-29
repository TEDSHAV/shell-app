import { redirect } from "next/navigation";
import { getReportesHomePath } from "@/actions/apps";

export default async function ReportesPage() {
  const homePath = await getReportesHomePath();
  if (homePath) {
    redirect(homePath);
  }

  return null;
}
