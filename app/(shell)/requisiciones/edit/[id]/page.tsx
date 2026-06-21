import { 
  getAllOSIsForRequisiciones, 
  getFacilitatorsForDropdown, 
  getCurrentUser,
  getRequisicionRecord
} from "@/actions/requisiciones";
import { getUserRole } from "@/actions/apps";
import RequisicionForm from "../../components/RequisicionForm";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Editar Requisición | PRISMA",
};

export default async function EditRequisicionPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  const [osis, facilitators, userData, editRecord, userRole] = await Promise.all([
    getAllOSIsForRequisiciones(),
    getFacilitatorsForDropdown(),
    getCurrentUser(),
    getRequisicionRecord(parseInt(id)),
    getUserRole(),
  ]);

  const userDept = userData?.departamentos?.nombre?.trim().toLowerCase() || "";
  const isTEDDept = userDept === "ted";
  const canSwitchMode = isTEDDept || ["admin", "superadmin"].includes(userRole?.toLowerCase());

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
        canSwitchMode={canSwitchMode}
        isTEDDept={isTEDDept}
      />
    </div>
  );
}
