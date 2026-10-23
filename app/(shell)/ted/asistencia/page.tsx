import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCheck } from "lucide-react";
import { isTedMember } from "@/actions/ted";
import { getAsistenciaDashboardData } from "@/actions/asistencia";
import { AsistenciaTedClient } from "./AsistenciaTedClient";

export const dynamic = "force-dynamic";

export default async function TedAsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const allowed = await isTedMember();
  if (!allowed) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const data = await getAsistenciaDashboardData(params.fecha);

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <div className="mb-8 space-y-3">
        <Link
          href="/ted"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a TED
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Control de Asistencia Diaria
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Verificación matutina de usuarios conectados por departamento y envío automático de reporte a las 8:30 AM.
            </p>
          </div>
        </div>
      </div>

      <AsistenciaTedClient
        snapshot={data.snapshot}
        config={data.config}
        destinatarios={data.destinatarios}
        logs={data.logs}
        allUsers={data.allUsers}
        allDepartments={data.allDepartments}
      />
    </div>
  );
}
