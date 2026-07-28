import { getDisenoServicioList } from "@/actions/diseno-servicio";
import DisenoServicioTable from "./components/DisenoServicioTable";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Nuevos Servicios | PRISMA",
};

export const dynamic = "force-dynamic";

export default async function DisenoServicioPage() {
  const records = await getDisenoServicioList();

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-7 w-7 text-indigo-600" />
          Nuevos Servicios
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Listado de solicitudes de diseño y desarrollo de servicios. Continúe el llenado de los formularios asignados a su departamento.
        </p>
      </div>

      <DisenoServicioTable records={records} />
    </div>
  );
}
