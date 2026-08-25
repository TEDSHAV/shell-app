import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { isTedMember } from "@/actions/ted";
import { getAllDepartments } from "@/actions/directory";
import { getAllAppRoles } from "@/actions/admin-users";
import { PasswordResetCard } from "@/components/admin/PasswordResetCard";
import { CreateUserCard } from "@/components/admin/CreateUserCard";

export const dynamic = "force-dynamic";

export default async function TedUsuariosPage() {
  const [allowed, departments, appRoles] = await Promise.all([
    isTedMember(),
    getAllDepartments(),
    getAllAppRoles(),
  ]);
  if (!allowed) {
    redirect("/dashboard");
  }

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <div className="mb-8 space-y-3">
        <Link
          href="/ted"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a TED
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Manejo de usuarios
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Crear cuentas nuevas y restablecer contraseñas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreateUserCard departments={departments} appRoles={appRoles} />
        <PasswordResetCard />
      </div>
    </div>
  );
}
