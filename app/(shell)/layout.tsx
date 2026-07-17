export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShellProvider } from "@/components/shell/ShellProvider";
import { hasEnvVars } from "@/lib/utils";
import { getUserRolesByApp, getUserRoleFromRoles } from "@/actions/apps";

export default async function ShellLayout({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  let userEmail: string | undefined;
  let userRolesByApp: Record<string, string> = {};
  let globalRole: string | undefined;

  if (hasEnvVars) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims) {
      redirect("/auth/login");
    }

    userEmail = data.claims.email as string | undefined;

    // Check claims for user_role first (avoids DB call when present)
    const claimsRole = (data.claims.user_role as string) ??
      (data.claims.app_metadata as Record<string, string> | undefined)?.role;

    if (claimsRole) {
      globalRole = claimsRole;
      // Still need app-specific roles for sidebar/navigation
      userRolesByApp = await getUserRolesByApp();
    } else {
      // No role in claims — fetch app roles and derive both
      userRolesByApp = await getUserRolesByApp();
      globalRole = await getUserRoleFromRoles(userRolesByApp);
    }
  }

  return (
    <ShellProvider 
      userEmail={userEmail} 
      sidebar={sidebar}
      userRolesByApp={userRolesByApp}
      globalRole={globalRole}
    >
      {children}
    </ShellProvider>
  );
}
