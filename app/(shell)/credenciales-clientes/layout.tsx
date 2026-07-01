import { redirect } from "next/navigation";
import { canManageClientesCuentas } from "@/actions/apps";

export default async function CredencialesClientesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await canManageClientesCuentas();

  if (!allowed) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
