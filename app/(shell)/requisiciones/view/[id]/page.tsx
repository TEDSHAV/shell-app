import { 
  getRequisicionRecord, 
  getOSIForRequisicion,
  getOsisByIds,
  isRequisicionesAdmin
} from "@/actions/requisiciones";
import RequisicionView from "./components/RequisicionView";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Lock } from "lucide-react";

export const metadata = {
  title: "Detalle de Requisición | PRISMA",
};

export default async function ViewRequisicionPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const [record, isAdminView] = await Promise.all([
    getRequisicionRecord(parseInt(id)),
    isRequisicionesAdmin(),
  ]);

  if (!record) {
    notFound();
  }

  let osiData = null;
  let osiLookup = new Map<number, string>();
  const isLocked = record?.estatus_admin === "procesada" || record?.estatus_admin === "rechazada";
  if (record.id_osi) {
    try {
      osiData = await getOSIForRequisicion(record.id_osi);
      if (osiData && osiData.nro_osi) {
        osiLookup.set(osiData.id_osi, osiData.nro_osi);
      }
    } catch (e) {
      console.error("Error fetching OSI data for view:", e);
    }
  }

  // Fetch nro_osi for all linked OSIs via junction table
  const linkedOsiIds: number[] = (record.requisiciones_osis || []).map(
    (ro: any) => ro.id_osi
  );
  if (linkedOsiIds.length > 0) {
    try {
      const linkedOsis = await getOsisByIds(linkedOsiIds);
      (linkedOsis || []).forEach((osi: any) => {
        if (osi.id_osi && osi.nro_osi) {
          osiLookup.set(osi.id_osi, osi.nro_osi);
        }
      });
    } catch (e) {
      console.error("Error fetching linked OSI data:", e);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/requisiciones">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Detalle de Requisición
            </h1>
            <p className="text-sm text-gray-600">
              Vista de lectura del registro {record.nro_correlativo}
            </p>
          </div>
        </div>
        {isLocked ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
            <Lock className="h-4 w-4" />
            {record.estatus_admin === "rechazada" ? "Rechazada por Administración" : "Procesada por Administración"}
          </div>
        ) : !isAdminView ? (
          <Link href={`/requisiciones/edit/${id}`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2">
              <Edit className="h-4 w-4" />
              Editar Requisición
            </Button>
          </Link>
        ) : null}
      </div>

      <RequisicionView record={record} osiData={osiData} osiLookup={osiLookup} isAdminView={isAdminView} />
    </div>
  );
}
