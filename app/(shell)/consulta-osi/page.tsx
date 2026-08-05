import { redirect } from "next/navigation";
import ConsultaOSIClient from "./ConsultaOSIClient";
import { canAccessConsultaOSI, canChangeOSIStatus, canHideOSIFromClient, canToggleOSIAttachment } from "@/actions/osi";

export const metadata = {
  title: "Consulta de OSIs | PRISMA",
};

export default async function ConsultaOSIPage() {
  const [canAccess, canChangeStatus, canHideForClient, canToggleAttachment] = await Promise.all([
    canAccessConsultaOSI(),
    canChangeOSIStatus(),
    canHideOSIFromClient(),
    canToggleOSIAttachment(),
  ]);

  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <ConsultaOSIClient
      canChangeStatus={canChangeStatus}
      canHideForClient={canHideForClient}
      canToggleAttachment={canToggleAttachment}
    />
  );
}
