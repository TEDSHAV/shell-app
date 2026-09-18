import { redirect } from "next/navigation";
import { canReadObjetivosArea } from "@/actions/ted";
import { load_informe_month } from "@/features/planificacion/actions/informe-actions";
import { InformeWorkspace } from "@/features/planificacion/components/informe-workspace";
import { parse_plan_month } from "@/features/planificacion/lib/plan-month";

export const dynamic = "force-dynamic";

export default async function TedInformePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const allowed = await canReadObjetivosArea();
  if (!allowed) redirect("/dashboard");

  const params = await searchParams;
  const mes = parse_plan_month(params.mes);
  const loaded = await load_informe_month(mes);

  return (
    <div className="px-6 pb-6 pt-2">
      {loaded.ok ? (
        <InformeWorkspace data={loaded.data} />
      ) : (
        <p className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600">
          {loaded.error}
        </p>
      )}
    </div>
  );
}
