import { redirect } from "next/navigation";
import {
  getGestionRequisiciones,
  isRequisicionesAdmin,
  getOsiNumbersForLookup,
} from "@/actions/requisiciones";
import RequisicionesTable from "../components/RequisicionesTable";

export const metadata = {
  title: "Gestión de Requisiciones | PRISMA",
};

export default async function GestionRequisicionesPage() {
  const isAdminView = await isRequisicionesAdmin();
  if (!isAdminView) {
    redirect("/requisiciones");
  }

  const [records, osiPairs] = await Promise.all([
    getGestionRequisiciones(),
    getOsiNumbersForLookup(),
  ]);

  const osiLookup = new Map<number, string>();
  (osiPairs || []).forEach(({ id_osi, nro_osi }) => {
    if (id_osi && nro_osi) {
      osiLookup.set(id_osi, nro_osi);
    }
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestión de Requisiciones
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Listado de todas las requisiciones recibidas por Administración.
        </p>
      </div>

      <RequisicionesTable
        records={records || []}
        isAdminView
        listMode="gestion"
        osiLookup={osiLookup}
      />
    </div>
  );
}
