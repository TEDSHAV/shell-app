import { notFound, redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import { load_acceso_catalog } from "@/features/accesos/actions/list-accesos";
import { RoleView } from "@/features/accesos/components/role-view";

export const dynamic = "force-dynamic";

export default async function VerRolPage({
  params,
}: {
  params: Promise<{ appId: string; roleId: string }>;
}) {
  const allowed = await isTedMember();
  if (!allowed) redirect("/dashboard");

  const { appId, roleId } = await params;
  const app_id = Number(appId);
  const role_id = Number(roleId);
  if (!Number.isFinite(app_id) || !Number.isFinite(role_id)) notFound();

  const catalog = await load_acceso_catalog();
  const app = catalog.apps.find((a) => a.id === app_id);
  const role = catalog.roles.find((r) => r.id === role_id && r.app_id === app_id);
  if (!app || !role) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl p-8">
      <RoleView
        app_id={app.id}
        app_nombre={app.nombre}
        role={role}
        permissions={catalog.permissions}
        back_href={`/ted/usuarios/accesos?tab=aplicaciones&app=${app.id}`}
      />
    </div>
  );
}
