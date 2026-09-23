import { notFound, redirect } from "next/navigation";
import { canManageUsuariosPrisma } from "@/actions/ted";
import { load_acceso_catalog } from "@/features/accesos/actions/list-accesos";
import { RoleEditor } from "@/features/accesos/components/role-editor";

export const dynamic = "force-dynamic";

export default async function NuevoRolPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const allowed = await canManageUsuariosPrisma();
  if (!allowed) redirect("/dashboard");

  const { appId } = await params;
  const app_id = Number(appId);
  if (!Number.isFinite(app_id) || app_id <= 0) notFound();

  const catalog = await load_acceso_catalog();
  const app = catalog.apps.find((a) => a.id === app_id);
  if (!app) notFound();

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <RoleEditor
        app={app}
        role={null}
        permissions={catalog.permissions}
        roles={catalog.roles}
        modules={catalog.modules}
        actions={catalog.actions}
        apps={catalog.apps}
        back_href={`/ted/usuarios/accesos?tab=aplicaciones&app=${app.id}`}
      />
    </div>
  );
}
