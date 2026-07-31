import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAllRequisiciones, isRequisicionesAdmin, isCurrentUserCapacitacion, getOsiNumbersForLookup, isRequisicionesCoordinador, getCurrentUserDepartment } from "@/actions/requisiciones";
import RequisicionesTable from "./components/RequisicionesTable";
import { FilePlus2 } from "lucide-react";

export const metadata = {
  title: "Requisiciones | PRISMA",
};

export default async function RequisicionesPage() {
  const isAdminView = await isRequisicionesAdmin();
  const isCapacitacionView = !isAdminView && await isCurrentUserCapacitacion();
  const isCoordinador = !isAdminView && await isRequisicionesCoordinador();
  const coordinadorDept = isCoordinador ? await getCurrentUserDepartment() : null;
  const [records, osiPairs] = await Promise.all([
    getAllRequisiciones(isAdminView),
    getOsiNumbersForLookup(),
  ]);

  const osiLookup = new Map<number, string>();
  (osiPairs || []).forEach(({ id_osi, nro_osi }) => {
    if (id_osi && nro_osi) {
      osiLookup.set(id_osi, nro_osi);
    }
  });

  const pendingCoordinadorCount = (records || []).filter(
    (r: any) => r.tipo_solicitud === "Interno" && r.coordinador_estatus === "pendiente"
  ).length;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdminView ? "Gestión de Requisiciones" : "Mis Requisiciones"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isAdminView
              ? "Listado de todas las requisiciones recibidas por Administración."
              : isCoordinador && pendingCoordinadorCount > 0
                ? `Tienes ${pendingCoordinadorCount} requisición${pendingCoordinadorCount !== 1 ? "es" : ""} interna${pendingCoordinadorCount !== 1 ? "s" : ""} pendiente${pendingCoordinadorCount !== 1 ? "s" : ""} por aprobar.`
                : isCapacitacionView
                  ? "Listado de las requisiciones creadas por el departamento de Capacitación."
                  : "Listado de todas las solicitudes de requisición que has creado."}
          </p>
        </div>
        <Link href="/requisiciones/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2">
            <FilePlus2 className="h-4 w-4" />
            Nueva Requisición
          </Button>
        </Link>
      </div>

      <RequisicionesTable
        records={records || []}
        isAdminView={isAdminView}
        osiLookup={osiLookup}
        isCoordinador={isCoordinador}
        coordinadorDept={coordinadorDept}
      />
    </div>
  );
}
