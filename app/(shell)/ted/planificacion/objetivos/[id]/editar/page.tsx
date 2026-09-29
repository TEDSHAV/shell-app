import { redirect } from "next/navigation";
import { canWriteObjetivos } from "@/actions/ted";
import { load_objetivo_form } from "@/features/planificacion/actions/objetivo-actions";
import { ObjetivoForm } from "@/features/planificacion/components/objetivo-form";
import { parse_plan_month } from "@/features/planificacion/lib/plan-month";

export const dynamic = "force-dynamic";

export default async function EditarObjetivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const allowed = await canWriteObjetivos();
  if (!allowed) redirect("/ted/planificacion/objetivos");

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    redirect("/ted/planificacion/objetivos");
  }

  const loaded = await load_objetivo_form(id);
  if (!loaded.ok) {
    return (
      <p className="mx-auto max-w-4xl px-6 py-8 text-sm text-red-600">
        {loaded.error}
      </p>
    );
  }
  if (!loaded.objetivo) redirect("/ted/planificacion/objetivos");

  const mes = parse_plan_month(loaded.objetivo.fecha_inicio.slice(0, 7));
  return (
    <ObjetivoForm
      mes={mes}
      apps={loaded.apps}
      usuarios={loaded.usuarios}
      objetivo={loaded.objetivo}
    />
  );
}
