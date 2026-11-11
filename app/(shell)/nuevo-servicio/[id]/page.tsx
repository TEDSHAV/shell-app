import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  getDisenoServicioById,
  getCurrentUserForDiseno,
} from "@/actions/diseno-servicio";
import {
  canUserEditDiseno,
  canUserEditFinishedDiseno,
} from "@/lib/diseno-servicio-auth";
import DisenoServicioWizard from "./components/DisenoServicioWizard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const solicitud = await getDisenoServicioById(parseInt(id));
  return {
    title: solicitud
      ? `${solicitud.nombre_sugerido} | Nuevos Servicios | PRISMA`
      : "Nuevos Servicios | PRISMA",
  };
}

export default async function DisenoServicioWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [solicitud, userData] = await Promise.all([
    getDisenoServicioById(parseInt(id)),
    getCurrentUserForDiseno(),
  ]);

  if (!solicitud) {
    notFound();
  }

  if (!userData) {
    redirect("/auth/login");
  }

  // canUserEditDiseno enforces:
  // - If completed: strictly coordinator or leader of the executing department, or TED / Admin
  // - If in progress: executing department staff, coordinator, leader, or TED / Admin
  const canEdit = canUserEditDiseno(userData, solicitud);
  const canEditFinished = canUserEditFinishedDiseno(userData, solicitud);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center gap-4 max-w-5xl mx-auto">
        <Link href="/nuevo-servicio">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {solicitud.nombre_sugerido}
          </h1>
          <p className="text-sm text-gray-600">
            Nuevos Servicios · {solicitud.tipo_servicio} · {solicitud.estatus_nombre || "Pendiente"}
          </p>
        </div>
      </div>

      <DisenoServicioWizard
        solicitud={solicitud}
        userData={userData}
        initialReadOnly={!canEdit}
        canEditFinished={canEditFinished}
      />
    </div>
  );
}
