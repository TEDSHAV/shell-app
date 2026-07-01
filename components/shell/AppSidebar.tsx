import { getUserPermissionsByApp, getUserRolesByApp, getUserRole } from "@/actions/apps";
import { canAccessConsultaOSI } from "@/actions/osi";
import { SidebarNavClient } from "./SidebarNavClient";
import { apps } from "@/config/apps";

export async function AppSidebar() {
  const [dbPerms, userRolesByApp, globalRole, canAccessOSI] = await Promise.all([
    getUserPermissionsByApp(),
    getUserRolesByApp(),
    getUserRole(),
    canAccessConsultaOSI(),
  ]);

  const userPermsByApp: Record<string, string[]> = {};
  for (const app of apps) {
    const dbSlug = app.dbSlug ?? app.id;
    if (dbPerms[dbSlug]) {
      userPermsByApp[app.id] = dbPerms[dbSlug];
    }
  }

  return <SidebarNavClient userPermsByApp={userPermsByApp} userRolesByApp={userRolesByApp} globalRole={globalRole} canAccessConsultaOSI={canAccessOSI} />;
}
