"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  QrCode,
  UserPlus,
  Search,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  LogOut,
  FileText,
  Printer,
  Download,
  RefreshCw,
  Building2,
  Phone,
  Calendar,
  ShieldCheck,
  Eye,
  X,
  Loader2,
  RotateCcw,
  BadgeCheck,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import {
  assignVisitorResponsible,
  markVisitorExit,
  reopenVisitorEntry,
  registerVisitorManual,
  getVisitantesDashboardData,
  type VisitanteRegistro,
  type VisitantesKpis,
  type StaffOption,
} from "@/actions/visitantes";
import {
  DEFAULT_VISITANTES_CONFIG,
  MOTIVOS_VISITA_SUGERIDOS,
  type VisitantesConfig,
} from "@/features/visitantes/lib/visitantes-defaults";
import { QRPosterModal } from "./QRPosterModal";
import { VisitantesConfigModal } from "./VisitantesConfigModal";

interface VisitantesClientProps {
  initialRegistros?: VisitanteRegistro[];
  initialKpis?: VisitantesKpis;
  staffList?: StaffOption[];
  departamentos?: string[];
  currentUser?: {
    usuarioId: number | null;
    nombre: string;
    departamento: string | null;
  };
  initialConfig?: VisitantesConfig;
  configUpdatedBy?: string | null;
  configUpdatedAt?: string | null;
  initialLanIp?: string | null;
}

