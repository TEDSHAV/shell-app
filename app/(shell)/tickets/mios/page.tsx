import { redirect } from "next/navigation";
import { list_my_tickets } from "@/features/tickets/actions/list-tickets";
import { MisTicketsList } from "@/features/tickets/components/mis-tickets";

export const dynamic = "force-dynamic";

export default async function MisTicketsPage() {
  const loaded = await list_my_tickets();
  if (!loaded.ok) {
    if (loaded.error.includes("Inicia sesión")) redirect("/auth/login");
    return (
      <p className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600">
        {loaded.error}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mis tickets</h1>
        <p className="text-sm text-slate-500">
          Estado, respuesta de TED y cola del módulo.
        </p>
      </div>
      <MisTicketsList tickets={loaded.tickets} queues={loaded.queues} />
    </div>
  );
}
