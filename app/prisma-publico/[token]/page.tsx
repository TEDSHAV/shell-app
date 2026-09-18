import { load_public_plan_workspace } from "@/features/planificacion/actions/list-plan";
import { PlanificacionWorkspace } from "@/features/planificacion/components/planificacion-workspace";

export const dynamic = "force-dynamic";

export default async function PrismaPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const loaded = await load_public_plan_workspace(token);

  return (
    <div className="min-h-full bg-[#f4f5f7] px-6 pb-10 pt-8">
      {loaded.ok ? (
        <PlanificacionWorkspace
          apps={loaded.data.apps}
          usuarios={loaded.data.usuarios}
          read_only
          snapshot_at={loaded.captured_at}
        />
      ) : (
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Prisma</h1>
          <p className="mt-2 text-sm text-slate-500">{loaded.error}</p>
        </div>
      )}
    </div>
  );
}
