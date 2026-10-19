import { redirect } from "next/navigation";
import { Warehouse } from "lucide-react";
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
    <div className="relative min-h-full overflow-hidden bg-white p-4 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-16 h-80 w-80 rounded-full bg-orange-200/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-amber-100/50 blur-3xl"
      />

      <div className="relative mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
          <Warehouse className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Inventario
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">
            Revisa qué hay disponible en cada área, qué se está acabando y
            pide más cuando lo necesites. También puedes registrar lo que
            gastaste.
          </p>
        </div>
      </div>
      <div className="relative">
        <ReqDepositosScreen />
      </div>
    </div>
  );
}
