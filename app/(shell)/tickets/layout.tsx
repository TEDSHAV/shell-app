import { TicketsNav } from "@/features/tickets/components/tickets-nav";

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full w-full bg-slate-50 p-6">
      <TicketsNav />
      {children}
    </div>
  );
}
