"use client";

import { useState, type ReactNode } from "react";
import {
  BookOpen,
  Briefcase,
  ChevronDown,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ManualAppRoles } from "@/actions/manual-roles";

type Props = {
  apps: ManualAppRoles[];
};

export function ManualHubClient({ apps }: Props) {
  const [open_intro, set_open_intro] = useState(true);
  const [open_nav, set_open_nav] = useState(true);
  const [open_roles, set_open_roles] = useState(true);
  const [open_catalog, set_open_catalog] = useState(true);
  const [open_app, set_open_app] = useState<string | null>("sgestion");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 pb-16 sm:p-8">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-8 sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Prisma
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Manual del sistema
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Cómo entrar, quién hace qué y dónde está el manual de cada aplicación.
          Empiece por Negocios: ahí está el proceso comercial paso a paso.
        </p>
      </header>

      <CollapsibleBlock
        open={open_intro}
        onToggle={() => set_open_intro((v) => !v)}
        icon={<BookOpen className="h-6 w-6 text-sky-700" />}
        title="Para qué sirve este espacio"
      >
        <p className="text-base leading-relaxed text-slate-600">
          Shell es la puerta de Prisma: desde aquí abre Negocios, Administración,
          Reportes y el resto de apps. No tiene un rol propio; el acceso lo dan
          su usuario y los roles de cada aplicación.
        </p>
        <ul className="mt-4 space-y-2 text-base text-slate-700">
          <li className="flex gap-2">
            <span className="font-bold text-sky-700">•</span>
            TED es el equipo de tecnología; no es un rol de base de datos.
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-sky-700">•</span>
            Cada app tiene su manual. Hoy el de Negocios está listo.
          </li>
        </ul>
      </CollapsibleBlock>

      <CollapsibleBlock
        open={open_nav}
        onToggle={() => set_open_nav((v) => !v)}
        icon={<LayoutDashboard className="h-6 w-6 text-indigo-700" />}
        title="Cómo moverse"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <NavCallout n="1" title="Inicio" body="Tarjetas de cada app según su acceso." />
          <NavCallout n="2" title="Header" body="Manual, Reportes, Tickets y Consulta de OSI." />
          <NavCallout n="3" title="Dentro de un app" body="El menú lateral muestra las pantallas de ese módulo." />
        </div>
      </CollapsibleBlock>

      <CollapsibleBlock
        open={open_roles}
        onToggle={() => set_open_roles((v) => !v)}
        icon={<Users className="h-6 w-6 text-violet-700" />}
        title="Roles por aplicación"
      >
        <p className="mb-4 text-base text-slate-600">
          Resumen según los permisos asignados en el sistema. Abra una app para
          ver sus roles.
        </p>
        <div className="space-y-3">
          {apps.map((app) => {
            const expanded = open_app === app.app_slug;
            return (
              <div
                key={app.app_slug}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() =>
                    set_open_app(expanded ? null : app.app_slug)
                  }
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <Shield className="h-5 w-5 text-slate-700" />
                    </span>
                    <span>
                      <span className="block text-lg font-semibold text-slate-900">
                        {app.app_nombre}
                      </span>
                      <span className="text-sm text-slate-500">
                        {app.roles.length} roles
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expanded ? (
                  <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
                    {app.roles.map((role) => (
                      <article
                        key={role.role_slug}
                        className="rounded-xl border border-slate-200 p-4 shadow-sm"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold text-slate-800">
                            {role.role_nombre}
                          </h3>
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                            {role.role_slug}
                          </span>
                        </div>
                        <p className="mb-3 text-sm leading-relaxed text-slate-600">
                          {role.description}
                        </p>
                        {role.permissions.length > 0 ? (
                          <ul className="flex flex-wrap gap-1.5">
                            {role.permissions.slice(0, 8).map((perm) => (
                              <li
                                key={perm.slug}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                                title={perm.slug}
                              >
                                {perm.descripcion}
                              </li>
                            ))}
                            {role.permissions.length > 8 ? (
                              <li className="text-[11px] text-slate-400">
                                +{role.permissions.length - 8}
                              </li>
                            ) : null}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Sin permisos catalogados todavía.
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CollapsibleBlock>

      <CollapsibleBlock
        open={open_catalog}
        onToggle={() => set_open_catalog((v) => !v)}
        icon={<Briefcase className="h-6 w-6 text-emerald-700" />}
        title="Manuales por aplicación"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/negocios/manual"
            className="group rounded-xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Listo
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Negocios</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Presupuesto, OSI, facturación y cierres. Abra el hub para buscar
              por tema.
            </p>
          </Link>
          {["Administración", "Servicios Técnicos", "Calidad", "Capacitación"].map(
            (name) => (
              <div
                key={name}
                className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 opacity-80"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Próximamente
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-500">{name}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  El manual de esta app se publicará aquí.
                </p>
              </div>
            ),
          )}
        </div>
      </CollapsibleBlock>
    </div>
  );
}

function CollapsibleBlock({
  open,
  onToggle,
  icon,
  title,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
            {icon}
          </span>
          <span className="text-xl font-bold text-slate-900 sm:text-2xl">
            {title}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? <div className="border-t border-slate-100 px-5 pb-6 pt-4">{children}</div> : null}
    </section>
  );
}

function NavCallout({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
        {n}
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
