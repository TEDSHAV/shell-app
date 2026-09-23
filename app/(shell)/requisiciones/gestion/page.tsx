import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getGestionRequisiciones,
  isRequisicionesAdmin,
  getOsiNumbersForLookup,
} from "@/actions/requisiciones";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import RequisicionesTable from "../components/RequisicionesTable";

export const metadata = {
  title: "Gestión de Requisiciones | PRISMA",
};

export default async function GestionRequisicionesPage() {
  const isAdminView = await isRequisicionesAdmin();
  if (!isAdminView) {
    redirect("/requisiciones");
  }

  const [records, osiPairs, access] = await Promise.all([
    getGestionRequisiciones(),
    getOsiNumbersForLookup(),
    getRequisicionAccess(),
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
        {access.can_edit_config ? (
          <p className="mt-2 text-sm">
            <a href="/requisiciones/configuracion" className="text-blue-700 hover:underline">
              Configurar límite de líder
            </a>
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        <Link
          href="/requisiciones"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent -mb-px transition-colors"
        >
          Mis Requisiciones
        </Link>
        <Link
          href="/requisiciones/gestion"
          className="px-4 py-2.5 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 -mb-px"
        >
          Gestión de Requisiciones
        </Link>
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
