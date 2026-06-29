import { PersistentAppFrame } from "@/components/shell/PersistentAppFrame";
import { UnderConstruction } from "@/components/shell/UnderConstruction";
import { canAccessSgestionReportes } from "@/actions/apps";

export default async function ReportesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await canAccessSgestionReportes();

  return (
    <div className="relative flex min-h-0 h-full w-full flex-1">
      {allowed ? (
        <>
          <PersistentAppFrame appId="reportes" />
          <div className="hidden" aria-hidden="true">
            {children}
          </div>
        </>
      ) : (
        <UnderConstruction />
      )}
    </div>
  );
}
