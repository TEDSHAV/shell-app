import { get_mapa_requisiciones } from "@/actions/requisiciones-mapa";
import { load_req_cost_manual_page } from "@/features/requisiciones/actions/load-req-cost-manual";
import { RequisicionesManual } from "@/features/requisiciones/components/requisiciones-manual";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manual de requisiciones | PRISMA",
};

export default async function RequisicionesManualPage() {
  const [mapa, cost] = await Promise.all([
    get_mapa_requisiciones(),
    load_req_cost_manual_page(),
  ]);
  return (
    <RequisicionesManual
      mapa={mapa}
      sensitive={cost.sensitive}
      model={cost.model}
    />
  );
}
