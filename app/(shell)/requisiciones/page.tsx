import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getOwnRequisiciones,
  getAllRequisiciones,
  isRequisicionesAdmin,
  isCurrentUserCapacitacion,
  getOsiNumbersForLookup,
  getCoordinatedDepartments,
  getDepartmentsInLedGerencias,
} from "@/actions/requisiciones";
import RequisicionesTable from "./components/RequisicionesTable";
import { FilePlus2 } from "lucide-react";
import {
  isPendingForCurrentApprover,
  type ApproverRecordFlags,
} from "@/lib/requisiciones-gerencia";

export const metadata = {
  title: "Mis Requisiciones | PRISMA",
};

export default async function RequisicionesPage() {
  const isAdminView = await isRequisicionesAdmin();
  const isCapacitacionView = !isAdminView && (await isCurrentUserCapacitacion());
  const coordinadorDepts = isAdminView ? [] : await getCoordinatedDepartments();
  const isCoordinador = coordinadorDepts.length > 0;
  const liderDepts = isAdminView ? [] : await getDepartmentsInLedGerencias();
  const isLider = liderDepts.length > 0;

  const [records, osiPairs] = await Promise.all([
    isAdminView ? getOwnRequisiciones() : getAllRequisiciones(false),
    getOsiNumbersForLookup(),
  ]);

  const osiLookup = new Map<number, string>();
  (osiPairs || []).forEach(({ id_osi, nro_osi }) => {
    if (id_osi && nro_osi) {
      osiLookup.set(id_osi, nro_osi);
    }
  });

  const pendingApprovalCount = (records || []).filter((r) =>
    isPendingForCurrentApprover(
      r as unknown as ApproverRecordFlags,
      liderDepts,
      coordinadorDepts,
    ),
  ).length;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Mis Requisiciones
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isAdminView
              ? "Listado de las solicitudes de requisición que has creado."
              : (isLider || isCoordinador) && pendingApprovalCount > 0
                ? `Tienes ${pendingApprovalCount} ${
                    pendingApprovalCount === 1
                      ? "requisición pendiente"
                      : "requisiciones pendientes"
                  } por aprobar.`
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

      {isAdminView && (
        <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
          <Link
            href="/requisiciones"
            className="px-4 py-2.5 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 -mb-px"
          >
            Mis Requisiciones
          </Link>
          <Link
            href="/requisiciones/gestion"
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent -mb-px transition-colors"
          >
            Gestión de Requisiciones
          </Link>
        </div>
      )}

      <RequisicionesTable
        records={records || []}
        isAdminView={false}
        listMode="own"
        osiLookup={osiLookup}
        isCoordinador={isCoordinador}
        coordinadorDepts={coordinadorDepts}
        isLider={isLider}
        liderDepts={liderDepts}
      />
    </div>
  );
}
