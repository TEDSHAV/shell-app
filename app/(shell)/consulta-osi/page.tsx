import { redirect } from "next/navigation";
import ConsultaOSIClient from "./ConsultaOSIClient";
import { canAccessConsultaOSI, canChangeOSIStatus, canHideOSIFromClient, canToggleOSIAttachment } from "@/actions/osi";

export const metadata = {
  title: "Consulta de OSIs | PRISMA",
};

export default async function ConsultaOSIPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [canAccess, canChangeStatus, canHideForClient, canToggleAttachment] = await Promise.all([
    canAccessConsultaOSI(),
    canChangeOSIStatus(),
    canHideOSIFromClient(),
    canToggleOSIAttachment(),
  ]);

  if (!canAccess) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <ConsultaOSIClient
      canChangeStatus={canChangeStatus}
      canHideForClient={canHideForClient}
      canToggleAttachment={canToggleAttachment}
      isDev={process.env.NODE_ENV !== "production"}
      initialNroOsi={typeof params.nro_osi === "string" ? params.nro_osi : undefined}
    />
  );
}
