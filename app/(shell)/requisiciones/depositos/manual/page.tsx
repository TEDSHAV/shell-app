import { redirect } from "next/navigation";
import { can_view_depositos } from "@/actions/req-stock";
import { InventarioManual } from "@/features/requisiciones/components/inventario-manual";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manual de inventario | PRISMA",
};

export default async function InventarioManualPage() {
  if (!(await can_view_depositos())) {
    redirect("/requisiciones");
  }
  return (
    <div className="relative min-h-full bg-white">
      <InventarioManual />
    </div>
  );
}
