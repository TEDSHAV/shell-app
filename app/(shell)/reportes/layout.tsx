import { PersistentAppFrame } from "@/components/shell/PersistentAppFrame";
import { UnderConstruction } from "@/components/shell/UnderConstruction";
import { isSgestionAdmin } from "@/actions/apps";

export default async function ReportesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await isSgestionAdmin();

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
