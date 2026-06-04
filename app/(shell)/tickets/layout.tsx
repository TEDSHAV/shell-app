import { TicketsAppFrame } from "@/components/shell/TicketsAppFrame";

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 min-h-0 h-full w-full">
      <TicketsAppFrame />
      <div className="hidden" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