function formatTimeCaracas(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-VE", {
      timeZone: "America/Caracas",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

function formatDateCaracas(fechaStr: string, isoFallback?: string): string {
  if (fechaStr && /^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    const [y, m, d] = fechaStr.split("-");
    return `${d}/${m}/${y}`;
  }
  if (!isoFallback) return fechaStr || "—";
  try {
    return new Date(isoFallback).toLocaleDateString("es-VE", {
      timeZone: "America/Caracas",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return fechaStr || "—";
  }
}

function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "";
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (diffMs <= 0) return "";
  const totalMins = Math.round(diffMs / 60000);
  if (totalMins < 60) return `${totalMins} min`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function getTodayCaracas(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function getCurrentTimeInputCaracas(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Caracas",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "12";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

export function VisitantesClient({
  initialRegistros = [],
  staffList: initialStaffList = [],
  departamentos: initialDepartamentos = [],
  currentUser: initialCurrentUser = {
    usuarioId: null,
    nombre: "Usuario PRISMA",
    departamento: null,
  },
  initialConfig = DEFAULT_VISITANTES_CONFIG,
  configUpdatedBy: initialConfigUpdatedBy = null,
  configUpdatedAt: initialConfigUpdatedAt = null,
  initialLanIp = null,
}: VisitantesClientProps) {
  const [registros, setRegistros] =
    useState<VisitanteRegistro[]>(initialRegistros);
  const [staffList, setStaffList] = useState<StaffOption[]>(initialStaffList);
  const [departamentos, setDepartamentos] =
    useState<string[]>(initialDepartamentos);
  const [currentUser, setCurrentUser] = useState(initialCurrentUser);
  const [config, setConfig] = useState<VisitantesConfig>(initialConfig);
  const [configUpdatedBy, setConfigUpdatedBy] = useState<string | null>(
    initialConfigUpdatedBy ?? null,
  );
  const [configUpdatedAt, setConfigUpdatedAt] = useState<string | null>(
    initialConfigUpdatedAt ?? null,
  );
  const [canManageConfig, setCanManageConfig] = useState<boolean>(false);
  const [lanIp, setLanIp] = useState<string | null>(initialLanIp);
  const [initialLoading, setInitialLoading] = useState(
    initialRegistros.length === 0,
  );
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<
    "hoy" | "7dias" | "mes" | "todas" | "custom"
  >("todas");
  const [customDate, setCustomDate] = useState<string>(getTodayCaracas());
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "en_visita" | "sin_responsable" | "finalizada"
  >("todos");
  const [deptFilter, setDeptFilter] = useState<string>("todos");

  // Modals
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<VisitanteRegistro | null>(
    null,
  );
  const [exitTarget, setExitTarget] = useState<VisitanteRegistro | null>(null);
  const [detailTarget, setDetailTarget] = useState<VisitanteRegistro | null>(
    null,
  );

  // Quick action states
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 3500);
    },
    [],
  );

  const handleRefresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const fresh = await getVisitantesDashboardData();
      setRegistros(fresh.registros);
      if (fresh.staffList.length > 0) setStaffList(fresh.staffList);
      if (fresh.departamentos.length > 0) setDepartamentos(fresh.departamentos);
      if (fresh.currentUser.nombre) setCurrentUser(fresh.currentUser);
      if (fresh.config) setConfig(fresh.config);
      if (fresh.configUpdatedBy !== undefined) {
        setConfigUpdatedBy(fresh.configUpdatedBy ?? null);
      }
      if (fresh.configUpdatedAt !== undefined) {
        setConfigUpdatedAt(fresh.configUpdatedAt ?? null);
      }
      setCanManageConfig(Boolean(fresh.canManageConfig));
      if (fresh.lanIp) {
        setLanIp(fresh.lanIp);
      }
    } catch {
      // ignore on silent refresh
    } finally {
      setInitialLoading(false);
      if (!silent) setRefreshing(false);
    }
  }, []);

  // Load initial data on mount + poll every 30s so new QR registrations show up automatically
  useEffect(() => {
    void handleRefresh(true);
    const interval = setInterval(() => {
      void handleRefresh(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  const todayCaracas = useMemo(() => getTodayCaracas(), []);

  // Live KPIs computed from state
  const kpis = useMemo<VisitantesKpis>(() => {
    return {
      en_planta_ahora: registros.filter((r) => r.estado === "en_visita").length,
      visitas_hoy: registros.filter((r) => r.fecha === todayCaracas).length,
      sin_responsable_activo: registros.filter(
        (r) => r.estado === "en_visita" && !r.responsable_nombre,
      ).length,
      finalizadas_hoy: registros.filter(
        (r) => r.fecha === todayCaracas && r.estado === "finalizada",
      ).length,
      total_registros: registros.length,
    };
  }, [registros, todayCaracas]);

  // Filtered records
  const filteredRegistros = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const currentMonthPrefix = todayCaracas.slice(0, 7);

    return registros.filter((r) => {
      // Date filter
      if (dateFilter === "hoy" && r.fecha !== todayCaracas) return false;
      if (dateFilter === "7dias" && r.fecha < sevenDaysAgo) return false;
      if (dateFilter === "mes" && !r.fecha.startsWith(currentMonthPrefix))
        return false;
      if (dateFilter === "custom" && customDate && r.fecha !== customDate)
        return false;

      // Status filter
      if (statusFilter === "en_visita" && r.estado !== "en_visita")
        return false;
      if (
        statusFilter === "sin_responsable" &&
        (r.estado !== "en_visita" || Boolean(r.responsable_nombre))
      ) {
        return false;
      }
      if (statusFilter === "finalizada" && r.estado !== "finalizada")
        return false;

      // Department filter
      if (deptFilter !== "todos") {
        const deptMatch =
          r.departamento_destino === deptFilter ||
          r.responsable_departamento === deptFilter;
        if (!deptMatch) return false;
      }

      // Search query
      if (q) {
        const haystack = [
          r.nombre_apellido,
          `${r.nacionalidad}-${r.cedula}`,
          r.cedula,
          r.telefono,
          r.empresa_procedencia,
          r.motivo_visita,
          r.departamento_destino,
          r.persona_a_visitar,
          r.responsable_nombre,
          r.responsable_departamento,
          r.nro_pase,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    registros,
    search,
    dateFilter,
    customDate,
    statusFilter,
    deptFilter,
    todayCaracas,
  ]);

  // 1-click self-assignment ("Asignarme")
  const handleQuickAssignMe = async (visita: VisitanteRegistro) => {
    setBusyId(visita.id);
    const res = await assignVisitorResponsible(visita.id, {
      responsable_usuario_id: currentUser.usuarioId,
      responsable_nombre: currentUser.nombre,
      responsable_departamento:
        currentUser.departamento || visita.departamento_destino || null,
    });
    setBusyId(null);

    if (res.ok && res.registro) {
      setRegistros((prev) =>
        prev.map((item) => (item.id === visita.id ? res.registro! : item)),
      );
      showToast(
        "success",
        `Te has asignado como responsable de ${visita.nombre_apellido}`,
      );
    } else {
      showToast("error", res.error || "No se pudo asignar el visitante.");
    }
  };

  // Export CSV / Excel compatible
  const handleExportCsv = () => {
    const headers = [
      "ID",
      "Fecha",
      "Nombre y Apellido",
      "Cédula",
      "Teléfono",
      "Empresa / Procedencia",
      "Departamento Destino",
      "Persona Buscada",
      "Motivo de Visita",
      "Hora Entrada",
      "Descargo Aceptado",
      "Firma Entrada",
      "Responsable SHA",
      "Depto. Responsable",
      "Hora Salida",
      "Confirmación / Firma Salida",
      "Estado",
      "Nro Pase",
      "Observaciones",
    ];

    const escapeCsv = (val: unknown) => {
      const s = val == null ? "" : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = filteredRegistros.map((r) => [
      r.id,
      formatDateCaracas(r.fecha, r.hora_entrada),
      r.nombre_apellido,
      `${r.nacionalidad}-${r.cedula}`,
      r.telefono,
      r.empresa_procedencia || "Particular",
      r.departamento_destino || "",
      r.persona_a_visitar || "",
      r.motivo_visita || "",
      formatTimeCaracas(r.hora_entrada),
      r.acepto_descargo ? "Sí" : "No",
      r.firma_entrada ? "Firmado digitalmente" : "Manual",
      r.responsable_nombre || "Sin asignar",
      r.responsable_departamento || "",
      formatTimeCaracas(r.hora_salida),
      r.salida_registrada_por_nombre
        ? `Confirmado por ${r.salida_registrada_por_nombre}`
        : "",
      r.estado === "en_visita" ? "En oficina" : "Finalizada",
      r.nro_pase || "",
      r.observaciones || "",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.map(escapeCsv).join(";"), ...rows.map((row) => row.map(escapeCsv).join(";"))].join(
        "\r\n",
      );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `control-visitantes-sha-${todayCaracas}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Printable Physical Control Sheet (Planilla de Control de Visitantes)
  const handlePrintSheet = () => {
    const printWin = window.open("", "_blank", "width=1100,height=800");
    if (!printWin) return;

    const rowsHtml = filteredRegistros
      .map(
        (r, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${formatDateCaracas(r.fecha, r.hora_entrada)}</td>
        <td><strong>${r.nombre_apellido}</strong><br/><span style="color:#64748b;font-size:10px;">${r.empresa_procedencia || "Particular"}</span></td>
        <td>${r.nacionalidad}-${r.cedula}</td>
        <td>${r.telefono}</td>
        <td>${formatTimeCaracas(r.hora_entrada)}</td>
        <td style="text-align:center;">
          ${
            r.firma_entrada
              ? `<img src="${r.firma_entrada}" style="max-height:34px;max-width:95px;object-fit:contain;" />`
              : `<span style="font-size:10px;color:#64748b;">Aceptado</span>`
          }
        </td>
        <td>${r.responsable_nombre || "—"}<br/><span style="color:#64748b;font-size:10px;">${r.responsable_departamento || r.departamento_destino || ""}</span></td>
        <td>${formatTimeCaracas(r.hora_salida)}</td>
        <td>${
          r.salida_registrada_por_nombre
            ? `<span style="font-size:10px;">Confirmado por:<br/><strong>${r.salida_registrada_por_nombre}</strong></span>`
            : ""
        }</td>
      </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Planilla de Control de Visitantes - SHA de Venezuela</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; color: #0f172a; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0c3f69; padding-bottom: 10px; margin-bottom: 14px; }
    .header h1 { font-size: 18px; color: #0c3f69; margin: 0; }
    .header p { font-size: 11px; color: #475569; margin: 2px 0 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: middle; }
    th { background: #0c3f69; color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>SHA DE VENEZUELA, C.A. — REGISTRO Y CONTROL DE VISITANTES</h1>
      <p>Sistema Integrado de Gestión • Impreso el ${new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" })}</p>
    </div>
    <div style="text-align:right;font-size:11px;">
      <strong>Total registros:</strong> ${filteredRegistros.length}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:32px;">#</th>
        <th style="width:75px;">Fecha</th>
        <th>Nombre y Apellido / Procedencia</th>
        <th style="width:88px;">Cédula</th>
        <th style="width:92px;">Teléfono</th>
        <th style="width:74px;">Hora Entrada</th>
        <th style="width:105px;text-align:center;">Firma Entrada</th>
        <th>Responsable SHA</th>
        <th style="width:74px;">Hora Salida</th>
        <th style="width:120px;">Firma / Cierre Salida</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="10" style="text-align:center;padding:20px;">Sin registros para mostrar</td></tr>'}
    </tbody>
  </table>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="p-6 w-full max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[120] flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Control y Registro de Visitantes
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Recepción digital por código QR, aceptación de descargo, asignación de responsable y registro de salida.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0c3f69] px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#092f50] transition-colors"
          >
            <QrCode className="h-4 w-4" />
            QR de Recepción
          </button>

          <button
            type="button"
            onClick={() => setManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Registrar Visitante
          </button>

          {canManageConfig && (
            <button
              type="button"
              onClick={() => setConfigModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              Descargo / Normas
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintSheet}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            title="Imprimir planilla oficial con firmas"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Imprimir Planilla
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            title="Exportar a Excel / CSV"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => handleRefresh(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Actualizar lista"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin text-teal-600" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() =>
            setStatusFilter(
              statusFilter === "en_visita" ? "todos" : "en_visita",
            )
          }
          className={`text-left rounded-xl border p-4 transition-all ${
            statusFilter === "en_visita"
              ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
              : "border-slate-200 bg-white hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              En Oficina Ahora
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.en_planta_ahora}
            </span>
            {kpis.en_planta_ahora > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                activos
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Visitantes en las instalaciones de SHA de Venezuela, C.A.
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(
              statusFilter === "sin_responsable" ? "todos" : "sin_responsable",
            )
          }
          className={`text-left rounded-xl border p-4 transition-all ${
            statusFilter === "sin_responsable"
              ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20"
              : "border-slate-200 bg-white hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sin Responsable Asignado
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.sin_responsable_activo}
            </span>
            {kpis.sin_responsable_activo > 0 && (
              <span className="text-xs font-medium text-amber-700">
                por atender
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Pendientes por asignar personal responsable
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setDateFilter(dateFilter === "hoy" ? "todas" : "hoy");
            setStatusFilter("todos");
          }}
          className={`text-left rounded-xl border p-4 transition-all ${
            dateFilter === "hoy"
              ? "border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20"
              : "border-slate-200 bg-white hover:border-sky-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Visitas de Hoy
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.visitas_hoy}
            </span>
            <span className="text-xs text-slate-500">
              ({kpis.finalizadas_hoy} salidas)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Total de ingresos registrados el día de hoy
          </p>
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Histórico / Periodo
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {filteredRegistros.length}
            </span>
            <span className="text-xs text-slate-400">
              de {kpis.total_registros}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Registros con descargo y trazabilidad de auditoría
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula, teléfono, empresa o responsable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Date Filter */}
          <div className="md:col-span-3 flex gap-2">
            <select
              value={dateFilter}
              onChange={(e) =>
                setDateFilter(
                  e.target.value as
                    | "hoy"
                    | "7dias"
                    | "mes"
                    | "todas"
                    | "custom",
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="todas">Todas las fechas</option>
              <option value="hoy">Solo hoy ({formatDateCaracas(todayCaracas)})</option>
              <option value="7dias">Últimos 7 días</option>
              <option value="mes">Este mes</option>
              <option value="custom">Fecha específica...</option>
            </select>
            {dateFilter === "custom" && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
              />
            )}
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as
                    | "todos"
                    | "en_visita"
                    | "sin_responsable"
                    | "finalizada",
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="todos">Estado: Todos</option>
              <option value="en_visita">En oficina (Activos)</option>
              <option value="sin_responsable">Sin responsable</option>
              <option value="finalizada">Salidas registradas</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="md:col-span-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="todos">Depto: Todos</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Visitors Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Fecha / Entrada</th>
                <th className="px-4 py-3 text-left">Visitante (Nombre, C.I., Teléfono)</th>
                <th className="px-4 py-3 text-left">Motivo / Destino</th>
                <th className="px-4 py-3 text-center">Descargo / Normas</th>
                <th className="px-4 py-3 text-left">Responsable SHA (Asignación)</th>
                <th className="px-4 py-3 text-left">Hora Salida / Cierre</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {initialLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center text-slate-400"
                  >
                    <Loader2 className="h-7 w-7 mx-auto mb-2 animate-spin text-teal-600" />
                    <p className="text-sm font-medium text-slate-600">
                      Cargando registro de visitantes...
                    </p>
                  </td>
                </tr>
              ) : filteredRegistros.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center text-slate-400"
                  >
                    <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium text-slate-600">
                      No se encontraron visitas con los filtros seleccionados
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Los visitantes que escaneen el código QR aparecerán aquí automáticamente.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRegistros.map((visita) => {
                  const isActive = visita.estado === "en_visita";
                  const isBusy = busyId === visita.id;
                  const duration = formatDuration(
                    visita.hora_entrada,
                    visita.hora_salida,
                  );

                  return (
                    <tr
                      key={visita.id}
                      className={`transition-colors ${
                        isActive
                          ? "bg-white hover:bg-teal-50/20"
                          : "bg-slate-50/40 hover:bg-slate-50"
                      }`}
                    >
                      {/* 1. Fecha / Hora Entrada */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {formatTimeCaracas(visita.hora_entrada)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateCaracas(visita.fecha, visita.hora_entrada)}
                        </div>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            visita.metodo_registro === "qr"
                              ? "bg-sky-50 text-sky-700 border border-sky-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {visita.metodo_registro === "qr"
                            ? "QR Digital"
                            : "Manual"}
                        </span>
                      </td>

                      {/* 2. Visitante */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-semibold text-slate-900">
                          {visita.nombre_apellido}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span className="font-mono font-medium text-slate-700">
                            {visita.nacionalidad}-{visita.cedula}
                          </span>
                          {visita.telefono && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {visita.telefono}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{visita.empresa_procedencia || "Particular"}</span>
                          {visita.nro_pase && (
                            <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                              Pase #{visita.nro_pase}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Motivo / Destino */}
                      <td className="px-4 py-3.5 align-top max-w-[210px]">
                        {visita.departamento_destino && (
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 mb-1">
                            {visita.departamento_destino}
                          </span>
                        )}
                        {visita.persona_a_visitar && (
                          <div className="text-xs text-slate-700">
                            <span className="text-slate-400">Busca a:</span>{" "}
                            <span className="font-medium">
                              {visita.persona_a_visitar}
                            </span>
                          </div>
                        )}
                        {visita.motivo_visita ? (
                          <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                            {visita.motivo_visita}
                          </div>
                        ) : (
                          !visita.departamento_destino &&
                          !visita.persona_a_visitar && (
                            <span className="text-xs text-slate-400">—</span>
                          )
                        )}
                      </td>

                      {/* 4. Descargo / Normas */}
                      <td className="px-4 py-3.5 align-top text-center">
                        <button
                          type="button"
                          onClick={() => setDetailTarget(visita)}
                          className="group inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                          title="Ver respaldo de normas y descargo aceptado"
                        >
                          <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Aceptado
                        </button>
                      </td>

                      {/* 5. Responsable SHA (Asignación) */}
                      <td className="px-4 py-3.5 align-top">
                        {visita.responsable_nombre ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                                {visita.responsable_nombre}
                              </span>
                            </div>
                            {visita.responsable_departamento && (
                              <span className="inline-block rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200/60">
                                {visita.responsable_departamento}
                              </span>
                            )}
                            <div>
                              <button
                                type="button"
                                onClick={() => setAssignTarget(visita)}
                                className="text-[11px] font-medium text-teal-700 hover:underline"
                              >
                                Cambiar responsable
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                              Sin asignar
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickAssignMe(visita)}
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                title={`Asignarme (${currentUser.nombre})`}
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3 w-3" />
                                )}
                                Asignarme
                              </button>
                              <button
                                type="button"
                                onClick={() => setAssignTarget(visita)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Elegir...
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 6. Hora Salida / Estado */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {isActive ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              En oficina
                            </span>
                            <div>
                              <button
                                type="button"
                                onClick={() => setExitTarget(visita)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                              >
                                <LogOut className="h-3 w-3" />
                                Marcar Salida
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {formatTimeCaracas(visita.hora_salida)}
                              {duration && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  {duration}
                                </span>
                              )}
                            </div>
                            {visita.salida_registrada_por_nombre && (
                              <div className="text-[11px] text-slate-500">
                                Salida por:{" "}
                                <strong className="text-slate-700">
                                  {visita.salida_registrada_por_nombre}
                                </strong>
                              </div>
                            )}
                            {visita.observaciones && (
                              <div
                                className="text-[11px] text-slate-500 truncate max-w-[160px]"
                                title={visita.observaciones}
                              >
                                Nota: {visita.observaciones}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. Acciones */}
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetailTarget(visita)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Printable QR Poster */}
      <QRPosterModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        sedeNombre={config.sede_nombre}
        lanIp={lanIp}
      />

      {/* Modal 2: Disclaimer Config */}
      <VisitantesConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        initialConfig={config}
        updatedBy={configUpdatedBy}
        updatedAt={configUpdatedAt}
        onSaved={(newCfg) => {
          setConfig(newCfg);
          showToast("success", "Descargo y configuración actualizados.");
        }}
      />

      {/* Modal 3: Assign Responsible Staff */}
      {assignTarget && (
        <AssignResponsibleModal
          visita={assignTarget}
          staffList={staffList}
          departamentos={departamentos}
          currentUser={currentUser}
          onClose={() => setAssignTarget(null)}
          onAssigned={(updated) => {
            setRegistros((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            );
            setAssignTarget(null);
            showToast(
              "success",
              `Responsable asignado a ${updated.nombre_apellido}`,
            );
          }}
        />
      )}

      {/* Modal 4: Mark Visitor Exit */}
      {exitTarget && (
        <MarkExitModal
          visita={exitTarget}
          currentUser={currentUser}
          onClose={() => setExitTarget(null)}
          onCompleted={(updated) => {
            setRegistros((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            );
            setExitTarget(null);
            showToast(
              "success",
              `Salida registrada para ${updated.nombre_apellido}`,
            );
          }}
        />
      )}

      {/* Modal 5: Manual Visitor Registration */}
      {manualModalOpen && (
        <ManualRegisterModal
          staffList={staffList}
          departamentos={departamentos}
          currentUser={currentUser}
          onClose={() => setManualModalOpen(false)}
          onCreated={(created) => {
            setRegistros((prev) => [created, ...prev]);
            setManualModalOpen(false);
            showToast(
              "success",
              `Visitante ${created.nombre_apellido} registrado correctamente.`,
            );
          }}
        />
      )}

      {/* Modal 6: Audit / Detail View */}
      {detailTarget && (
        <VisitorDetailModal
          visita={detailTarget}
          onClose={() => setDetailTarget(null)}
          onReopened={(updated) => {
            setRegistros((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            );
            setDetailTarget(updated);
            showToast("success", "Visita reabierta como activa en oficina.");
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
 * Sub-Modal: Assign Responsible Staff
 * ========================================================================== */
function AssignResponsibleModal({
  visita,
  staffList,
  departamentos,
  currentUser,
  onClose,
  onAssigned,
}: {
  visita: VisitanteRegistro;
  staffList: StaffOption[];
  departamentos: string[];
  currentUser: {
    usuarioId: number | null;
    nombre: string;
    departamento: string | null;
  };
  onClose: () => void;
  onAssigned: (updated: VisitanteRegistro) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    visita.responsable_usuario_id ?? currentUser.usuarioId,
  );
  const [responsableNombre, setResponsableNombre] = useState<string>(
    visita.responsable_nombre || currentUser.nombre,
  );
  const [responsableDept, setResponsableDept] = useState<string>(
    visita.responsable_departamento ||
      currentUser.departamento ||
      visita.departamento_destino ||
      "",
  );
  const [nroPase, setNroPase] = useState<string>(visita.nro_pase || "");
  const [observaciones, setObservaciones] = useState<string>(
    visita.observaciones || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectStaff = (userIdStr: string) => {
    if (!userIdStr) {
      setSelectedUserId(null);
      return;
    }
    const id = Number(userIdStr);
    setSelectedUserId(id);
    const found = staffList.find((s) => s.id === id);
    if (found) {
      setResponsableNombre(found.nombre_apellido);
      if (found.departamento_nombre) {
        setResponsableDept(found.departamento_nombre);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await assignVisitorResponsible(visita.id, {
      responsable_usuario_id: selectedUserId,
      responsable_nombre: responsableNombre,
      responsable_departamento: responsableDept || null,
      nro_pase: nroPase || null,
      observaciones: observaciones || null,
    });
    setSaving(false);

    if (res.ok && res.registro) {
      onAssigned(res.registro);
    } else {
      setError(res.error || "Error al guardar la asignación.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Asignar Responsable de Visita
            </h3>
            <p className="text-xs text-slate-500">
              Visitante: <strong>{visita.nombre_apellido}</strong> ({visita.nacionalidad}-{visita.cedula})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seleccionar del Directorio PRISMA
            </label>
            <select
              value={selectedUserId ?? ""}
              onChange={(e) => handleSelectStaff(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">-- Seleccionar colaborador o escribir abajo --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre_apellido}
                  {s.departamento_nombre ? ` (${s.departamento_nombre})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Responsable <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={responsableNombre}
              onChange={(e) => setResponsableNombre(e.target.value)}
              placeholder="Nombre y apellido del responsable"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Departamento
              </label>
              <select
                value={responsableDept}
                onChange={(e) => setResponsableDept(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="">Sin especificar</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                N° de Pase / Carnet (opc.)
              </label>
              <input
                type="text"
                value={nroPase}
                onChange={(e) => setNroPase(e.target.value)}
                placeholder="Ej. V-04"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones / Notas
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales de recepción o auditoría..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              Guardar Asignación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
 * Sub-Modal: Mark Visitor Exit (Registered by Responsible User)
 * ========================================================================== */
function MarkExitModal({
  visita,
  currentUser,
  onClose,
  onCompleted,
}: {
  visita: VisitanteRegistro;
  currentUser: {
    usuarioId: number | null;
    nombre: string;
    departamento: string | null;
  };
  onClose: () => void;
  onCompleted: (updated: VisitanteRegistro) => void;
}) {
  const [exitTimeStr, setExitTimeStr] = useState<string>(
    getCurrentTimeInputCaracas(),
  );
  const [observaciones, setObservaciones] = useState<string>(
    visita.observaciones || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Build ISO timestamp from visita.fecha (or today Caracas) + exitTimeStr in America/Caracas (-04:00)
    let horaSalidaIso = new Date().toISOString();
    if (exitTimeStr && /^\d{2}:\d{2}$/.test(exitTimeStr)) {
      const baseDate = visita.fecha || getTodayCaracas();
      const parsed = new Date(`${baseDate}T${exitTimeStr}:00-04:00`);
      if (!Number.isNaN(parsed.getTime())) {
        horaSalidaIso = parsed.toISOString();
      }
    }

    const res = await markVisitorExit(visita.id, {
      hora_salida: horaSalidaIso,
      observaciones: observaciones.trim() || null,
    });
    setSaving(false);

    if (res.ok && res.registro) {
      onCompleted(res.registro);
    } else {
      setError(res.error || "No se pudo registrar la salida.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registrar Salida del Visitante
              </h3>
              <p className="text-xs text-slate-500">
                Cierre de visita en sistema por el personal responsable
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
            <div className="font-bold text-slate-900 text-sm">
              {visita.nombre_apellido}
            </div>
            <div className="text-slate-600">
              C.I. {visita.nacionalidad}-{visita.cedula} • Entrada:{" "}
              <strong>{formatTimeCaracas(visita.hora_entrada)}</strong>
            </div>
            <div className="text-slate-600">
              Responsable:{" "}
              <strong>
                {visita.responsable_nombre ||
                  `${currentUser.nombre} (se asignará al cerrar)`}
              </strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hora de Salida
            </label>
            <input
              type="time"
              required
              value={exitTimeStr}
              onChange={(e) => setExitTimeStr(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-teal-600 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Quedará constancia de cierre por <strong>{currentUser.nombre}</strong> para auditoría.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones de salida (opcional)
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Entregó pase de visitante, retiró documentos, etc."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              Confirmar Salida
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
 * Sub-Modal: Manual Visitor Registration (From Internal UI)
 * ========================================================================== */
function ManualRegisterModal({
  staffList,
  departamentos,
  currentUser,
  onClose,
  onCreated,
}: {
  staffList: StaffOption[];
  departamentos: string[];
  currentUser: {
    usuarioId: number | null;
    nombre: string;
    departamento: string | null;
  };
  onClose: () => void;
  onCreated: (created: VisitanteRegistro) => void;
}) {
  const [nacionalidad, setNacionalidad] = useState<"V" | "E">("V");
  const [cedula, setCedula] = useState("");
  const [nombreApellido, setNombreApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoOtro, setMotivoOtro] = useState("");
  const [nroPase, setNroPase] = useState("");
  const [responsableId, setResponsableId] = useState<number | null>(
    currentUser.usuarioId,
  );
  const [responsableNombre, setResponsableNombre] = useState(
    currentUser.nombre,
  );
  const [responsableDept, setResponsableDept] = useState(
    currentUser.departamento || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStaffChange = (idStr: string) => {
    if (!idStr) {
      setResponsableId(null);
      return;
    }
    const id = Number(idStr);
    setResponsableId(id);
    const st = staffList.find((s) => s.id === id);
    if (st) {
      setResponsableNombre(st.nombre_apellido);
      if (st.departamento_nombre) setResponsableDept(st.departamento_nombre);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await registerVisitorManual({
      nacionalidad,
      cedula,
      nombre_apellido: nombreApellido,
      telefono: telefono.trim() || null,
      empresa_procedencia: empresa || "Particular",
      motivo_visita:
        (motivo === "__otro__" ? motivoOtro : motivo).trim() || null,
      departamento_destino: responsableDept || null,
      nro_pase: nroPase || null,
      responsable_usuario_id: responsableId,
      responsable_nombre: responsableNombre || null,
      responsable_departamento: responsableDept || null,
      acepto_descargo: true,
    });
    setSaving(false);

    if (res.ok && res.registro) {
      onCreated(res.registro);
    } else {
      setError(res.error || "Error al registrar visitante.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registrar Visitante Manualmente
              </h3>
              <p className="text-xs text-slate-500">
                Para visitantes sin teléfono o registrados directamente en recepción
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cédula <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <select
                  value={nacionalidad}
                  onChange={(e) => setNacionalidad(e.target.value as "V" | "E")}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm font-semibold"
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="12345678"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre y Apellido <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nombre completo"
                value={nombreApellido}
                onChange={(e) => setNombreApellido(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono <span className="text-slate-400 font-normal">(opc.)</span>
              </label>
              <input
                type="text"
                placeholder="0414-0000000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Empresa / Procedencia
              </label>
              <input
                type="text"
                placeholder="Particular o Empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                N° de Pase
              </label>
              <input
                type="text"
                placeholder="Ej. V-01"
                value={nroPase}
                onChange={(e) => setNroPase(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo de la Visita
            </label>
            <div className="relative">
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className={`w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm ${
                  motivo ? "text-slate-900" : "text-slate-400"
                }`}
              >
                <option value="">Seleccione el motivo...</option>
                {MOTIVOS_VISITA_SUGERIDOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="__otro__">Otro motivo (especifique)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            {motivo === "__otro__" && (
              <input
                type="text"
                placeholder="Especifique el motivo"
                value={motivoOtro}
                onChange={(e) => setMotivoOtro(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsable SHA Asignado
              </label>
              <select
                value={responsableId ?? ""}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
              >
                <option value="">-- Seleccionar del directorio --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre_apellido}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={responsableNombre}
                onChange={(e) => setResponsableNombre(e.target.value)}
                placeholder="O escriba el nombre del responsable"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Departamento Responsable
              </label>
              <select
                value={responsableDept}
                onChange={(e) => setResponsableDept(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
              >
                <option value="">Sin especificar</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Registrar Entrada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
 * Sub-Modal: Visitor Audit Detail & Signature Viewer
 * ========================================================================== */
function VisitorDetailModal({
  visita,
  onClose,
  onReopened,
}: {
  visita: VisitanteRegistro;
  onClose: () => void;
  onReopened: (updated: VisitanteRegistro) => void;
}) {
  const [reopening, setReopening] = useState(false);

  const handleReopen = async () => {
    setReopening(true);
    const res = await reopenVisitorEntry(visita.id);
    setReopening(false);
    if (res.ok && res.registro) {
      onReopened(res.registro);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shrink-0">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Ficha de Control y Auditoría #{visita.id}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {visita.nombre_apellido}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <span className="text-slate-400 block">Cédula</span>
              <span className="font-bold text-slate-900 text-sm">
                {visita.nacionalidad}-{visita.cedula}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Teléfono</span>
              <span className="font-semibold text-slate-900 text-sm">
                {visita.telefono}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Empresa / Procedencia</span>
              <span className="font-semibold text-slate-900 text-sm">
                {visita.empresa_procedencia || "Particular"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Fecha</span>
              <span className="font-semibold text-slate-900">
                {formatDateCaracas(visita.fecha, visita.hora_entrada)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Hora de Entrada</span>
              <span className="font-semibold text-slate-900">
                {formatTimeCaracas(visita.hora_entrada)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Hora de Salida</span>
              <span className="font-semibold text-slate-900">
                {formatTimeCaracas(visita.hora_salida)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" /> Destino y Motivo
              </span>
              <p className="text-slate-700">
                <strong>Departamento:</strong>{" "}
                {visita.departamento_destino || "No especificado"}
              </p>
              <p className="text-slate-700">
                <strong>Persona buscada:</strong>{" "}
                {visita.persona_a_visitar || "No especificada"}
              </p>
              <p className="text-slate-700">
                <strong>Motivo:</strong>{" "}
                {visita.motivo_visita || "No especificado"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" /> Responsable Interno SHA
              </span>
              <p className="text-slate-700">
                <strong>Responsable:</strong>{" "}
                {visita.responsable_nombre || "Sin asignar"}
              </p>
              <p className="text-slate-700">
                <strong>Departamento:</strong>{" "}
                {visita.responsable_departamento || "—"}
              </p>
              {visita.salida_registrada_por_nombre && (
                <p className="text-slate-700">
                  <strong>Salida marcada por:</strong>{" "}
                  {visita.salida_registrada_por_nombre}
                </p>
              )}
              {visita.observaciones && (
                <p className="text-slate-700">
                  <strong>Observaciones:</strong> {visita.observaciones}
                </p>
              )}
            </div>
          </div>

          {/* Snapshot del descargo aceptado */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Respaldo de Texto de Descargo Aceptado
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Descargo aceptado
              </span>
            </div>
            {visita.texto_descargo_aceptado ? (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {visita.texto_descargo_aceptado}
              </div>
            ) : (
              <p className="text-slate-400 italic">
                Descargo estándar aceptado al momento del ingreso.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50">
          {visita.estado === "finalizada" ? (
            <button
              type="button"
              disabled={reopening}
              onClick={handleReopen}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reabrir visita (deshacer salida)
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              Método: {visita.metodo_registro.toUpperCase()}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0c3f69] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#092f50]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
