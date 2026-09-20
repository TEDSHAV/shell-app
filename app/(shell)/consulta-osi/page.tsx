import { redirect } from "next/navigation";
import ConsultaOSIClient from "./ConsultaOSIClient";
import {
  canAccessConsultaOSI,
  canChangeStatus,
  canHideForClient,
  canToggleOSIAttachment,
  getOSIList,
  getOSIListFilterOptions,
} from "@/actions/osi";

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
    initialData,
    filterOptions,
  ] = await Promise.all([
    canAccessConsultaOSI(),
    canChangeStatus(),
    canHideForClient(),
    canToggleAttachment(),
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
      isDev={process.env.NODE_ENV !== "production"}
      initialNroOsi={initialNroOsi}
      initialOsis={initialData.osis}
      initialTotalCount={initialData.totalCount}
      initialFilterOptions={filterOptions}
    />
  );
}
