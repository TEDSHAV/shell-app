import { redirect } from "next/navigation";
import { load_ticket_catalog } from "@/features/tickets/actions/catalog";
import { TicketForm } from "@/features/tickets/components/ticket-form";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const catalog = await load_ticket_catalog();
  if (!catalog.ok) {
    if (catalog.error.includes("Inicia sesión")) redirect("/auth/login");
    return (
      <p className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600">
        {catalog.error}
      </p>
    );
  }
  return <TicketForm catalog={catalog.data} />;
}
