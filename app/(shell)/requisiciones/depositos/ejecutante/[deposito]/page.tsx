import { redirect, notFound } from "next/navigation";
import { can_view_depositos } from "@/actions/req-stock";
import { ReqDepositosDetailScreen } from "@/features/requisiciones/components/depositos/req-depositos-detail-screen";
import { DEPOSITO_LABEL } from "@/features/requisiciones/lib/req-stock-types";

export const metadata = {
  title: "Inventario ejecutante | PRISMA",
};

export default async function DepositosEjecutantePage({
  params,
  searchParams,
}: {
  params: Promise<{ deposito: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  if (!(await can_view_depositos())) {
    redirect("/requisiciones");
  }
  const { deposito: raw } = await params;
  const { from } = await searchParams;
  if (raw !== "capacitacion" && raw !== "tecnico") notFound();

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
      <div className="relative">
        <ReqDepositosDetailScreen
          mode="ejecutante"
          deposito_ejecutante={raw}
          titulo={DEPOSITO_LABEL[raw]}
          from_app={from}
        />
      </div>
    </div>
  );
}
