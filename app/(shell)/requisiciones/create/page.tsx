import {
  getAllOSIsForRequisiciones,
  getCurrentUser,
  getAllOsiSessions,
} from "@/actions/requisiciones";
import { list_request_departments } from "@/actions/requisiciones-access-context";
import {
  dept_key_for_app,
  dept_matches_key,
} from "@/lib/requisiciones-dept-context";
import { ReqAltaAsistente } from "@/features/requisiciones/components/alta/req-alta-asistente";

export const metadata = {
  title: "Nueva Requisición | PRISMA",
};

export default async function CreateRequisicionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const [osis, userData, osiSessions, allowedDepts] = await Promise.all([
    getAllOSIsForRequisiciones(),
    getCurrentUser(),
    getAllOsiSessions(),
    list_request_departments(),
  ]);

  const fromKey = dept_key_for_app(from || "");
  const lockedDept = fromKey
    ? allowedDepts.find((row) => dept_matches_key(row.nombre, fromKey)) || null
    : null;
  const userDept =
    lockedDept?.nombre || userData?.departamentos?.nombre || "";
  const userGerencia =
    lockedDept?.gerencia || userData?.departamentos?.gerencia || "";

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Requisición</h1>
        <p className="text-sm text-gray-600">
          Siga los pasos de arriba. El documento se crea recién en Revisar.
        </p>
      </div>
      <ReqAltaAsistente
        osis={osis || []}
        userData={userData}
        userDept={userDept}
        userGerencia={userGerencia}
        osiSessions={osiSessions || []}
      />
    </div>
  );
}
