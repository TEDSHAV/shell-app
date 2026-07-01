import { redirect } from "next/navigation";
import ConsultaOSIClient from "./ConsultaOSIClient";
import { canAccessConsultaOSI } from "@/actions/osi";

export const metadata = {
  title: "Consulta de OSIs | PRISMA",
};

export default async function ConsultaOSIPage() {
  const canAccess = await canAccessConsultaOSI();
  if (!canAccess) {
    redirect("/dashboard");
  }

  return <ConsultaOSIClient />;
}
