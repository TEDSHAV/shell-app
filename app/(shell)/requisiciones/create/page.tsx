import { 
  getAllOSIsForRequisiciones, 
  getFacilitatorsForDropdown, 
  getCurrentUser,
  isRequisicionesAdmin,
} from "@/actions/requisiciones";
import RequisicionForm from "../components/RequisicionForm";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Nueva Requisición | PRISMA",
};

export default async function CreateRequisicionPage() {
  const isAdmin = await isRequisicionesAdmin();
  if (isAdmin) {
    redirect("/requisiciones");
  }

  const [osis, facilitators, userData] = await Promise.all([
    getAllOSIsForRequisiciones(),
    getFacilitatorsForDropdown(),
    getCurrentUser(),
  ]);

  const userDept = userData?.departamentos?.nombre || "";

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Requisición</h1>
        <p className="text-sm text-gray-600">Complete los datos para generar una nueva solicitud.</p>
      </div>
      <RequisicionForm 
        osis={osis} 
        facilitators={facilitators} 
        userData={userData} 
        userDept={userDept}
      />
    </div>
  );
}
