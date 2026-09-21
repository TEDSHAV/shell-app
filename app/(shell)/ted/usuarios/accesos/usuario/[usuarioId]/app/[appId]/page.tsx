import { notFound, redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import {
  load_acceso_catalog,
  load_usuario_ficha,
} from "@/features/accesos/actions/list-accesos";
import { RolePicker } from "@/features/accesos/components/role-picker";

export const dynamic = "force-dynamic";

export default async function ElegirRolPersonaPage({
  params,
}: {
  params: Promise<{ usuarioId: string; appId: string }>;
}) {
  const allowed = await isTedMember();
  if (!allowed) redirect("/dashboard");

  const { usuarioId, appId } = await params;
  const usuario_id = Number(usuarioId);
  const app_id = Number(appId);
  if (!Number.isFinite(usuario_id) || !Number.isFinite(app_id)) notFound();

  const [catalog, ficha] = await Promise.all([
    load_acceso_catalog(),
    load_usuario_ficha(usuario_id),
  ]);
  const app = catalog.apps.find((a) => a.id === app_id);
  if (!ficha || !app) notFound();

  const roles = catalog.roles.filter((r) => r.app_id === app.id);
  const current = ficha.apps.find((a) => a.app_id === app.id);

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <RolePicker
        ficha={ficha}
        app={app}
        roles={roles}
        permissions={catalog.permissions}
        current_role_id={current?.role_id ?? null}
      />
    </div>
  );
}
