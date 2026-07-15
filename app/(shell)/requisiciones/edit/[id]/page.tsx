import { 
  getAllOSIsForRequisiciones, 
  getFacilitatorsForDropdown, 
  getCurrentUser,
  getBanksForDropdown,
  getRequisicionRecord,
  isRequisicionesAdmin
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

  const [osis, facilitators, userData, editRecord, banks] = await Promise.all([
    getAllOSIsForRequisiciones(),
    getFacilitatorsForDropdown(),
    getCurrentUser(),
    getRequisicionRecord(parseInt(id)),
    getBanksForDropdown(),
  ]);

  const userDept = userData?.departamentos?.nombre || "";
  const isLocked = editRecord?.estatus_admin === "procesada";

  if (!editRecord) {
    notFound();
  }

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
      />
    </div>
  );
}
