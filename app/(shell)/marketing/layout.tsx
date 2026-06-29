import { PersistentAppFrame } from "@/components/shell/PersistentAppFrame";
import { UnderConstruction } from "@/components/shell/UnderConstruction";
import { canAccessSgestionMarketing } from "@/actions/apps";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await canAccessSgestionMarketing();

  return (
    <div className="relative flex min-h-0 h-full w-full flex-1">
      {allowed ? (
        <>
          <PersistentAppFrame appId="marketing" />
          <div className="hidden" aria-hidden="true">
            {children}
          </div>
        </>
      ) : (
        <UnderConstruction title="Marketing" />
      )}
    </div>
  );
}
