import { redirect } from "next/navigation";
import { canWriteObjetivos } from "@/actions/ted";
import { load_objetivo_form } from "@/features/planificacion/actions/objetivo-actions";
import { ObjetivoForm } from "@/features/planificacion/components/objetivo-form";
import { parse_plan_month } from "@/features/planificacion/lib/plan-month";

export const dynamic = "force-dynamic";

export default async function NuevoObjetivoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const allowed = await canWriteObjetivos();
  if (!allowed) redirect("/ted/planificacion/objetivos");

  const params = await searchParams;
  const mes = parse_plan_month(params.mes);
  const loaded = await load_objetivo_form(null);
  if (!loaded.ok) {
    return (
      <p className="mx-auto max-w-4xl px-6 py-8 text-sm text-red-600">
        {loaded.error}
      </p>
    );
  }

  return <ObjetivoForm mes={mes} apps={loaded.apps} usuarios={loaded.usuarios} objetivo={null} />;
}
