import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isTedMember } from "@/actions/ted";
import { load_plan_mail_config } from "@/features/planificacion/actions/plan-mail-config-actions";
import { ObjetivosMailConfig } from "@/features/planificacion/components/objetivos-mail-config";

export const dynamic = "force-dynamic";

export default async function ObjetivosConfiguracionPage() {
  const ted = await isTedMember();
  if (!ted) redirect("/ted/planificacion/objetivos");
  const loaded = await load_plan_mail_config();

  return (
    <div className="mx-auto max-w-5xl px-6 pb-10 pt-2">
      <Link
        href="/ted/planificacion/objetivos"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a objetivos
      </Link>
      <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-slate-900">
        Correos del plan
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Aquí se editan los dos destinos: <strong>solicitantes (gerencia)</strong> y{" "}
        <strong>ejecutantes (TED)</strong>. Cada lista recibe su propia plantilla al
        emitir o cambiar el plan. Si una lista queda vacía, esa copia no se envía.
      </p>
      <div className="mt-6">
        {loaded.ok ? (
          <ObjetivosMailConfig rows={loaded.rows} />
        ) : (
          <p className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600">
            {loaded.error}
          </p>
        )}
      </div>
    </div>
  );
}
