import { redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import { load_plan_workspace } from "@/features/planificacion/actions/list-plan";
import { PlanificacionWorkspace } from "@/features/planificacion/components/planificacion-workspace";

export const dynamic = "force-dynamic";

export default async function TedPlanificacionPage() {
  const allowed = await isTedMember();
  if (!allowed) {
    redirect("/dashboard");
  }

  const loaded = await load_plan_workspace();

  return (
    <div className="px-6 pb-6 pt-4">
      {loaded.ok ? (
        <PlanificacionWorkspace
          apps={loaded.data.apps}
          usuarios={loaded.data.usuarios}
        />
      ) : (
        <p className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600">
          {loaded.error}
        </p>
      )}
    </div>
  );
}
