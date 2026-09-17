import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="min-h-full w-full bg-[#f4f6f8] p-6">
      <div className="mb-4">
        <Link
          href="/ted"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a TED
        </Link>
      </div>
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
