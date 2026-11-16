import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserPermissionsByApp } from "@/actions/apps";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import {
  cargar_facturacion,
  cargar_requisiciones,
} from "@/features/administracion/lib/dashboard-data";
import {
  modulo_facturacion,
  modulo_presupuesto_mensual,
  modulo_requisiciones,
  permisos_facturacion,
  permisos_presupuesto,
  type ModuloDashboard,
} from "@/features/administracion/lib/dashboard-modulos";
import { PresupuestoWidgetsFrame } from "@/features/administracion/components/presupuesto-widgets-frame";
import {
  AccesosPanel,
  BandejaCard,
  DashboardHero,
  TodoAlDia,
} from "@/features/administracion/components/dashboard-ui";

export const metadata = {
  title: "Administración | PRISMA",
  description: "Inicio de Administración: qué toca hacer y accesos a cada módulo",
};

const VACIO_REQ = {
  por_procesar: null,
  por_sellar_lider: null,
  por_sellar_coordinador: null,
  aumento_por_aprobar: null,
  mias_en_tramite: null,
};

function fecha_larga(): string {
  return new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Caracas",
  }).format(new Date());
}

export default async function AdministracionDashboardPage() {
  const supabase = await createClient();
  const [{ data: auth }, access, perms_by_app] = await Promise.all([
    supabase.auth.getUser(),
    getRequisicionAccess(),
    getUserPermissionsByApp(),
  ]);
  const user = auth.user;

  // Mismos permisos que filtran el sidebar de Administración.
  const slugs_negocio = [
    ...new Set([
      ...(perms_by_app.sgestion ?? []),
      ...(perms_by_app.sadministracion ?? []),
    ]),
  ];
  const facturacion = permisos_facturacion(slugs_negocio);
  const presupuesto = permisos_presupuesto(perms_by_app.spresupuesto ?? []);
  const puede_catalogo = slugs_negocio.some(
    (s) => s === "administracion:catalogo:base" || s === "finance:catalogo:access",
  );

  const [nombre, datos_req, datos_fac] = await Promise.all([
    user
      ? supabase
          .from("usuarios")
          .select("nombre_apellido")
          .eq("id_auth", user.id)
          .maybeSingle()
          .then(({ data }) => data?.nombre_apellido ?? null)
      : Promise.resolve(null),
    user ? cargar_requisiciones(access, user.id) : Promise.resolve(VACIO_REQ),
    facturacion.admin ? cargar_facturacion() : Promise.resolve({ por_emitir: null }),
  ]);

  const modulos: ModuloDashboard[] = [
    modulo_requisiciones(access, datos_req, puede_catalogo),
    modulo_facturacion(facturacion, datos_fac),
    modulo_presupuesto_mensual(presupuesto),
  ].filter((m): m is ModuloDashboard => m !== null);

  const bandejas = modulos.flatMap((modulo) =>
    modulo.bandejas.map((bandeja) => ({ bandeja, modulo })),
  );
  const primer_nombre = (nombre || user?.email?.split("@")[0] || "").split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      <DashboardHero
        saludo={primer_nombre ? `Hola, ${primer_nombre}` : "Hola"}
        fecha={fecha_larga()}
        resumen={bandejas.map(({ bandeja, modulo }) => ({
          id: bandeja.id,
          modulo: modulo.titulo,
          total: bandeja.contenido.total,
          frase:
            bandeja.contenido.total === 1
              ? bandeja.frase.uno
              : bandeja.frase.otros,
          hacer: bandeja.hacer,
          tipo: bandeja.tipo,
        }))}
        acciones={
          <>
            {access.can_create ? (
              <Link
                href="/requisiciones/create?from=administracion"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-[#1B6FB0] to-[#0C3F69] px-4 text-sm font-semibold text-white shadow-md shadow-[#0C3F69]/25 transition hover:brightness-110"
              >
                <FilePlus2 className="h-4 w-4" />
                Nueva requisición
              </Link>
            ) : null}
          </>
        }
      />

      {modulos.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200/70">
          Todavía no tienes acceso a ningún módulo de Administración. Si lo
          necesitas, pídelo en Accesos.
        </div>
      ) : (
        <>
          {bandejas.length === 0 ? (
            <TodoAlDia />
          ) : (
            <div className="grid items-start gap-5 xl:grid-cols-2">
              {bandejas.map(({ bandeja, modulo }) => (
                <BandejaCard key={bandeja.id} bandeja={bandeja} modulo={modulo} />
              ))}
            </div>
          )}
          {presupuesto.nomina_ver || presupuesto.apu_ver || presupuesto.presupuesto_ver ? (
            <PresupuestoWidgetsFrame />
          ) : null}
          <AccesosPanel modulos={modulos} />
        </>
      )}
    </div>
  );
}
