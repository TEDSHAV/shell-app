import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAllRequisiciones } from "@/actions/requisiciones";
import RequisicionRow from "./components/RequisicionRow";
import { FilePlus2 } from "lucide-react";

export const metadata = {
  title: "Mis Requisiciones | PRISMA",
};

export default async function RequisicionesPage() {
  const records = await getAllRequisiciones();

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Mis Requisiciones
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Listado de todas las solicitudes de requisición que has creado.
          </p>
        </div>
        <Link href="/requisiciones/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2">
            <FilePlus2 className="h-4 w-4" />
            Nueva Requisición
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Correlativo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OSI
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gerencia
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records && records.length > 0 ? (
                records.map((record: any) => (
                  <RequisicionRow key={record.id} record={record} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p>No has creado ninguna requisición todavía.</p>
                      <Link href="/requisiciones/create">
                        <Button variant="link" className="text-blue-600 p-0 h-auto">
                          Crear tu primera solicitud ahora
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
