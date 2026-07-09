import { redirect } from "next/navigation";
import ConsultaOSIClient from "./ConsultaOSIClient";
import { canAccessConsultaOSI, canChangeOSIStatus } from "@/actions/osi";

export const metadata = {
  title: "Consulta de OSIs | PRISMA",
};

export default async function ConsultaOSIPage() {
  const [canAccess, canChangeStatus] = await Promise.all([
    canAccessConsultaOSI(),
    canChangeOSIStatus(),
  ]);

  if (!canAccess) {
    redirect("/dashboard");
  }

  return <ConsultaOSIClient canChangeStatus={canChangeStatus} />;
}
