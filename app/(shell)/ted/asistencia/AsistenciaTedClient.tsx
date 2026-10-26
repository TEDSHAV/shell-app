"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Mail,
  Plus,
  Send,
  Settings,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addAsistenciaDestinatarioAction,
  markManualAttendanceAction,
  removeAsistenciaDestinatarioAction,
  sendManualAsistenciaReportAction,
  updateAsistenciaConfigAction,
} from "@/actions/asistencia";
import type {
  AsistenciaConfigRow,
  AsistenciaDestinatario,
  AsistenciaReporteLogRow,
} from "@/lib/asistencia/report-service";
import {
  buildAsistenciaReportEmail,
  type AsistenciaSnapshot,
} from "@/lib/asistencia/email-template";
import {
  formatCaracasTime12h,
  formatCutoffLabel,
  formatDdMmYyyy,
  formatSpanishLongDate,
} from "@/lib/asistencia/time";

type Props = {
  snapshot: AsistenciaSnapshot;
  snapshotCorte2: AsistenciaSnapshot;
  config: AsistenciaConfigRow;
  destinatarios: AsistenciaDestinatario[];
  logs: AsistenciaReporteLogRow[];
  allUsers: Array<{
    id: number;
    nombre_apellido: string;
    email_corporativo: string | null;
    departamento_id: number | null;
    departamento_nombre: string;
  }>;
  allDepartments: Array<{ id: number; nombre: string }>;
};

type ActiveTab = "registro" | "configuracion" | "historial";

