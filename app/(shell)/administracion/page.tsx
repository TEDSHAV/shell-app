import React from "react";
import Link from "next/link";
import {
  Landmark,
  ClipboardList,
  FilePlus2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Administración | PRISMA",
  description: "Panel de control y gestión administrativa de SHA de Venezuela",
};

export default async function AdministracionDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = user?.email?.split("@")[0] || "Colaborador";
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id_auth", user.id)
      .single();
    if (usuario?.nombre_apellido) {
      displayName = usuario.nombre_apellido;
    }
  }

  let totalRequisiciones = 0;
  let requisicionesPendientes = 0;

  try {
    const admin = await createAdminClient();
    const { data: reqRes } = await admin
      .from("requisiciones")
      .select("id, estatus_admin, estatus_coordinador, estatus_lider")
      .is("deleted_at", null);

    if (reqRes) {
      totalRequisiciones = reqRes.length;
      requisicionesPendientes = reqRes.filter(
        (r) =>
          r.estatus_admin === "pendiente" ||
          r.estatus_admin === "parcial" ||
          r.estatus_coordinador === "pendiente" ||
          r.estatus_lider === "pendiente"
      ).length;
    }
  } catch (err) {
    console.error("[AdministracionDashboardPage] Error fetching counts:", err);
  }

  const modules = [
    {
      id: "requisiciones",
      title: "Requisiciones",
      subtitle: "Compras y Solicitudes Operativas",
      description:
        "Emisión, aprobación y seguimiento operativo de solicitudes de compra interna, materiales y contratación de servicios.",
      badge: "Operaciones",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      accentColor: "#4F46E5",
      icon: ClipboardList,
      primaryHref: "/requisiciones",
      primaryLabel: "Mis Requisiciones",
      actions: [
        { label: "Gestión de Requisiciones", href: "/requisiciones/gestion" },
        { label: "Nueva Requisición", href: "/requisiciones/create" },
      ],
      stats: [
        { label: "En seguimiento", value: requisicionesPendientes },
        { label: "Total histórico", value: totalRequisiciones },
      ],
    },
    {
      id: "facturacion",
      title: "Facturación",
      subtitle: "Emisión Fiscal y Comprobantes",
      description:
        "Módulo integrado de facturación fiscal, control de retenciones y comprobantes, coordinado con las áreas comercial y contable.",
      badge: "Finanzas",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accentColor: "#059669",
      icon: Landmark,
      primaryHref: "/requisiciones/facturacion",
      primaryLabel: "Acceder a Facturación",
      actions: [
        { label: "Emisión Fiscal", href: "/requisiciones/facturacion" },
        { label: "Seguimiento", href: "/requisiciones/facturacion" },
      ],
      stats: [
        { label: "Emisión fiscal", value: "Activo" },
        { label: "Integración", value: "Negocios" },
      ],
    },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Administración
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Panel de control administrativo, compras y facturación
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/requisiciones/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Nueva Requisición</span>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Bienvenido al Panel de Administración, {displayName.split(" ")[0]}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Supervisa los procesos de compras internas de los distintos departamentos y accede al sistema de facturación.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center min-w-[110px]">
                <span className="block text-xl font-bold text-indigo-600">
                  {requisicionesPendientes}
                </span>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Req. Activas
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center min-w-[110px]">
                <span className="block text-xl font-bold text-emerald-600">
                  {totalRequisiciones}
                </span>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Total Req.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Módulos Principales
            </h3>
            <span className="text-xs text-slate-400">
              SHA de Venezuela
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  className="group relative bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: mod.accentColor }}
                  />

                  <div className="p-5 md:p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${mod.accentColor}15` }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: mod.accentColor }}
                          />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 leading-tight">
                            {mod.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {mod.subtitle}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${mod.badgeColor}`}
                      >
                        {mod.badge}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">
                      {mod.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {mod.stats.map((stat) => (
                        <div
                          key={stat.label}
                          className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                        >
                          <span className="block text-lg font-bold text-slate-900">
                            {stat.value}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                            {stat.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-4 border-t border-slate-100">
                      <Link
                        href={mod.primaryHref}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
                        style={{ backgroundColor: mod.accentColor }}
                      >
                        {mod.primaryLabel}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <div className="flex flex-wrap gap-1 sm:ml-auto">
                        {mod.actions.map((action) => (
                          <Link
                            key={action.label}
                            href={action.href}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            {action.label}
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
