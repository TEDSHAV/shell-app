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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-3 sm:p-6">
      <h1 className="px-1 text-sm font-medium text-slate-500">Calendario de servicios</h1>
      {result.ok ? (
        <CalendarioServicios data={result.data} mostrarTipo={access === "all" || access === "other"} />
      ) : (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{result.error}</p>
      )}
    </div>
  );
}
