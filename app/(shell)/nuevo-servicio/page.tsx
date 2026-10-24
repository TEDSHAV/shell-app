import { getDisenoServicioList } from "@/actions/diseno-servicio";
import DisenoServicioListClient from "./components/DisenoServicioListClient";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Nuevos Servicios | PRISMA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ dept?: string }>;
}

export default async function DisenoServicioPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const records = await getDisenoServicioList();

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-indigo-600" />
            Nuevos Servicios
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Diseño, desarrollo y seguimiento de nuevos servicios para Capacitación y Servicios Técnicos.
          </p>
        </div>
      </div>

      <DisenoServicioListClient
        initialRecords={records}
        initialDept={resolvedParams.dept}
      />
    </div>
  );
}
