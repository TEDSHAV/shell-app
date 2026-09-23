"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  Printer,
  Edit3,
  Phone,
  MapPin,
  CreditCard,
  LayoutGrid,
  List,
  Copy,
  Check,
  Award,
  ChevronRight,
  Home,
} from "lucide-react";
import type {
  Proveedor,
  ProveedorWithDetails,
  EstadoVenezuela,
  ImpactoNivel,
  EstadoOperativoProveedor,
  DatoBancarioProveedor,
} from "@/types/proveedores";
import {
  PROVEEDOR_IMPACTO_COLORS,
  PROVEEDOR_ESTADO_LABELS,
  PROVEEDOR_ESTADO_COLORS,
} from "@/types/proveedores";
import ProveedorFormModal from "./ProveedorFormModal";
import ProveedorDetailDrawer from "./ProveedorDetailDrawer";
import ProveedorFichaModal from "./ProveedorFichaModal";

interface ProveedoresClientProps {
  userName: string;
  initialProveedores: ProveedorWithDetails[];
  estados: EstadoVenezuela[];
}

export default function ProveedoresClient({
  userName,
  initialProveedores,
  estados,
}: ProveedoresClientProps) {
  const [proveedores, setProveedores] = useState<ProveedorWithDetails[]>(initialProveedores);

  // Filters state
  const [search, setSearch] = useState("");
  const [impactoFilter, setImpactoFilter] = useState<ImpactoNivel | "todos">("todos");
  const [estadoFilter, setEstadoFilter] = useState<EstadoOperativoProveedor | "todos">("todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<ProveedorWithDetails | null>(null);
  const [selectedDrawerId, setSelectedDrawerId] = useState<number | null>(null);
  const [fichaData, setFichaData] = useState<{
    proveedor: ProveedorWithDetails | null;
    bancos: DatoBancarioProveedor[];
  } | null>(null);

  // Copied RIF tooltip feedback
  const [copiedRif, setCopiedRif] = useState<string | null>(null);

  // Zero-overhead in-memory metrics
  const metrics = useMemo(() => {
    const total = proveedores.length;
    const alto = proveedores.filter((p) => p.impacto_nivel === "alto").length;
    const bajo = proveedores.filter((p) => p.impacto_nivel === "bajo").length;
    const activos = proveedores.filter((p) => p.estado_operativo === "activo").length;
    const conBancos = proveedores.filter((p) => (p.total_cuentas_bancarias || 0) > 0).length;
    return { total, alto, bajo, activos, conBancos };
  }, [proveedores]);

  // Client-side filtering
  const filteredProveedores = useMemo(() => {
    return proveedores.filter((p) => {
      // Filter by Impact
      if (impactoFilter !== "todos" && p.impacto_nivel !== impactoFilter) {
        return false;
      }
      // Filter by Status
      if (estadoFilter !== "todos" && p.estado_operativo !== estadoFilter) {
        return false;
      }
      // Search term
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = p.nombre_razon_social?.toLowerCase().includes(q);
        const matchRif = p.rif_proveedor?.toLowerCase().includes(q);
        const matchContact = p.persona_contacto?.toLowerCase().includes(q);
        const matchPhone = p.telefono?.toLowerCase().includes(q);
        const matchEmail = p.email?.toLowerCase().includes(q);
        const matchCategory = p.producto_servicio_admin?.toLowerCase().includes(q);
        const matchState = p.estado_nombre?.toLowerCase().includes(q);
        if (!matchName && !matchRif && !matchContact && !matchPhone && !matchEmail && !matchCategory && !matchState) {
          return false;
        }
      }
      return true;
    });
  }, [proveedores, search, impactoFilter, estadoFilter]);

  const handleCopyRif = (rif: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rif);
    setCopiedRif(rif);
    setTimeout(() => setCopiedRif(null), 2000);
  };

  const handleOpenCreate = () => {
    setEditingProveedor(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prov: ProveedorWithDetails, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProveedor(prov);
    setIsFormOpen(true);
  };

  const handleFormSuccess = (saved: Proveedor) => {
    setIsFormOpen(false);
    setProveedores((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        // Updated existing
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          ...saved,
          estado_nombre: estados.find((e) => e.id === saved.id_estado_geografico)?.nombre_estado || copy[idx].estado_nombre,
        };
        return copy;
      } else {
        // Created new
        const nuevoConDetalles: ProveedorWithDetails = {
          ...saved,
          estado_nombre: estados.find((e) => e.id === saved.id_estado_geografico)?.nombre_estado || null,
          total_cuentas_bancarias: 1,
        };
        return [nuevoConDetalles, ...prev];
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0C3F69] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                SHA
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-gray-900 text-sm block leading-tight">
                  Administración
                </span>
                <span className="text-[11px] text-gray-500">Módulos Operativos</span>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="flex items-center gap-1">
              <Link
                href="/administracion"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/administracion/proveedores"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0C3F69]/10 text-[#0C3F69]"
              >
                Proveedores
              </Link>
              <Link
                href="/requisiciones"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Requisiciones
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">
              Usuario: <strong className="text-gray-800 font-semibold">{userName}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/administracion" className="hover:text-gray-800 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Administración</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <span className="font-semibold text-gray-800">Proveedores</span>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#0C3F69] shadow-2xs">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Gestión de Proveedores
                </h1>
                <p className="text-xs md:text-sm text-gray-600">
                  Registro de proveedores, control de impacto operativo, datos bancarios y trazabilidad
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Evaluación de Proveedores: Módulo en desarrollo para auditorías de calidad periódicas según normas ISO / Calidad.")}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-dashed border-gray-300 hover:border-amber-400 hover:text-amber-800 text-gray-600 rounded-xl text-xs md:text-sm font-semibold shadow-2xs transition-all cursor-pointer"
              title="Evaluación de desempeño periódica (Próximamente)"
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Evaluación</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Próximamente</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0C3F69] hover:bg-[#145C8F] text-white rounded-xl text-xs md:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proveedor</span>
            </button>
          </div>
        </div>

        {/* Lightweight KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-[11px] font-medium text-gray-500 block">Total Proveedores</span>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{metrics.total}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-red-200/80 shadow-2xs bg-gradient-to-br from-white to-red-50/30">
            <span className="text-[11px] font-medium text-red-600 block">🔴 Alto Impacto</span>
            <div className="text-xl font-bold text-red-700 mt-0.5">{metrics.alto}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-2xs bg-gradient-to-br from-white to-blue-50/30">
            <span className="text-[11px] font-medium text-blue-600 block">🔵 Bajo Impacto</span>
            <div className="text-xl font-bold text-blue-700 mt-0.5">{metrics.bajo}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs bg-gradient-to-br from-white to-emerald-50/30">
            <span className="text-[11px] font-medium text-emerald-600 block">Activos</span>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.activos}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs col-span-2 md:col-span-1">
            <span className="text-[11px] font-medium text-gray-500 block">Con Cuentas Bancarias</span>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{metrics.conBancos}</div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por razón social, RIF, contacto, rubro o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 border border-gray-200 p-1 rounded-xl bg-gray-50 self-end md:self-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-[#0C3F69] shadow-2xs" : "text-gray-500 hover:text-gray-800"
                }`}
                title="Vista de Tarjetas"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === "table" ? "bg-white text-[#0C3F69] shadow-2xs" : "text-gray-500 hover:text-gray-800"
                }`}
                title="Vista de Tabla"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
            {/* Impact Filter Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium text-[11px] mr-1">Impacto:</span>
              <button
                onClick={() => setImpactoFilter("todos")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  impactoFilter === "todos"
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setImpactoFilter("alto")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  impactoFilter === "alto"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                }`}
              >
                🔴 Alto Impacto
              </button>
              <button
                onClick={() => setImpactoFilter("bajo")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  impactoFilter === "bajo"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                }`}
              >
                🔵 Bajo Impacto
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium text-[11px] mr-1">Estado:</span>
              {(["todos", "activo", "en_revision", "suspendido", "inactivo"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setEstadoFilter(st)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                    estadoFilter === st
                      ? "bg-[#0C3F69] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {st === "todos" ? "Todos" : PROVEEDOR_ESTADO_LABELS[st]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results List */}
        {filteredProveedores.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No se encontraron proveedores</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Prueba cambiando los filtros o el término de búsqueda, o registra un nuevo proveedor.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0C3F69] text-white rounded-xl text-xs font-semibold hover:bg-[#145C8F] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Proveedor</span>
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProveedores.map((prov) => (
              <div
                key={prov.id}
                onClick={() => setSelectedDrawerId(prov.id)}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between cursor-pointer group relative overflow-hidden"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        PROVEEDOR_IMPACTO_COLORS[prov.impacto_nivel]
                      }`}
                    >
                      {prov.impacto_nivel === "alto" ? "🔴 Alto Impacto" : "🔵 Bajo Impacto"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        PROVEEDOR_ESTADO_COLORS[prov.estado_operativo]
                      }`}
                    >
                      {PROVEEDOR_ESTADO_LABELS[prov.estado_operativo]}
                    </span>
                  </div>

                  {/* Name and RIF */}
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#0C3F69] transition-colors line-clamp-2 leading-snug">
                    {prov.nombre_razon_social}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] text-gray-400">CI / RIF:</span>
                    <span className="font-mono text-xs font-semibold text-gray-700">
                      {prov.rif_proveedor || "Sin registrar"}
                    </span>
                    {prov.rif_proveedor && (
                      <button
                        onClick={(e) => handleCopyRif(prov.rif_proveedor!, e)}
                        className="p-1 text-gray-400 hover:text-[#0C3F69] rounded transition-colors"
                        title="Copiar RIF"
                      >
                        {copiedRif === prov.rif_proveedor ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Category tag */}
                  {prov.producto_servicio_admin && (
                    <div className="mt-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold tracking-wide uppercase">
                        {prov.producto_servicio_admin}
                      </span>
                    </div>
                  )}

                  {/* Contact Snippet */}
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                    {prov.persona_contacto && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-gray-400 text-[11px]">Contacto:</span>
                        <span className="font-medium text-gray-800 truncate">{prov.persona_contacto}</span>
                      </div>
                    )}
                    {prov.telefono && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-gray-700">{prov.telefono}</span>
                      </div>
                    )}
                    {prov.estado_nombre && (
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-gray-500">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {[prov.ciudad_nombre, prov.estado_nombre].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {prov.total_cuentas_bancarias ? `${prov.total_cuentas_bancarias} banco(s)` : "Sin banco"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => alert(`Evaluación de Proveedor (${prov.nombre_razon_social}): Módulo de evaluación de desempeño periódica disponible próximamente.`)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Evaluación de Proveedor (Próximamente)"
                    >
                      <Award className="w-4 h-4 text-amber-500" />
                    </button>
                    <button
                      onClick={() => setFichaData({ proveedor: prov, bancos: prov.cuentas_bancarias || [] })}
                      className="p-1.5 text-gray-400 hover:text-[#0C3F69] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Ficha PDF / Imprimir"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleOpenEdit(prov, e)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar Proveedor"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Razón Social & RIF</th>
                    <th className="py-3 px-4">Impacto</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Rubro / Categoría</th>
                    <th className="py-3 px-4">Contacto & Teléfono</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4 text-center">Bancos</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProveedores.map((prov) => (
                    <tr
                      key={prov.id}
                      onClick={() => setSelectedDrawerId(prov.id)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{prov.nombre_razon_social}</div>
                        <div className="font-mono text-gray-500 text-[11px]">{prov.rif_proveedor || "—"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            PROVEEDOR_IMPACTO_COLORS[prov.impacto_nivel]
                          }`}
                        >
                          {prov.impacto_nivel === "alto" ? "Alto" : "Bajo"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            PROVEEDOR_ESTADO_COLORS[prov.estado_operativo]
                          }`}
                        >
                          {PROVEEDOR_ESTADO_LABELS[prov.estado_operativo]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {prov.producto_servicio_admin || "General"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-800 font-medium">{prov.persona_contacto || "—"}</div>
                        <div className="text-gray-500 text-[11px]">{prov.telefono || "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {[prov.ciudad_nombre, prov.estado_nombre].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-gray-700">
                        {prov.total_cuentas_bancarias || 0}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => alert(`Evaluación de Proveedor (${prov.nombre_razon_social}): Módulo de evaluación de desempeño periódica disponible próximamente.`)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg"
                            title="Evaluación de Proveedor (Próximamente)"
                          >
                            <Award className="w-4 h-4 text-amber-500" />
                          </button>
                          <button
                            onClick={() => setFichaData({ proveedor: prov, bancos: prov.cuentas_bancarias || [] })}
                            className="p-1.5 text-gray-400 hover:text-[#0C3F69] rounded-lg"
                            title="Ficha PDF / Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(prov, e)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Formulario Crear / Editar */}
        {isFormOpen && (
          <ProveedorFormModal
            proveedor={editingProveedor}
            estados={estados}
            onClose={() => setIsFormOpen(false)}
            onSuccess={handleFormSuccess}
          />
        )}

        {/* Drawer: Detalle, Bancos, Notas, Auditoría */}
        {selectedDrawerId && (
          <ProveedorDetailDrawer
            proveedorId={selectedDrawerId}
            onClose={() => setSelectedDrawerId(null)}
            onEdit={(p) => {
              setSelectedDrawerId(null);
              setEditingProveedor(p);
              setIsFormOpen(true);
            }}
            onOpenFicha={(p, bancos) => {
              setFichaData({ proveedor: p, bancos });
            }}
          />
        )}

        {/* Modal: Ficha PDF Imprimible */}
        {fichaData && (
          <ProveedorFichaModal
            proveedor={fichaData.proveedor}
            cuentasBancarias={fichaData.bancos}
            onClose={() => setFichaData(null)}
          />
        )}
      </main>
    </div>
  );
}
