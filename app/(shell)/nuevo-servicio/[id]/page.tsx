import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  getDisenoServicioById,
  getCurrentUserForDiseno,
} from "@/actions/diseno-servicio";
import {
  isCapacitacionDept,
  isServiciosTecnicosDept,
  isNegociosDept,
} from "@/lib/requisiciones-gerencia";
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

  const userDeptName = userData.departamento_nombre ?? null;
  const isCapUser = isCapacitacionDept(userDeptName);
  const isStUser = isServiciosTecnicosDept(userDeptName);
  const isNegUser = isNegociosDept(userDeptName);
  const isAdmin = (userData as any)?.rol === "admin" || (userData as any)?.rol === "superadmin" || (userData as any)?.id_departamento === 6; // TED

  // Determine executing department of this solicitud
  const isCapService =
    solicitud.id_departamento_ejecutante === 3 ||
    (solicitud.bloque_recursos_requisitos as any)?.tipo_naturaleza_servicio === "cap";

  // Check if current user can edit:
  // - Admin or TED: can edit any
  // - Capacitacion user: can edit cap services
  // - Servicios Tecnicos user: can edit ST services
  // - Negocios or other solicitantes: read-only access (can review progress and add notes)
  const canEdit =
    isAdmin ||
    (isCapUser && isCapService) ||
    (isStUser && !isCapService);

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
      />
    </div>
  );
}
