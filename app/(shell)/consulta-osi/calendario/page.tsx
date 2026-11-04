import { redirect } from "next/navigation";

import { canAccessConsultaOSI, getUserOSIAccessFilter } from "@/actions/osi";
import { getCalendarioMes } from "@/features/osi-calendario/actions/calendario-actions";
import CalendarioServicios from "@/features/osi-calendario/components/CalendarioServicios";

export const metadata = {
  title: "Calendario de servicios | PRISMA",
};

export default async function CalendarioServiciosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const mes = typeof params.mes === "string" ? params.mes : null;

  const [canAccess, access, result] = await Promise.all([
    canAccessConsultaOSI(),
    getUserOSIAccessFilter(),
    getCalendarioMes(mes),
  ]);

  if (!canAccess) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Calendario de servicios</h1>
        <p className="text-sm text-slate-500">
          Cada sesión de una OSI en su fecha planificada; cuando se reagenda o se ejecuta, se mueve a esa fecha sin cambiar la planificada.
        </p>
      </div>
      {result.ok ? (
        <CalendarioServicios data={result.data} mostrarTipo={access === "all" || access === "other"} />
      ) : (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{result.error}</p>
      )}
    </div>
  );
}
