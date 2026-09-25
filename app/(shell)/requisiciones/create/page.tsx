import {
  getAllOSIsForRequisiciones,
  getFacilitatorsForDropdown,
  getCurrentUser,
  getBanksForDropdown,
  getAllOsiSessions,
  isRequisicionesLider,
} from "@/actions/requisiciones";
import {
  getRequisicionAccess,
  list_request_departments,
} from "@/actions/requisiciones-access-context";
import {
  dept_key_for_app,
  dept_matches_key,
} from "@/lib/requisiciones-dept-context";
import RequisicionForm from "../components/RequisicionForm";

export const metadata = {
  title: "Nueva Requisición | PRISMA",
};

export default async function CreateRequisicionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const [osis, facilitators, userData, banks, osiSessions, allowedDepts, access] =
    await Promise.all([
      getAllOSIsForRequisiciones(),
      getFacilitatorsForDropdown(),
      getCurrentUser(),
      getBanksForDropdown(),
      getAllOsiSessions(),
      list_request_departments(),
      getRequisicionAccess(),
    ]);

  const fromKey = dept_key_for_app(from || "");
  const lockedDept = fromKey
    ? allowedDepts.find((row) => dept_matches_key(row.nombre, fromKey)) || null
    : null;
  const lockDepartment = !access.can_select_dept;

  const userDept =
    lockedDept?.nombre || userData?.departamentos?.nombre || "";
  const userGerencia =
    lockedDept?.gerencia || userData?.departamentos?.gerencia || "";
  const isLiderFlag = await isRequisicionesLider();

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
        userGerencia={userGerencia}
        banks={banks}
        osiSessions={osiSessions}
        isLider={isLiderFlag}
        allowedDepts={allowedDepts}
        lockDepartment={lockDepartment}
      />
    </div>
  );
}
