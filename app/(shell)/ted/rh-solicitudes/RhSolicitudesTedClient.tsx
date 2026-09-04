"use client";

import { useState, useTransition } from "react";
import {
  Check,
  X,
  Mail,
  Phone,
  Building2,
  Clock,
  User,
  FileText,
  Loader2,
} from "lucide-react";
import { updateRhSolicitudStatus } from "@/app/actions/ted-rh-solicitudes";

type SolicitudEstado = "pendiente" | "en_proceso" | "completada" | "rechazada";

type RhSolicitudRow = {
  id: number;
  nombre_apellido: string;
  cedula: string | null;
  cargo: string | null;
  departamento: number | null;
  telefono: string | null;
  solicitar_email: boolean;
  solicitar_firma_email: boolean;
  estado: SolicitudEstado;
  notas: string | null;
  solicitado_por: number | null;
  procesado_por: number | null;
  created_at: string;
  updated_at: string;
  solicitado_por_usuario: { nombre_apellido: string } | null;
  procesado_por_usuario: { nombre_apellido: string } | null;
  departamentos: { nombre: string } | null;
};

type TabKey = "pendientes" | "completadas" | "rechazadas";

const TAB_CONFIG: { key: TabKey; label: string; estados: SolicitudEstado[] }[] = [
  { key: "pendientes", label: "Pendientes", estados: ["pendiente", "en_proceso"] },
  { key: "completadas", label: "Completadas", estados: ["completada"] },
  { key: "rechazadas", label: "Rechazadas", estados: ["rechazada"] },
];

const ESTADO_BADGE: Record<SolicitudEstado, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  en_proceso: "bg-blue-100 text-blue-700",
  completada: "bg-green-100 text-green-700",
  rechazada: "bg-red-100 text-red-700",
};

const ESTADO_LABEL: Record<SolicitudEstado, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  completada: "Completada",
  rechazada: "Rechazada",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RhSolicitudesTedClient({
  solicitudes,
}: {
  solicitudes: RhSolicitudRow[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("pendientes");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const tabConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;
  const filtered = solicitudes.filter((s) =>
    tabConfig.estados.includes(s.estado),
  );

  const counts: Record<TabKey, number> = {
    pendientes: solicitudes.filter((s) =>
      ["pendiente", "en_proceso"].includes(s.estado),
    ).length,
    completadas: solicitudes.filter((s) => s.estado === "completada").length,
    rechazadas: solicitudes.filter((s) => s.estado === "rechazada").length,
  };

  function handleComplete(id: number) {
    setPendingId(id);
    startTransition(async () => {
      const result = await updateRhSolicitudStatus(id, "completada");
      if (!result.success) {
        alert(result.error || "Error al completar la solicitud");
      }
      setPendingId(null);
    });
  }

  function handleReject(id: number) {
    setPendingId(id);
    startTransition(async () => {
      const result = await updateRhSolicitudStatus(
        id,
        "rechazada",
        rejectMotivo.trim() || null,
      );
      if (!result.success) {
        alert(result.error || "Error al rechazar la solicitud");
      }
      setRejectingId(null);
      setRejectMotivo("");
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                  activeTab === tab.key
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay solicitudes {tabConfig.label.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-foreground text-base">
                      {s.nombre_apellido}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${ESTADO_BADGE[s.estado]}`}
                    >
                      {ESTADO_LABEL[s.estado]}
                    </span>
                    {s.solicitar_email && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        <Mail className="h-3 w-3" />
                        Email
                      </span>
                    )}
                    {s.solicitar_firma_email && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        <Mail className="h-3 w-3" />
                        Firma
                      </span>
                    )}
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {s.cargo && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4 shrink-0" />
                        <span>{s.cargo}</span>
                      </div>
                    )}
                    {s.departamentos?.nombre && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>{s.departamentos.nombre}</span>
                      </div>
                    )}
                    {s.telefono && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{s.telefono}</span>
                      </div>
                    )}
                    {s.cedula && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span>CI: {s.cedula}</span>
                      </div>
                    )}
                    {s.solicitado_por_usuario?.nombre_apellido && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4 shrink-0" />
                        <span>
                          Solicitado por: {s.solicitado_por_usuario.nombre_apellido}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>{formatDate(s.created_at)}</span>
                    </div>
                  </div>

                  {/* Notas */}
                  {s.notas && (
                    <div className="mt-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      <span className="font-medium">Notas: </span>
                      {s.notas}
                    </div>
                  )}

                  {/* Procesado por */}
                  {s.procesado_por_usuario?.nombre_apellido && (
                    <p className="text-xs text-muted-foreground">
                      Procesado por: {s.procesado_por_usuario.nombre_apellido}
                    </p>
                  )}
                </div>

                {/* Actions (only on pending tab) */}
                {activeTab === "pendientes" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    {rejectingId === s.id ? (
                      <div className="flex flex-col gap-2 w-64">
                        <textarea
                          value={rejectMotivo}
                          onChange={(e) => setRejectMotivo(e.target.value)}
                          placeholder="Motivo del rechazo (opcional)..."
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          rows={3}
                          disabled={isPending}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(s.id)}
                            disabled={isPending}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {isPending && pendingId === s.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            Confirmar rechazo
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectMotivo("");
                            }}
                            disabled={isPending}
                            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleComplete(s.id)}
                          disabled={isPending}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {isPending && pendingId === s.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Completar
                        </button>
                        <button
                          onClick={() => setRejectingId(s.id)}
                          disabled={isPending}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