export function AsistenciaTedClient({
  snapshot,
  snapshotCorte2,
  config,
  destinatarios,
  logs,
  allUsers,
  allDepartments,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("registro");
  const [selectedCorte, setSelectedCorte] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState(snapshot.fecha);
  const [testEmail, setTestEmail] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  // Config state
  const [activo, setActivo] = useState(config.activo);
  const [horaCorte, setHoraCorte] = useState(config.hora_corte.slice(0, 5));
  const [activoCorte2, setActivoCorte2] = useState(config.activo_corte_2);
  const [horaCorte2, setHoraCorte2] = useState(config.hora_corte_2.slice(0, 5));
  const [omitirFeriados, setOmitirFeriados] = useState(config.omitir_feriados);
  const [excludedUsers, setExcludedUsers] = useState<number[]>(
    config.usuarios_excluidos,
  );
  const [excludedDepts, setExcludedDepts] = useState<number[]>(
    config.departamentos_excluidos,
  );
  const [userSearch, setUserSearch] = useState("");

  // New recipient state
  const [newEmail, setNewEmail] = useState("");
  const [newNombre, setNewNombre] = useState("");

  const activeSnapshot = selectedCorte === 1 ? snapshot : snapshotCorte2;
  const activeCutoffLabel = formatCutoffLabel(activeSnapshot.hora_corte);
  const corte1Label = formatCutoffLabel(config.hora_corte);
  const corte2Label = formatCutoffLabel(config.hora_corte_2);

  function handleDateChange(nextDate: string) {
    setSelectedDate(nextDate);
    if (nextDate) {
      router.push(`/ted/asistencia?fecha=${encodeURIComponent(nextDate)}`);
    }
  }

  function handleSendReport(onlyTestEmail: boolean) {
    startTransition(async () => {
      setFeedback(null);
      const res = await sendManualAsistenciaReportAction({
        fecha: activeSnapshot.fecha,
        corte: selectedCorte,
        testEmail: onlyTestEmail ? testEmail : undefined,
      });
      setFeedback({
        type: res.ok ? "success" : "error",
        text: res.message,
      });
      if (res.ok) {
        router.refresh();
      }
    });
  }

  function handleToggleManualAttendance(usuarioId: number, presente: boolean) {
    startTransition(async () => {
      setFeedback(null);
      const res = await markManualAttendanceAction({
        usuario_id: usuarioId,
        fecha: activeSnapshot.fecha,
        presente,
      });
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: res.error || "No se pudo actualizar la asistencia.",
        });
        return;
      }
      router.refresh();
    });
  }

  function handleSaveConfig() {
    startTransition(async () => {
      setFeedback(null);
      const res = await updateAsistenciaConfigAction({
        activo,
        hora_corte: `${horaCorte}:00`,
        activo_corte_2: activoCorte2,
        hora_corte_2: `${horaCorte2}:00`,
        omitir_feriados: omitirFeriados,
        usuarios_excluidos: excludedUsers,
        departamentos_excluidos: excludedDepts,
      });
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: res.error || "No se pudo guardar la configuración.",
        });
        return;
      }
      setFeedback({
        type: "success",
        text: "Configuración de asistencia actualizada correctamente.",
      });
      router.refresh();
    });
  }

  function handleAddRecipient() {
    if (!newEmail.trim()) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await addAsistenciaDestinatarioAction({
        email: newEmail,
        nombre: newNombre,
      });
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: res.error || "Error al agregar destinatario.",
        });
        return;
      }
      setNewEmail("");
      setNewNombre("");
      setFeedback({
        type: "success",
        text: "Destinatario agregado.",
      });
      router.refresh();
    });
  }

  function handleRemoveRecipient(id: number) {
    startTransition(async () => {
      setFeedback(null);
      const res = await removeAsistenciaDestinatarioAction(id);
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: res.error || "Error al eliminar destinatario.",
        });
        return;
      }
      router.refresh();
    });
  }

  function toggleExcludedUser(id: number) {
    setExcludedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleExcludedDept(id: number) {
    setExcludedDepts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const filteredUsers = allUsers.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.nombre_apellido.toLowerCase().includes(q) ||
      (u.email_corporativo ?? "").toLowerCase().includes(q) ||
      u.departamento_nombre.toLowerCase().includes(q)
    );
  });

  const cutoffLabel = formatCutoffLabel(snapshot.hora_corte);

  return (
    <div className="space-y-6">
      {/* Top Tabs & Date Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("registro")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "registro"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Asistencia del día
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("configuracion")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "configuracion"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="h-4 w-4" />
            Configuración y Destinatarios
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("historial")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "historial"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="h-4 w-4" />
            Historial de envíos ({logs.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-9 w-44 rounded-lg text-sm"
          />
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* TAB 1: REGISTRO DEL DÍA */}
      {activeTab === "registro" && (
        <div className="space-y-6">
          {/* Corte Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setSelectedCorte(1)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCorte === 1
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              Primer Corte ({corte1Label})
              {activo ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Envío automático activo" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-400" title="Envío automático inactivo" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedCorte(2)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCorte === 2
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              Segundo Corte ({corte2Label})
              {activoCorte2 ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" title="Envío automático activo" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-400" title="Envío automático inactivo" />
              )}
            </button>
          </div>

          {/* Summary Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {formatSpanishLongDate(activeSnapshot.fecha)}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                    {selectedCorte === 1 ? "Primer Corte (Mañana)" : "Segundo Corte (Tarde)"}
                  </span>
                  {activeSnapshot.es_feriado && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Feriado: {activeSnapshot.nombre_feriado}
                    </span>
                  )}
                </div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Estado de conexión antes de las {activeCutoffLabel}
                </h2>
                <p className="text-xs text-slate-500">
                  Las sesiones de días anteriores se cierran automáticamente al cambiar de día (America/Caracas) para garantizar que cada usuario inicie sesión al llegar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Correo de prueba (opcional)"
                  className="h-9 w-56 rounded-lg text-xs"
                />
                {testEmail.trim() ? (
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => handleSendReport(true)}
                    className="h-9 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Enviar prueba (Corte {selectedCorte})
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => setShowEmailPreview(true)}
                  variant="outline"
                  className="h-9 rounded-lg border-slate-300 text-xs font-semibold"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Vista previa (Corte {selectedCorte})
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => handleSendReport(false)}
                  variant="outline"
                  className="h-9 rounded-lg border-slate-300 text-xs font-semibold"
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Enviar a destinatarios ({destinatarios.filter((d) => d.activo).length})
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                  <span>Personal Esperado</span>
                  <Users className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {activeSnapshot.total_esperados}
                </p>
                {activeSnapshot.total_excluidos > 0 && (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    +{activeSnapshot.total_excluidos} excluidos del reporte
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase text-emerald-700">
                  <span>Presentes (&le; {activeCutoffLabel})</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {activeSnapshot.total_presentes}{" "}
                  <span className="text-sm font-semibold">
                    ({activeSnapshot.porcentaje_asistencia}%)
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase text-amber-700">
                  <span>Ingreso posterior</span>
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-700">
                  {activeSnapshot.total_tardios}
                </p>
                <p className="mt-0.5 text-[11px] text-amber-600">
                  Después de las {activeCutoffLabel}
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase text-red-700">
                  <span>Sin registro al corte</span>
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-red-700">
                  {activeSnapshot.total_ausentes}
                </p>
              </div>
            </div>
          </div>

          {/* Department tables */}
          <div className="space-y-4">
            {activeSnapshot.departamentos.map((dept) => (
              <div
                key={`${dept.departamento_id ?? "none"}-${dept.departamento_nombre}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    {dept.departamento_nombre}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="text-emerald-700">
                      {dept.presentes} presentes
                    </span>
                    <span className="text-slate-300">&middot;</span>
                    <span
                      className={
                        dept.ausentes > 0 ? "text-red-600" : "text-slate-500"
                      }
                    >
                      {dept.ausentes} sin registro al corte
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {dept.usuarios.map((u) => (
                    <div
                      key={u.usuario_id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3 hover:bg-slate-50/60"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {u.nombre_apellido}
                        </p>
                        <p className="text-xs text-slate-500">
                          {u.cargo || "Sin cargo especificado"}
                          {u.email_corporativo ? ` · ${u.email_corporativo}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {u.presente_en_corte ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Presente ({u.hora_formateada})
                          </span>
                        ) : u.estado === "tardio" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            Ingreso {u.hora_formateada} (tras el corte)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                            Sin registro
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            handleToggleManualAttendance(
                              u.usuario_id,
                              !u.presente_en_corte,
                            )
                          }
                          className="text-[11px] font-medium text-slate-400 hover:text-indigo-600 underline"
                          title={
                            u.presente_en_corte
                              ? "Quitar marca de asistencia"
                              : "Marcar presente manualmente"
                          }
                        >
                          {u.presente_en_corte ? "Quitar marca" : "Marcar presente"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURACIÓN Y DESTINATARIOS */}
      {activeTab === "configuracion" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Schedule & Exclusions */}
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Parámetros de reportes automáticos
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                El sistema verifica de lunes a viernes en los horarios de corte configurados (zona horaria America/Caracas) y envía el resumen por correo.
              </p>
            </div>

            <div className="space-y-4">
              {/* Primer Corte (Mañana) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      Primer Envío Programado (Mañana)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Reporte matutino de conexiones al inicio de la jornada laboral.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={(e) => setActivo(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-xs font-semibold text-slate-700">
                      {activo ? "Activo" : "Inactivo"}
                    </span>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
                  <span className="text-xs font-medium text-slate-700">
                    Hora de corte (Corte 1):
                  </span>
                  <Input
                    type="time"
                    value={horaCorte}
                    onChange={(e) => setHoraCorte(e.target.value)}
                    className="h-8 w-28 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              {/* Segundo Corte (Tarde - 2:00 PM) */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      Segundo Envío Programado (Tarde — 2:00 PM)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Segundo reporte vespertino para monitorear incorporaciones del día.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activoCorte2}
                      onChange={(e) => setActivoCorte2(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-xs font-semibold text-slate-700">
                      {activoCorte2 ? "Activo" : "Inactivo"}
                    </span>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-indigo-100">
                  <span className="text-xs font-medium text-slate-700">
                    Hora de corte (Corte 2):
                  </span>
                  <Input
                    type="time"
                    value={horaCorte2}
                    onChange={(e) => setHoraCorte2(e.target.value)}
                    className="h-8 w-28 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Omitir días feriados nacionales
                  </p>
                  <p className="text-xs text-slate-500">
                    Usa el calendario de <code className="text-[11px]">cat_feriados_venezuela</code> para no enviar correos en días feriados.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={omitirFeriados}
                  onChange={(e) => setOmitirFeriados(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
              </label>
            </div>

            {/* Department exclusions */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Departamentos excluidos ({excludedDepts.length})
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Marca los departamentos que no deben incluirse en el listado de asistencia de oficina.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {allDepartments.map((d) => {
                  const isEx = excludedDepts.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleExcludedDept(d.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isEx
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {d.nombre} {isEx ? "(Excluido)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Individual User exclusions */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Usuarios excluidos ({excludedUsers.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Vacaciones, permisos, personal externo o directivos
                </span>
              </div>
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar empleado por nombre o departamento..."
                className="mt-2 h-9 rounded-lg text-xs"
              />
              <div className="mt-2 max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                {filteredUsers.map((u) => {
                  const isEx = excludedUsers.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      <div>
                        <span className="font-medium text-slate-800">
                          {u.nombre_apellido}
                        </span>
                        <span className="ml-2 text-slate-400">
                          ({u.departamento_nombre})
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isEx}
                        onChange={() => toggleExcludedUser(u.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <Button
              type="button"
              disabled={pending}
              onClick={handleSaveConfig}
              className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Guardar configuración
            </Button>
          </div>

          {/* Right: Email Recipients */}
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Destinatarios del reporte
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Correos electrónicos que reciben los reportes diarios de asistencia (Corte 1 y Corte 2) de lunes a viernes.
              </p>
            </div>

            <ul className="space-y-2">
              {destinatarios.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {r.email}
                    </p>
                    {r.nombre && (
                      <p className="truncate text-xs text-slate-400">
                        {r.nombre}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleRemoveRecipient(r.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                    aria-label={`Eliminar ${r.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {destinatarios.length === 0 && (
                <li className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                  No hay destinatarios configurados. Agrega al menos un correo.
                </li>
              )}
            </ul>

            <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="correo@shadevenezuela.com.ve"
                className="h-10 rounded-xl text-sm"
              />
              <Input
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Cargo / Nombre"
                className="h-10 rounded-xl text-sm"
              />
              <Button
                type="button"
                disabled={pending || !newEmail.trim()}
                onClick={handleAddRecipient}
                className="h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="mr-1 h-4 w-4" />
                Añadir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORIAL DE ENVÍOS */}
      {activeTab === "historial" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Bitácora de reportes enviados
            </h2>
          </div>
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Aún no hay envíos registrados.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5 text-sm"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {formatDdMmYyyy(log.fecha)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                          log.corte === 2
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}
                      >
                        {log.corte === 2 ? `Corte 2 (${corte2Label})` : `Corte 1 (${corte1Label})`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          log.tipo === "scheduled"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {log.tipo === "scheduled" ? "Automático" : "Manual"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          log.status === "sent"
                            ? "bg-emerald-50 text-emerald-700"
                            : log.status === "skipped_holiday"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Destinatarios: {log.destinatarios || "—"}
                    </p>
                    {log.error_message && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {log.error_message}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p className="font-medium text-slate-800">
                      {log.total_presentes}/{log.total_esperados} presentes
                    </p>
                    <p>{formatCaracasTime12h(log.sent_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EMAIL PREVIEW MODAL */}
      {showEmailPreview && (() => {
        const previewEmail = buildAsistenciaReportEmail(activeSnapshot);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Vista previa del correo &middot; {selectedCorte === 1 ? "Primer Corte" : "Segundo Corte"}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    Asunto: {previewEmail.subject}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Cerrar vista previa"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
                <iframe
                  title="Vista previa del reporte de asistencia"
                  srcDoc={previewEmail.html}
                  className="h-[640px] w-full rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
