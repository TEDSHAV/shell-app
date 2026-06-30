import { redirect } from "next/navigation";
import { getUserRolesByApp, getUserRole } from "@/actions/apps";

export default async function CredencialesClientesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [roles, globalRole] = await Promise.all([
    getUserRolesByApp(),
    getUserRole(),
  ]);

  const allRoles = [
    ...Object.values(roles).map((r) => r?.toLowerCase()),
    globalRole?.toLowerCase(),
  ].filter(Boolean);

  const allowed = allRoles.some(
    (r) => r === "admin" || r === "superadmin",
  );

  if (!allowed) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
