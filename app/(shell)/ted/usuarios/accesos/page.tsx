import { redirect } from "next/navigation";
import Link from "next/link";
import { isTedMember } from "@/actions/ted";
import { load_acceso_catalog, load_usuario_ficha } from "@/features/accesos/actions/list-accesos";
import {
  AccesosWorkspace,
  type AccesosTab,
} from "@/features/accesos/components/accesos-workspace";

export const dynamic = "force-dynamic";

function parse_tab(raw: string | string[] | undefined): AccesosTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === "aplicaciones" ||
    value === "roles" ||
    value === "permisos" ||
    value === "personas"
  ) {
    return value;
  }
  return "personas";
}

export default async function TedAccesosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const allowed = await isTedMember();
  if (!allowed) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const usuario_id = Number(
    Array.isArray(params.usuario) ? params.usuario[0] : params.usuario,
  );
  const app_id = Number(Array.isArray(params.app) ? params.app[0] : params.app);
  const tab = parse_tab(params.tab);
  const [catalog, ficha] = await Promise.all([
    load_acceso_catalog(),
    Number.isFinite(usuario_id) && usuario_id > 0
      ? load_usuario_ficha(usuario_id)
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 pb-16 sm:p-8">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          TED
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Accesos y roles
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Un rol por aplicación. La persona no recibe permisos sueltos: recibe
          una función. El organigrama (depto y cargo) solo se muestra.
        </p>
        <nav className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/ted"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
          >
            Volver a TED
          </Link>
          <Link
            href="/ted/usuarios/accesos/manual"
            className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-800 hover:border-sky-400"
          >
            Cómo funciona
          </Link>
        </nav>
      </header>
      <AccesosWorkspace
        catalog={catalog}
        ficha={ficha}
        tab={tab}
        selected_app_id={Number.isFinite(app_id) && app_id > 0 ? app_id : null}
      />
    </div>
  );
}
