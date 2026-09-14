import { PersistentAppFrame } from "@/components/shell/PersistentAppFrame";

export default function ServiciosTecnicosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 min-h-0 h-full w-full">
      <PersistentAppFrame appId="servicios-tecnicos" />
      <div className="hidden" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
