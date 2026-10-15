import Link from "next/link";
import { redirect } from "next/navigation";
import { isRequisicionesAdmin } from "@/actions/requisiciones";
import { ReqDepositosScreen } from "@/features/requisiciones/components/req-depositos-screen";

export const metadata = {
  title: "Depósitos | PRISMA",
};

export default async function RequisicionesDepositosPage() {
  if (!(await isRequisicionesAdmin())) {
    redirect("/requisiciones");
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Depósitos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Saldo por departamento, capacitación y servicios técnicos. El
          kardex y el reparto a OSI se confirman aquí.
        </p>
      </div>
      <div className="mb-6 flex items-center gap-2 border-b border-gray-200">
        <Link
          href="/requisiciones/gestion"
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 -mb-px border-b-2 border-transparent"
        >
          Gestión
        </Link>
        <span className="px-4 py-2.5 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 -mb-px">
          Depósitos
        </span>
      </div>
      <ReqDepositosScreen />
    </div>
  );
}
