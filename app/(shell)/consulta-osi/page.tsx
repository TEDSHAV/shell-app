import { redirect } from "next/navigation";
import ConsultaOSIClient from "./ConsultaOSIClient";
import {
  canAccessConsultaOSI,
  canChangeOSIStatus,
  canHideOSIFromClient,
  canToggleOSIAttachment,
  getOSIList,
  getOSIListFilterOptions,
} from "@/actions/osi";
import { canAccessSatisfaccionClientes } from "@/actions/satisfaccion-clientes";
import { getPermisosSesionOSI } from "@/features/osi-calendario/actions/calendario-actions";
import { hoy_caracas } from "@/features/osi-calendario/lib/mes-grid";

export const metadata = {
  title: "Consulta de OSIs | PRISMA",
};

export default async function ConsultaOSIPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialNroOsi = typeof params.nro_osi === "string" ? params.nro_osi : undefined;
  const initialFilters = initialNroOsi ? { nroOsi: initialNroOsi } : {};

  const [
    canAccess,
    canChangeStatus,
    canHideForClient,
    canToggleAttachment,
    canAccessSatisfaccion,
    permisosSesion,
    initialData,
    filterOptions,
  ] = await Promise.all([
    canAccessConsultaOSI(),
    canChangeOSIStatus(),
    canHideOSIFromClient(),
    canToggleOSIAttachment(),
    canAccessSatisfaccionClientes(),
    getPermisosSesionOSI(),
    getOSIList(initialFilters, 1, 20),
    getOSIListFilterOptions(),
  ]);

  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <ConsultaOSIClient
      canChangeStatus={canChangeStatus}
      canHideForClient={canHideForClient}
      canToggleAttachment={canToggleAttachment}
      canAccessSatisfaccion={canAccessSatisfaccion}
      isDev={process.env.NODE_ENV !== "production"}
      initialNroOsi={initialNroOsi}
      initialOsis={initialData.osis}
      initialTotalCount={initialData.totalCount}
      initialFilterOptions={filterOptions}
      permisosSesion={permisosSesion}
      hoy={hoy_caracas()}
    />
  );
}
