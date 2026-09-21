"use client";

import Link from "next/link";
import { ManualArticle } from "@/components/manual/ManualArticle";
import { module_label, group_permissions_by_module } from "../lib/slugs";
import type { AccesoCatalog } from "../lib/types";

export function AccesosManual({ catalog }: { catalog: AccesoCatalog }) {
  return (
    <ManualArticle
      kicker="TED"
      title="Manual de accesos y roles"
      lead="Cómo Prisma decide quién entra a cada aplicación: una función (rol) por app, y los permisos cuelgan de esa función, no de la persona."
      chips={[
        { id: "manual-rbac", label: "Modelo" },
        { id: "manual-slugs", label: "Convención" },
        { id: "manual-niveles", label: "Niveles" },
        { id: "manual-consola", label: "Consola" },
        { id: "manual-catalogo", label: "Catálogo" },
        { id: "manual-limites", label: "Límites" },
      ]}
      sections={[
        {
          id: "manual-rbac",
          title: "Qué es un acceso aquí",
          body: (
            <>
              <p>
                El empleado no recibe permisos sueltos. Recibe <strong>un rol
                por aplicación</strong>. El rol es la función (líder, coordinador,
                ejecutivo, gestor financiero). Los permisos viven en el rol y
                pueden cambiar sin reescribir para qué existe esa función.
              </p>
              <p>
                El organigrama (gerencia, departamento, cargo) sirve para
                directorio y documentos. No abre menús ni aprueba requisiciones
                por sí solo.
              </p>
              <p>
                <Link
                  href="/ted/usuarios/accesos"
                  className="font-semibold text-sky-800 underline"
                >
                  Abrir la consola
                </Link>
              </p>
            </>
          ),
        },
        {
          id: "manual-slugs",
          title: "Cómo se nombran las piezas",
          body: (
            <>
              <p>
                App: slug corto y estable (<code>sgestion</code>,{" "}
                <code>st</code>, <code>scapacitacion</code>). Rol: la función,
                único dentro de esa app (<code>lider</code>,{" "}
                <code>coordinador</code>, <code>gestor_clientes</code>). No se
                duplica el nombre de la app dentro del rol.
              </p>
              <p>
                Permiso: se arma por niveles, con dos puntos:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>Módulo + acción</strong>{" "}
                  (<code>directorio:access</code>): el módulo es pequeño o el
                  permiso cubre todo. El recurso se deja vacío.
                </li>
                <li>
                  <strong>Módulo + recurso + acción</strong>{" "}
                  (<code>finance:ecc:approve</code>): el módulo tiene varias
                  cosas (ECC, facturas, presupuestos) y hay que acotar.
                </li>
              </ul>
              <p className="mt-2">
                Acciones habituales: access, read, write, create, edit, approve,
                manage, export. Los slugs viejos no se renombran: SGestion ya
                los consume.
              </p>
              <p>
                La descripción de un rol habla de la función (“lidera ST y
                aprueba requisiciones”), no de la lista de permisos del momento.
              </p>
            </>
          ),
        },
        {
          id: "manual-niveles",
          title: "Cuándo poner recurso y cuándo no",
          body: (
            <>
              <p>
                El recurso no es obligatorio. Sirve para no mezclar poderes
                dentro de un módulo grande. Un módulo chico (Directorio, Pipeline
                de una sola pantalla) se describe con <code>modulo:accion</code>.
              </p>
              <p>
                El permiso sigue siendo <strong>global</strong>: no se duplica
                por app. Se orienta a una app al crearlo (para el catálogo de
                módulos) y luego se cuelga de los roles que lo necesiten, aunque
                esos roles vivan en otras apps. Ejemplo: crear requisiciones lo
                puede tener un analista de ST y un gestor de Negocios, con el
                mismo slug.
              </p>
              <p>
                Guía de slugs de requisiciones:{" "}
                <code>docs/requisiciones-permisos.md</code>. Se crean y se
                cuelgan en esta consola; el módulo es transversal.
              </p>
            </>
          ),
        },
        {
          id: "manual-consola",
          title: "Cómo usar la consola",
          body: (
            <>
              <p>
                <strong>Personas:</strong> ficha del empleado, apps que tiene y
                botón para cambiar el rol. Eso abre una galería de fichas de
                esa app: eliges la función y confirmas.
              </p>
              <p>
                <strong>Aplicaciones y Roles:</strong> catálogo. Crear o editar
                un rol es una pantalla completa en tres pasos: datos (incluido
                para qué sirve), permisos, revisar.
              </p>
              <p>
                <strong>Permisos:</strong> catálogo global. Un permiso cobra
                efecto cuando un rol lo incluye.
              </p>
            </>
          ),
        },
        {
          id: "manual-catalogo",
          title: "Catálogo vivo",
          body: (
            <div className="space-y-6">
              <p>
                Lo que sigue sale de la base, no de un Excel paralelo. Si
                cambias una descripción en la consola, también cambia aquí.
              </p>
              {catalog.apps.map((app) => {
                const roles = catalog.roles.filter((r) => r.app_id === app.id);
                return (
                  <div key={app.id}>
                    <h3 className="text-lg font-bold text-slate-900">
                      {app.nombre}
                    </h3>
                    {app.descripcion ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {app.descripcion}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {roles.map((role) => {
                        const mods = group_permissions_by_module(
                          role.permission_slugs.map((slug) => ({ slug })),
                        );
                        return (
                          <article
                            key={role.id}
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <p className="font-semibold text-slate-900">
                              {role.nombre}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                              {role.descripcion || "Sin descripción de función."}
                            </p>
                            {mods.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {mods.map((g) => (
                                  <span
                                    key={g.module}
                                    className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-800"
                                  >
                                    {module_label(g.module)}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ),
        },
        {
          id: "manual-limites",
          title: "Qué no hace esta consola",
          body: (
            <>
              <p>
                Crear una app en el catálogo no añade el ícono ni las rutas del
                menú Shell: eso sigue en la configuración de navegación.
              </p>
              <p>
                Requisiciones reconoce líder y coordinador por el slug del rol
                en esa app (<code>lider</code>, <code>coordinador</code>), no
                por el organigrama.
              </p>
              <p>
                No se borra un rol si todavía hay personas asignadas. Un
                usuario no puede tener dos roles en la misma aplicación.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
