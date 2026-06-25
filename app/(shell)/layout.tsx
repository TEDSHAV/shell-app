export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShellProvider } from "@/components/shell/ShellProvider";
import { hasEnvVars } from "@/lib/utils";
import { getUserRolesByApp, getUserRole } from "@/actions/apps";

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

    // Fetch roles in parallel
    const [roles, gRole] = await Promise.all([
      getUserRolesByApp(),
      getUserRole()
    ]);
    userRolesByApp = roles;
    globalRole = gRole;
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
