import { redirect } from "next/navigation";
import { getUserRolesByApp, getUserRole } from "@/actions/apps";

export default async function RequisicionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [roles, globalRole] = await Promise.all([
    getUserRolesByApp(),
    getUserRole()
  ]);
  
  const appRole = roles["requisiciones"]?.toLowerCase();
  const userGlobalRole = globalRole?.toLowerCase();

  const allowedRoles = ["admin", "lider", "superadmin"];
  
  const isAuthorized = 
    (appRole && allowedRoles.includes(appRole)) || 
    (userGlobalRole && allowedRoles.includes(userGlobalRole));

  if (!isAuthorized) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
