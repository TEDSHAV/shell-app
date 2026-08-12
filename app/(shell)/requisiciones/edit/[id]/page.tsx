import {
  getAllOSIsForRequisiciones,
  getFacilitatorsForDropdown,
  getCurrentUser,
  getBanksForDropdown,
  getRequisicionRecord,
  isRequisicionesAdmin,
  getAllOsiSessions,
  canPlaceInterna,
  isRequisicionesLider,
} from "@/actions/requisiciones";
import RequisicionForm from "../../components/RequisicionForm";
import { notFound, redirect } from "next/navigation";

export const metadata = {
  title: "Editar Requisición | PRISMA",
};

export default async function EditRequisicionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  const isAdmin = await isRequisicionesAdmin();
  if (isAdmin) {
    redirect(`/requisiciones/view/${id}`);
  }

  const [osis, facilitators, userData, editRecord, banks, osiSessions] = await Promise.all([
    getAllOSIsForRequisiciones(),
    getFacilitatorsForDropdown(),
    getCurrentUser(),
    getRequisicionRecord(parseInt(id)),
    getBanksForDropdown(),
    getAllOsiSessions(),
  ]);

  if (!editRecord) {
    notFound();
  }

  const userDept = userData?.departamentos?.nombre || "";
  const adminResolved = editRecord?.estatus_admin === "procesada" || editRecord?.estatus_admin === "rechazada";
  const coordinadorResolved = editRecord?.coordinador_estatus === "rechazada" || editRecord?.coordinador_estatus === "aprobada";
  const liderResolved = editRecord?.lider_estatus === "rechazada" || editRecord?.lider_estatus === "aprobada";
  const approverEdited = editRecord?.aprobador_edito === true;
  const isLocked = adminResolved || coordinadorResolved || liderResolved || approverEdited;

  const [canPlaceInternaFlag, isLiderFlag] = await Promise.all([
    canPlaceInterna(userDept),
    isRequisicionesLider(),
  ]);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Requisición</h1>
        <p className="text-sm text-gray-600">Actualice los datos de la solicitud.</p>
      </div>
      <RequisicionForm
        osis={osis}
        facilitators={facilitators}
        userData={userData}
        editRecord={editRecord}
        userDept={userDept}
        isLocked={isLocked}
        banks={banks}
        osiSessions={osiSessions}
        canPlaceInterna={canPlaceInternaFlag}
        isLider={isLiderFlag}
      />
    </div>
  );
}
