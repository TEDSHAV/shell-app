"use client";

import React, { useState, useTransition } from "react";
import {
  Star,
  Sparkles,
  Download,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Eye,
  SlidersHorizontal,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Clock,
  HeartHandshake,
} from "lucide-react";
import type {
  EncuestaConRespuesta,
  SatisfaccionKpis,
  SatisfaccionFiltros,
  EncuestaCliente,
} from "@/actions/satisfaccion-clientes";
import { getSatisfaccionDashboard } from "@/actions/satisfaccion-clientes";
import { GenerateSurveyModal } from "./GenerateSurveyModal";
import { SurveyDetailsModal } from "./SurveyDetailsModal";
import { downloadSatisfaccionPdf } from "../lib/download-satisfaccion-pdf";

interface Props {
  initialEncuestas: EncuestaConRespuesta[];
  initialKpis: SatisfaccionKpis;
  initialFilterOptions: {
    empresas: string[];
    servicios: string[];
    ejecutivos: string[];
    tipos_servicio: string[];
  };
  currentUserNombre?: string;
}

export function SatisfaccionClientesClient({
  initialEncuestas,
  initialKpis,
  initialFilterOptions,
  currentUserNombre,
}: Props) {
  const [encuestas, setEncuestas] = useState<EncuestaConRespuesta[]>(initialEncuestas);
  const [kpis, setKpis] = useState<SatisfaccionKpis>(initialKpis);
  const [filterOptions] = useState(initialFilterOptions);

  const [filtros, setFiltros] = useState<SatisfaccionFiltros>({
    estado: "todos",
    tipo_servicio: "todos",
    empresa: "",
    servicio: "",
    ejecutivo: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewDetailsEncuesta, setViewDetailsEncuesta] = useState<EncuestaConRespuesta | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const applyFilters = (newFiltros: SatisfaccionFiltros) => {
    setFiltros(newFiltros);
    startTransition(async () => {
      try {
        const res = await getSatisfaccionDashboard(newFiltros);
        setEncuestas(res.encuestas);
        setKpis(res.kpis);
      } catch (err) {
        console.error("Error refreshing dashboard with filters:", err);
      }
    });
  };

  const handleRefresh = () => {
    applyFilters(filtros);
  };

  const handleClearFilters = () => {
    const empty: SatisfaccionFiltros = {
      estado: "todos",
      tipo_servicio: "todos",
      empresa: "",
      servicio: "",
      ejecutivo: "",
      fecha_desde: "",
      fecha_hasta: "",
    };
    setSearchQuery("");
    applyFilters(empty);
  };

  const handleCopyLink = (encuesta: EncuestaConRespuesta) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/satisfaccion/${encuesta.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(encuesta.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadSatisfaccionPdf({
        encuestas,
        kpis,
        filtros,
        generadoPor: currentUserNombre || "PRISMA Calidad",
      });
    } catch (err) {
      console.error("Error generating satisfaction PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Quick client-side search query
  const filteredEncuestas = encuestas.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.nro_osi.toLowerCase().includes(q) ||
      e.nombre_empresa.toLowerCase().includes(q) ||
      e.servicio.toLowerCase().includes(q) ||
      (e.ejecutivo_negocios && e.ejecutivo_negocios.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Star className="h-5 w-5 fill-emerald-600" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Satisfacción de Clientes
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Encuestas de satisfacción de servicios: Calidad de Servicio, Atención y Soporte, y Fidelidad / NPS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            Actualizar
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || encuestas.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-sky-600" />
            {isGeneratingPdf ? "Generando PDF..." : "Exportar Reporte PDF"}
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Nueva Encuesta
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Satisfacción General Card */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Satisfacción General</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-950">
            {kpis.csat_pct}%
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Promedio: <strong>{kpis.csat_promedio}</strong> / 5.0
          </p>
        </div>

        {/* NPS Card */}
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-sky-800 font-semibold">
            <span>Fidelidad (NPS)</span>
            <Award className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-sky-950">
            {kpis.nps_score > 0 ? `+${kpis.nps_score}` : kpis.nps_score}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {kpis.nps_promoters} promotores • {kpis.nps_detractors} detractores
          </p>
        </div>

        {/* Tasa Respuesta */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Tasa de Respuesta</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis.tasa_respuesta_pct}%
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {kpis.total_respondidas} de {kpis.total_encuestas} enviadas
          </p>
        </div>

        {/* 1. Calidad del Producto o Servicio */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>1. Calidad y Requisitos</span>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis.avg_calidad} ★
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Cumplimiento especificaciones</p>
        </div>

        {/* 2. Atención y Soporte */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>2. Atención y Soporte</span>
            <HeartHandshake className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {kpis.avg_atencion} ★
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Amabilidad y respuesta</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Filtros del Indicador
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700"
          >
            Limpiar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6 text-xs">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar OSI, empresa..."
              className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Estado */}
          <select
            value={filtros.estado || "todos"}
            onChange={(e) => applyFilters({ ...filtros, estado: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none bg-white"
          >
            <option value="todos">Todos los Estados</option>
            <option value="pendiente">🟡 Pendiente de respuesta</option>
            <option value="respondida">🟢 Respondida</option>
          </select>

          {/* Tipo de Servicio */}
          <select
            value={filtros.tipo_servicio || "todos"}
            onChange={(e) => applyFilters({ ...filtros, tipo_servicio: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none bg-white"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="capacitacion">Capacitación</option>
            <option value="servicios tecnicos">Servicios Técnicos</option>
          </select>

          {/* Empresa */}
          <select
            value={filtros.empresa || ""}
            onChange={(e) => applyFilters({ ...filtros, empresa: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none bg-white"
          >
            <option value="">Todas las Empresas</option>
            {filterOptions.empresas.map((emp) => (
              <option key={emp} value={emp}>
                {emp}
              </option>
            ))}
          </select>

          {/* Ejecutivo */}
          <select
            value={filtros.ejecutivo || ""}
            onChange={(e) => applyFilters({ ...filtros, ejecutivo: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none bg-white"
          >
            <option value="">Todos los Ejecutivos</option>
            {filterOptions.ejecutivos.map((ejec) => (
              <option key={ejec} value={ejec}>
                {ejec}
              </option>
            ))}
          </select>

          {/* Date Range: Desde */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={filtros.fecha_desde || ""}
              onChange={(e) => applyFilters({ ...filtros, fecha_desde: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-none bg-white"
              title="Fecha desde"
            />
          </div>
        </div>
      </div>

      {/* Surveys List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">OSI / Fecha</th>
                <th className="py-3 px-4">Cliente / Empresa</th>
                <th className="py-3 px-4">Servicio</th>
                <th className="py-3 px-4">Ejecutivo</th>
                <th className="py-3 px-4 text-center">1. Calidad (1-5)</th>
                <th className="py-3 px-4 text-center">2. Atención (1-5)</th>
                <th className="py-3 px-4 text-center">3. Fidelidad (0-10)</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEncuestas.map((item) => {
                const isRespondida = item.estado === "respondida" && item.respuesta;
                const r = item.respuesta;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isRespondida ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Respondida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Pendiente
                        </span>
                      )}
                    </td>

                    {/* OSI */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#0c3f69]">{item.nro_osi}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.fecha_servicio || item.created_at.slice(0, 10)}
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.nombre_empresa}</div>
                      {item.cliente_contacto_nombre && (
                        <div className="text-[11px] text-slate-400">
                          {item.cliente_contacto_nombre}
                        </div>
                      )}
                    </td>

                    {/* Service */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="truncate font-medium text-slate-800" title={item.servicio}>
                        {item.servicio}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.tipo_servicio || "Servicio"}
                      </div>
                    </td>

                    {/* Executive */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {item.ejecutivo_negocios || "-"}
                    </td>

                    {/* Q1 Calidad */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isRespondida && r ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {r.calidad_servicio} / 5
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Q2 Atención */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isRespondida && r ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/50">
                          <Star className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
                          {r.atencion_soporte} / 5
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Q3 Fidelidad */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isRespondida && r ? (
                        <span
                          className={`rounded-md px-2 py-0.5 font-bold text-xs ${
                            r.fidelidad_nps >= 9
                              ? "bg-emerald-100 text-emerald-800"
                              : r.fidelidad_nps >= 7
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {r.fidelidad_nps} / 10
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {isRespondida ? (
                          <button
                            type="button"
                            onClick={() => setViewDetailsEncuesta(item)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                            title="Ver respuestas del cliente"
                          >
                            <Eye className="h-3.5 w-3.5 text-sky-600" />
                            Ver respuestas
                          </button>
                        ) : (
                          <>
                            {/* Copy Link */}
                            <button
                              type="button"
                              onClick={() => handleCopyLink(item)}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                copiedId === item.id
                                  ? "bg-emerald-600 text-white"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
                              }`}
                              title="Copiar enlace de encuesta"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  ¡Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                                  Copiar Enlace
                                </>
                              )}
                            </button>

                            {/* WhatsApp Share */}
                            <a
                              href={getWhatsAppShareUrl(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Compartir por WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                              WhatsApp
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEncuestas.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    No se encontraron encuestas registradas con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <GenerateSurveyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSurveyCreated={(newSurvey) => {
          setEncuestas((prev) => [newSurvey as EncuestaConRespuesta, ...prev]);
        }}
      />

      {/* Details Modal */}
      <SurveyDetailsModal
        encuesta={viewDetailsEncuesta}
        onClose={() => setViewDetailsEncuesta(null)}
      />
    </div>
  );
}

function getWhatsAppShareUrl(encuesta: EncuestaConRespuesta): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const surveyUrl = `${origin}/satisfaccion/${encuesta.token}`;

  const greeting = encuesta.cliente_contacto_nombre
    ? `Estimado(a) ${encuesta.cliente_contacto_nombre}`
    : `Estimado cliente de ${encuesta.nombre_empresa}`;

  const message = `${greeting}, en SHA de Venezuela valoramos su opinión sobre nuestro servicio de ${encuesta.servicio}. Le agradecemos tomarse 2 minutos para responder nuestra breve encuesta de satisfacción:\n\n${surveyUrl}\n\n¡Muchas gracias por su preferencia!`;

  const phone = encuesta.cliente_contacto_telefono
    ? encuesta.cliente_contacto_telefono.replace(/[^\d]/g, "")
    : "";

  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
