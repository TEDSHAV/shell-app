import React from "react";
import Link from "next/link";
import {
  Landmark,
  ClipboardList,
  Building2,
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

  // Fetch summary counts for the dashboard
  let totalProveedores = 0;
  let totalProveedoresAltos = 0;
  let totalRequisiciones = 0;
  let requisicionesPendientes = 0;

  try {
    const admin = await createAdminClient();
    const [provRes, reqRes] = await Promise.all([
      admin.from("proveedores").select("id, impacto_nivel, estado_operativo"),
      admin.from("requisiciones").select("id, estatus_admin, estatus_coordinador, estatus_lider").is("deleted_at", null),
    ]);

    if (provRes.data) {
      totalProveedores = provRes.data.length;
      totalProveedoresAltos = provRes.data.filter((p) => p.impacto_nivel === "alto").length;
    }

    if (reqRes.data) {
      totalRequisiciones = reqRes.data.length;
      requisicionesPendientes = reqRes.data.filter(
        (r) =>
          r.estatus_admin === "pendiente" ||
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
      id: "proveedores",
      title: "Gestión de Proveedores",
      subtitle: "Registro y Datos Bancarios",
      description:
        "Directorio corporativo de proveedores, clasificación por impacto operativo (alto/bajo), cuentas bancarias y trazabilidad de cambios.",
      badge: "Adquisiciones",
      badgeColor: "bg-blue-50 text-[#0C3F69] border-blue-200",
      accentColor: "#0C3F69",
      icon: Building2,
      primaryHref: "/administracion/proveedores",
      primaryLabel: "Ver Proveedores",
      actions: [
        { label: "Directorio General", href: "/administracion/proveedores" },
        { label: "Clasificación de Impacto", href: "/administracion/proveedores?impacto=alto" },
      ],
      stats: [
        { label: "Proveedores activos", value: totalProveedores },
        { label: "Alto impacto", value: totalProveedoresAltos },
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Administración
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Panel de control administrativo, compras, gestión de proveedores y facturación
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

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Welcome & Quick KPI Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Bienvenido al Panel de Administración, {displayName.split(" ")[0]}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Supervisa los procesos de compras internas de los distintos departamentos, administra la cartera de proveedores corporativos y accede al sistema de facturación.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center min-w-[110px]">
                <span className="block text-xl font-bold text-[#0C3F69]">
                  {totalProveedores}
                </span>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Proveedores
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center min-w-[110px]">
                <span className="block text-xl font-bold text-indigo-600">
                  {requisicionesPendientes}
                </span>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Req. Activas
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center min-w-[110px] col-span-2 sm:col-span-1">
                <span className="block text-xl font-bold text-emerald-600">
                  3
                </span>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Módulos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Módulos Principales
            </h3>
            <span className="text-xs text-slate-400">
              SHA de Venezuela
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group overflow-hidden relative"
                >
                  <div className="p-6">
                    {/* Header of card */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: mod.accentColor }}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${mod.badgeColor}`}
                      >
                        {mod.badge}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-[#0C3F69] transition-colors">
                      {mod.title}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {mod.subtitle}
                    </p>
                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                      {mod.description}
                    </p>

                    {/* Stats pills */}
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      {mod.stats.map((s, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-2 text-center">
                          <span className="block font-bold text-slate-800 text-sm">
                            {s.value}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-6 pt-0 mt-auto space-y-2">
                    <Link
                      href={mod.primaryHref}
                      className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-xs"
                      style={{ backgroundColor: mod.accentColor }}
                    >
                      <span>{mod.primaryLabel}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>

                    {mod.actions && mod.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {mod.actions.map((act, idx) => (
                          <Link
                            key={idx}
                            href={act.href}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-[#0C3F69] hover:bg-slate-100 px-2 py-1 rounded-md transition-colors"
                          >
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                            <span>{act.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
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
