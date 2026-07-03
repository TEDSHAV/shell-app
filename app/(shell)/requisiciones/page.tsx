import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAllRequisiciones, isRequisicionesAdmin, getAllOSIsForRequisiciones } from "@/actions/requisiciones";
import RequisicionesTable from "./components/RequisicionesTable";
import { FilePlus2 } from "lucide-react";

export const metadata = {
  title: "Requisiciones | PRISMA",
};

export default async function RequisicionesPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <h2 className="text-xl font-bold text-gray-700">Módulo en desarrollo</h2>
        <p className="text-sm text-gray-500 max-w-md">
          El módulo de Requisiciones está en fase de desarrollo y no está disponible en producción.
        </p>
      </div>
    );
  }

  const [records, isAdminView, allOsis] = await Promise.all([
    getAllRequisiciones(),
    isRequisicionesAdmin(),
    getAllOSIsForRequisiciones(),
  ]);

  const osiLookup = new Map<number, string>();
  (allOsis || []).forEach((osi: any) => {
    if (osi.id_osi && osi.nro_osi) {
      osiLookup.set(osi.id_osi, osi.nro_osi);
    }
  });

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

      <RequisicionesTable records={records || []} isAdminView={isAdminView} osiLookup={osiLookup} />
    </div>
  );
}
