import { redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import { load_plan_workspace } from "@/features/planificacion/actions/list-plan";
import { ExcelImportWizard } from "@/features/planificacion/components/excel-import-wizard";

export const dynamic = "force-dynamic";

export default async function TedPlanImportPage() {
  const allowed = await isTedMember();
  if (!allowed) redirect("/dashboard");

  const loaded = await load_plan_workspace();
  if (!loaded.ok) {
    return (
      <div className="p-6 text-sm text-red-600">{loaded.error}</div>
    );
  }

  return (
    <div className="min-h-full w-full bg-[#f4f6f8] p-6">
      <ExcelImportWizard apps={loaded.data.apps} />
    </div>
  );
}
