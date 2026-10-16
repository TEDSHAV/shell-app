import { redirect } from "next/navigation";
import { get_depositos_ui_access_action } from "@/actions/req-stock";
import { InvExcelImportWizard } from "@/features/requisiciones/components/inv-excel/inv-excel-import-wizard";

export const metadata = {
  title: "Cargar Excel inventario | PRISMA",
};

export const dynamic = "force-dynamic";

export default async function InventarioImportarPage() {
  const access = await get_depositos_ui_access_action();
  if (!access.can_process && !access.can_edit_minimos) {
    redirect("/requisiciones/depositos");
  }

  return (
    <div className="p-4 sm:p-8">
      <InvExcelImportWizard />
    </div>
  );
}
