import { UnderConstruction } from "@/components/shell/UnderConstruction";
import { getUserRolesByApp, getUserRole } from "@/actions/apps";
import { can_access_requisiciones } from "@/lib/shell-app-access";

export default async function RequisicionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [roles, globalRole] = await Promise.all([
    getUserRolesByApp(),
    getUserRole(),
  ]);

  const allowed = can_access_requisiciones(roles, globalRole);

  if (!allowed) {
    return <UnderConstruction title="Administración" />;
  }

  return <>{children}</>;
}
