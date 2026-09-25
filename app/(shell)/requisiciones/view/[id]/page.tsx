import {
  getRequisicionRecord,
  getOSIForRequisicion,
  getOsisByIds,
  getBanksForDropdown,
  isRequisicionesAdmin,
  getCoordinatedDepartments,
  getDepartmentsInLedGerencias,
  getLimiteLiderUsd,
} from "@/actions/requisiciones";
import {
  getRequisicionAccess,
  list_catalog_departments_for_admin_edit,
} from "@/actions/requisiciones-access-context";
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
  const [record, isAdminView, banks, coordinadorDepts, liderDepts, limiteLiderUsd, access, deptCatalog] = await Promise.all([
    getRequisicionRecord(parseInt(id)),
    isRequisicionesAdmin(),
    getBanksForDropdown(),
    getCoordinatedDepartments(),
    getDepartmentsInLedGerencias(),
    getLimiteLiderUsd(),
    getRequisicionAccess(),
    list_catalog_departments_for_admin_edit(),
  ]);

  if (!record) {
    notFound();
  }

  const isCoordinador = coordinadorDepts.length > 0;
  const isLider = liderDepts.length > 0;
  const approverEdited = record?.aprobador_edito === true;
  const canEditDepartamento = access.can_edit_departamento_emitida;
  const canEditTramite = access.can_edit_tramite;

  let osiData = null;
  const osiLookup = new Map<number, string>();
  const isLocked =
    record?.estatus_admin === "procesada" ||
    record?.estatus_admin === "rechazada";
  const isParcial = record?.estatus_admin === "parcial";
  const isLockedForCreator = isLocked || isParcial;
  const linkedOsiIds: number[] = (record.requisiciones_osis || []).map(
    (ro: any) => ro.id_osi
  );

  const osiPromises: Promise<void>[] = [];
  if (record.id_osi) {
    osiPromises.push(
      (async () => {
        try {
          osiData = await getOSIForRequisicion(record.id_osi);
          if (osiData && osiData.nro_osi) {
            osiLookup.set(osiData.id_osi, osiData.nro_osi);
          }
        } catch (e) {
          console.error("Error fetching OSI data for view:", e);
        }
      })(),
    );
  }
  if (linkedOsiIds.length > 0) {
    osiPromises.push(
      (async () => {
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
      })(),
    );
  }
  await Promise.all(osiPromises);

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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Detalle de Requisición
              </h1>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                record.tipo_solicitud === "Interno"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}>
                {record.tipo_solicitud === "Interno" ? "Interna" : "Externa"}
              </span>
            </div>
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
        ) : isParcial && !isAdminView ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-300 rounded-lg text-sky-800 text-sm font-medium">
            <Lock className="h-4 w-4" />
            Procesada parcialmente — Administración sigue tramitando ítems pendientes
          </div>
        ) : approverEdited && !isAdminView ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm font-medium">
            <Lock className="h-4 w-4" />
            Modificada por el Aprobador
          </div>
        ) : !isAdminView && !isLockedForCreator ? (
          <Link href={`/requisiciones/edit/${id}`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex gap-2">
              <Edit className="h-4 w-4" />
              Editar Requisición
            </Button>
          </Link>
        ) : null}
      </div>

      <RequisicionView
        record={record}
        osiData={osiData}
        osiLookup={osiLookup}
        isAdminView={isAdminView}
        isCoordinador={isCoordinador}
        coordinadorDepts={coordinadorDepts}
        isLider={isLider}
        liderDepts={liderDepts}
        banks={banks}
        limiteLiderUsd={limiteLiderUsd}
        canEditDepartamento={canEditDepartamento}
        canEditTramite={canEditTramite}
        deptCatalog={deptCatalog}
      />
    </div>
  );
}
