import { get_mapa_requisiciones } from "@/actions/requisiciones-mapa";
import { RequisicionesManual } from "@/features/requisiciones/components/requisiciones-manual";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manual de requisiciones | PRISMA",
};

export default async function RequisicionesManualPage() {
  const mapa = await get_mapa_requisiciones();
  return <RequisicionesManual mapa={mapa} />;
}
