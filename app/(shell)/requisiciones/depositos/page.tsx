import { redirect } from "next/navigation";
import { can_view_depositos } from "@/actions/req-stock";
import { ReqDepositosScreen } from "@/features/requisiciones/components/req-depositos-screen";

export const metadata = {
  title: "Inventario | PRISMA",
};

export default async function RequisicionesDepositosPage() {
  if (!(await can_view_depositos())) {
    redirect("/requisiciones");
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <p className="mt-1 text-sm text-gray-600">
          Saldo, alertas de mínimo y movimientos de cada inventario.
        </p>
      </div>
      <ReqDepositosScreen />
    </div>
  );
}
