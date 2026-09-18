import { redirect } from "next/navigation";
import { canReadObjetivosArea, canWriteObjetivos } from "@/actions/ted";
import { load_objetivos_month } from "@/features/planificacion/actions/objetivo-actions";
import { ObjetivosWorkspace } from "@/features/planificacion/components/objetivos-workspace";
import { parse_plan_month } from "@/features/planificacion/lib/plan-month";

export const dynamic = "force-dynamic";

export default async function TedObjetivosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const allowed = await canReadObjetivosArea();
  if (!allowed) redirect("/dashboard");
  const can_write = await canWriteObjetivos();

  const params = await searchParams;
  const mes = parse_plan_month(params.mes);
  const loaded = await load_objetivos_month(mes);

  return (
    <div className="px-6 pb-6 pt-2">
      {loaded.ok ? (
        <ObjetivosWorkspace
          mes={loaded.mes}
          objetivos={loaded.objetivos}
          apps={loaded.apps}
          can_write={can_write}
        />
      ) : (
        <p className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600">
          {loaded.error}
        </p>
      )}
    </div>
  );
}
