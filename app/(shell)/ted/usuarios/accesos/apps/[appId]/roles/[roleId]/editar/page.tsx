import { notFound, redirect } from "next/navigation";
import { canManageUsuariosPrisma } from "@/actions/ted";
import { load_acceso_catalog } from "@/features/accesos/actions/list-accesos";
import { RoleEditor } from "@/features/accesos/components/role-editor";

export const dynamic = "force-dynamic";

export default async function EditarRolPage({
  params,
}: {
  params: Promise<{ appId: string; roleId: string }>;
}) {
  const allowed = await canManageUsuariosPrisma();
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
      <RoleEditor
        app={app}
        role={role}
        permissions={catalog.permissions}
        roles={catalog.roles}
        modules={catalog.modules}
        actions={catalog.actions}
        apps={catalog.apps}
        back_href={`/ted/usuarios/accesos/apps/${app.id}/roles/${role.id}`}
      />
    </div>
  );
}
