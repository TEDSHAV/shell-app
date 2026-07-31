import { redirect } from "next/navigation";
import ConsultaOSIClient from "./ConsultaOSIClient";
import { canAccessConsultaOSI, canChangeOSIStatus, canHideOSIFromClient } from "@/actions/osi";

export const metadata = {
  title: "Consulta de OSIs | PRISMA",
};

export default async function ConsultaOSIPage() {
  const [canAccess, canChangeStatus, canHideForClient] = await Promise.all([
    canAccessConsultaOSI(),
    canChangeOSIStatus(),
    canHideOSIFromClient(),
  ]);

  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <ConsultaOSIClient
      canChangeStatus={canChangeStatus}
      canHideForClient={canHideForClient}
    />
  );
}
