import { redirect } from "next/navigation";
import { getUmbralLiderUsd, updateUmbralLiderUsd } from "@/actions/requisiciones";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import { RequisicionesConfigForm } from "./config-form";

export const metadata = {
  title: "Umbral de requisiciones | PRISMA",
};

export default async function RequisicionesConfigPage() {
  const access = await getRequisicionAccess();
  if (!access.can_edit_config) {
    redirect("/requisiciones");
  }
  const umbral = await getUmbralLiderUsd();

  return (
    <div className="p-4 sm:p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Configuración de requisiciones</h1>
      <p className="mt-1 text-sm text-gray-600">
        Si el total estimado de una interna supera este umbral (USD), pasa por el líder antes del
        proceso final de Administración.
      </p>
      <RequisicionesConfigForm initialUmbral={umbral} saveAction={updateUmbralLiderUsd} />
    </div>
  );
}
