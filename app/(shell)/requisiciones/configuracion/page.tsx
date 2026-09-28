import { redirect } from "next/navigation";
import { getLimiteLiderUsd, updateLimiteLiderUsd } from "@/actions/requisiciones";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import { RequisicionesConfigForm } from "./config-form";

export const metadata = {
  title: "Límite de requisiciones | PRISMA",
};

export default async function RequisicionesConfigPage() {
  const access = await getRequisicionAccess();
  if (!access.can_edit_config) {
    redirect("/requisiciones");
  }
  const limite = await getLimiteLiderUsd();

  return (
    <div className="p-4 sm:p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Configuración de requisiciones</h1>
      <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Modo provisional: el umbral de $100 está desactivado. Las internas vuelven a
        coordinador → líder → Administración, sin montos ni filtro de límite.
      </p>
      <p className="mt-3 text-sm text-gray-500">
        El valor siguiente queda guardado para cuando se reactive el flujo por estimación; no se usa en el trámite actual.
      </p>
      <RequisicionesConfigForm initialLimite={limite} saveAction={updateLimiteLiderUsd} />
    </div>
  );
}
