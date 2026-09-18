import { redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import { load_plan_ticket_inbox } from "@/features/planificacion/actions/list-plan";
import { list_ted_tickets } from "@/features/tickets/actions/list-tickets";
import { merge_ticket_inbox } from "@/features/tickets/lib/merge-plan-tickets";
import { TedTicketsInbox } from "@/features/tickets/components/ted-tickets-inbox";

export const dynamic = "force-dynamic";

export default async function TedTicketsPage() {
  const allowed = await isTedMember();
  if (!allowed) redirect("/dashboard");
  const [tickets, plan_tickets] = await Promise.all([
    list_ted_tickets(),
    load_plan_ticket_inbox(),
  ]);
  const merged =
    tickets.ok && plan_tickets.ok
      ? merge_ticket_inbox(tickets.tickets, plan_tickets.items)
      : [];
  return (
    <div className="px-6 pb-6 pt-4">
      <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
        Inbox de tickets
      </h1>
      <p className="mb-4 mt-0.5 text-sm text-slate-400">
        Tickets nativos y tareas ya cargadas con origen TICKET
      </p>
      {tickets.ok && plan_tickets.ok ? (
        <TedTicketsInbox tickets={merged} usuarios={plan_tickets.usuarios} />
      ) : (
        <p className="text-sm text-red-600">
          {!tickets.ok ? tickets.error : plan_tickets.ok ? "" : plan_tickets.error}
        </p>
      )}
    </div>
  );
}
