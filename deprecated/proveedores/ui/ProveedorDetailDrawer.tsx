"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Building2,
  Printer,
  Edit3,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Plus,
  Trash2,
  History,
  FileText,
  Star,
  Send,
  Award,
} from "lucide-react";
import type {
  ProveedorWithDetails,
  DatoBancarioProveedor,
  ProveedorNota,
  ProveedorAuditoria,
} from "../types/proveedores";
import {
  PROVEEDOR_IMPACTO_LABELS,
  PROVEEDOR_IMPACTO_COLORS,
  PROVEEDOR_ESTADO_LABELS,
  PROVEEDOR_ESTADO_COLORS,
} from "../types/proveedores";
import {
  fetchProveedorById,
  saveProveedorBanco,
  deleteProveedorBanco,
  addProveedorNota,
} from "../actions/proveedores";

interface ProveedorDetailDrawerProps {
  proveedorId: number | null;
  onClose: () => void;
  onEdit: (prov: ProveedorWithDetails) => void;
  onOpenFicha: (prov: ProveedorWithDetails, bancos: DatoBancarioProveedor[]) => void;
}

const BANCOS_VENEZUELA = [
  "Banesco",
  "Banco de Venezuela",
  "Banco Mercantil",
  "BBVA Provincial",
  "Banco Nacional de Crédito (BNC)",
  "Bancaribe",
  "Banco Exterior",
  "Banco Fondo Común (BFC)",
  "Banco Plaza",
  "Banco Venezolano de Crédito",
  "100% Banco",
  "Dólares / Zelle / Internacional",
];

export default function ProveedorDetailDrawer({
  proveedorId,
  onClose,
  onEdit,
  onOpenFicha,
}: ProveedorDetailDrawerProps) {
  const [data, setData] = useState<{
    proveedor: ProveedorWithDetails | null;
    cuentasBancarias: DatoBancarioProveedor[];
    notas: ProveedorNota[];
    auditoria: ProveedorAuditoria[];
  }>({
    proveedor: null,
    cuentasBancarias: [],
    notas: [],
    auditoria: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "bancos" | "notas" | "auditoria">("general");

  // New bank account state
  const [showAddBanco, setShowAddBanco] = useState(false);
  const [newBanco, setNewBanco] = useState("Banesco");
  const [newCuenta, setNewCuenta] = useState("");
  const [newTitular, setNewTitular] = useState("");
  const [newCedula, setNewCedula] = useState("");
  const [newPagoMovil, setNewPagoMovil] = useState("");
  const [newTipo, setNewTipo] = useState("corriente");
  const [newEsPrincipal, setNewEsPrincipal] = useState(false);
  const [isSavingBanco, setIsSavingBanco] = useState(false);

  // New note state
  const [notaTexto, setNotaTexto] = useState("");
  const [isSavingNota, setIsSavingNota] = useState(false);

  // Fetch full details
  const reloadData = useCallback(async () => {
    if (!proveedorId) return;
    setIsLoading(true);
    try {
      const res = await fetchProveedorById(proveedorId);
      setData(res);
    } catch (e) {
      console.error("Error loading proveedor details:", e);
    } finally {
      setIsLoading(false);
    }
  }, [proveedorId]);

  useEffect(() => {
    if (proveedorId) {
      reloadData();
      setActiveTab("general");
      setShowAddBanco(false);
    }
  }, [proveedorId, reloadData]);

  if (!proveedorId) return null;

  const { proveedor, cuentasBancarias, notas, auditoria } = data;

  const handleCreateBanco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanco || !newCuenta.trim()) return;

    setIsSavingBanco(true);
    try {
      const res = await saveProveedorBanco({
        id_proveedor: proveedorId,
        banco: newBanco,
        nro_cuenta: newCuenta.trim(),
        nombre_titular: newTitular.trim() || undefined,
        cedula_titular: newCedula.trim() || proveedor?.rif_proveedor || undefined,
        telefono_pago_movil: newPagoMovil.trim() || undefined,
        tipo_cuenta: newTipo,
        es_principal: newEsPrincipal,
      });

      if (res.success) {
        setShowAddBanco(false);
        setNewCuenta("");
        setNewTitular("");
        setNewCedula("");
        setNewPagoMovil("");
        await reloadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingBanco(false);
    }
  };

  const handleDeleteBanco = async (bancoId: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta cuenta bancaria?")) return;
    await deleteProveedorBanco(bancoId, proveedorId);
    await reloadData();
  };

  const handleAddNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notaTexto.trim()) return;

    setIsSavingNota(true);
    try {
      const res = await addProveedorNota(proveedorId, notaTexto.trim());
      if (res.success) {
        setNotaTexto("");
        await reloadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNota(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50/70">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    proveedor ? PROVEEDOR_IMPACTO_COLORS[proveedor.impacto_nivel] : ""
                  }`}
                >
                  {proveedor ? PROVEEDOR_IMPACTO_LABELS[proveedor.impacto_nivel] : ""}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    proveedor ? PROVEEDOR_ESTADO_COLORS[proveedor.estado_operativo] : ""
                  }`}
                >
                  {proveedor ? PROVEEDOR_ESTADO_LABELS[proveedor.estado_operativo] : ""}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {proveedor?.nombre_razon_social || "Cargando..."}
              </h2>
              <p className="text-xs text-gray-500 font-mono">
                CI / RIF: <strong>{proveedor?.rif_proveedor || "No registrado"}</strong> • Rubro:{" "}
                {proveedor?.producto_servicio_admin || "General"}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-200/60">
            {proveedor && (
              <>
                <button
                  onClick={() => onOpenFicha(proveedor, cuentasBancarias)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:text-[#0C3F69] text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#0C3F69]" />
                  <span>Ficha PDF / Imprimir</span>
                </button>
                <button
                  onClick={() => onEdit(proveedor)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => alert("Evaluación de Proveedores: Próximamente disponible para auditorías de calidad periódicas.")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/50 border border-dashed border-amber-300 hover:bg-amber-100/60 text-amber-800 rounded-lg text-xs font-medium shadow-2xs transition-all cursor-pointer"
                  title="Evaluación periódica de calidad (Próximamente)"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>Evaluación (Próximamente)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 px-4 sm:px-6 gap-2 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "general"
                ? "border-[#0C3F69] text-[#0C3F69]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Información
          </button>
          <button
            onClick={() => setActiveTab("bancos")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "bancos"
                ? "border-[#0C3F69] text-[#0C3F69]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Cuentas Bancarias ({cuentasBancarias.length})
          </button>
          <button
            onClick={() => setActiveTab("notas")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "notas"
                ? "border-[#0C3F69] text-[#0C3F69]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notas ({notas.length})
          </button>
          <button
            onClick={() => setActiveTab("auditoria")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "auditoria"
                ? "border-[#0C3F69] text-[#0C3F69]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Auditoría ({auditoria.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400 animate-pulse">
              Cargando información del proveedor...
            </div>
          ) : (
            <>
              {/* TAB 1: General */}
              {activeTab === "general" && proveedor && (
                <div className="space-y-6">
                  {/* Contact Info */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Contacto Directo
                    </span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Persona de Contacto</span>
                        <span className="font-semibold text-gray-900 block mt-0.5">
                          {proveedor.persona_contacto || "No registrada"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Cédula</span>
                        <span className="text-gray-800 block mt-0.5 font-mono">
                          {proveedor.cedula_contacto || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Teléfono</span>
                        {proveedor.telefono ? (
                          <a
                            href={`tel:${proveedor.telefono}`}
                            className="font-medium text-[#145C8F] hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-3 h-3" />
                            {proveedor.telefono}
                          </a>
                        ) : (
                          <span className="text-gray-400 mt-0.5 block">—</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Correo</span>
                        {proveedor.email ? (
                          <a
                            href={`mailto:${proveedor.email}`}
                            className="font-medium text-[#145C8F] hover:underline inline-flex items-center gap-1 mt-0.5 truncate max-w-full"
                          >
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{proveedor.email}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 mt-0.5 block">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Domicilio Fiscal & Ubicación
                    </span>
                    <div className="flex items-start gap-2 pt-1">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {[proveedor.ciudad_nombre, proveedor.estado_nombre].filter(Boolean).join(", ") ||
                            "Sin estado/ciudad asignado"}
                        </p>
                        <p className="text-gray-600 mt-0.5 leading-relaxed">
                          {proveedor.direccion_fiscal || "Dirección no especificada"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Commercial Terms */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Condiciones Comerciales
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Condición de Pago</span>
                        <span className="font-semibold text-gray-900 block mt-0.5">
                          {proveedor.condicion_pago || "Contado"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Días de Crédito</span>
                        <span className="font-semibold text-gray-900 block mt-0.5">
                          {proveedor.dias_credito ? `${proveedor.dias_credito} días` : "0 (Contado)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Moneda</span>
                        <span className="font-semibold text-gray-900 block mt-0.5">
                          {proveedor.moneda_habitual}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Retenciones SENIAT</span>
                        <span className="font-medium text-gray-800 block mt-0.5">
                          IVA: {proveedor.retencion_iva ? "Sí" : "No"} • ISLR: {proveedor.retencion_islr ? "Sí" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Observations */}
                  {proveedor.notas_observaciones && (
                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-gray-700 block">Observaciones:</span>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200 leading-relaxed">
                        {proveedor.notas_observaciones}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Bancos */}
              {activeTab === "bancos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Cuentas Registradas
                    </span>
                    {!showAddBanco && (
                      <button
                        onClick={() => setShowAddBanco(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0C3F69] hover:bg-[#145C8F] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Cuenta</span>
                      </button>
                    )}
                  </div>

                  {/* Inline Add Bank Form */}
                  {showAddBanco && (
                    <form onSubmit={handleCreateBanco} className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3 mb-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">Nueva Cuenta Bancaria</span>
                        <button
                          type="button"
                          onClick={() => setShowAddBanco(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Banco</label>
                          <select
                            value={newBanco}
                            onChange={(e) => setNewBanco(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                          >
                            {BANCOS_VENEZUELA.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tipo</label>
                          <select
                            value={newTipo}
                            onChange={(e) => setNewTipo(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                          >
                            <option value="corriente">Corriente</option>
                            <option value="ahorro">Ahorro</option>
                            <option value="dolares">Divisas / Nacional</option>
                            <option value="internacional">Internacional</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Número de Cuenta (20 dígitos)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="0102 0000 00 0000000000"
                          value={newCuenta}
                          onChange={(e) => setNewCuenta(e.target.value.replace(/[^0-9]/g, "").slice(0, 20))}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Titular de la Cuenta</label>
                          <input
                            type="text"
                            placeholder="Nombre del titular"
                            value={newTitular}
                            onChange={(e) => setNewTitular(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Teléfono Pago Móvil</label>
                          <input
                            type="tel"
                            placeholder="04141234567"
                            value={newPagoMovil}
                            onChange={(e) => setNewPagoMovil(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={newEsPrincipal}
                            onChange={(e) => setNewEsPrincipal(e.target.checked)}
                            className="rounded-sm text-[#0C3F69]"
                          />
                          <span>Marcar como cuenta principal</span>
                        </label>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddBanco(false)}
                            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingBanco}
                            className="px-4 py-1.5 bg-[#0C3F69] text-white rounded-lg text-xs font-semibold hover:bg-[#145C8F] disabled:opacity-50"
                          >
                            {isSavingBanco ? "Guardando..." : "Guardar Cuenta"}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Bank Accounts List */}
                  {cuentasBancarias.length > 0 ? (
                    <div className="space-y-3">
                      {cuentasBancarias.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all flex items-start justify-between text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">{b.banco}</span>
                              {b.es_principal && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  <Star className="w-3 h-3 fill-emerald-600" />
                                  Principal
                                </span>
                              )}
                              <span className="capitalize text-gray-400 text-[11px]">• {b.tipo_cuenta || "Corriente"}</span>
                            </div>
                            <p className="font-mono text-gray-800 font-semibold tracking-wider text-xs">
                              {b.nro_cuenta}
                            </p>
                            <p className="text-gray-500 text-[11px]">
                              Titular: <strong>{b.nombre_titular || proveedor?.nombre_razon_social}</strong>
                              {b.cedula_titular && ` (${b.cedula_titular})`}
                            </p>
                            {b.telefono_pago_movil && (
                              <p className="text-gray-500 text-[11px]">
                                Pago Móvil: <span className="font-mono">{b.telefono_pago_movil}</span>
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteBanco(b.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      No hay cuentas bancarias registradas para este proveedor.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Notas */}
              {activeTab === "notas" && (
                <div className="space-y-4 text-xs">
                  {/* Add note input */}
                  <form onSubmit={handleAddNota} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escribe un acuerdo, recordatorio o nota sobre el proveedor..."
                      value={notaTexto}
                      onChange={(e) => setNotaTexto(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={isSavingNota || !notaTexto.trim()}
                      className="px-4 py-2 bg-[#0C3F69] hover:bg-[#145C8F] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSavingNota ? "..." : "Anotar"}</span>
                    </button>
                  </form>

                  {/* Notes Timeline */}
                  {notas.length > 0 ? (
                    <div className="space-y-2.5 pt-2">
                      {notas.map((n) => (
                        <div key={n.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                          <p className="text-gray-800 leading-relaxed">{n.nota}</p>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                            <span>Registrado por: {n.autor_nombre || "Usuario"}</span>
                            <span>{new Date(n.created_at).toLocaleString("es-VE")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      Aún no hay notas registradas para este proveedor.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Auditoría */}
              {activeTab === "auditoria" && (
                <div className="space-y-3 text-xs">
                  {auditoria.length > 0 ? (
                    <div className="space-y-3">
                      {auditoria.map((a) => (
                        <div key={a.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                              {a.accion.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(a.created_at).toLocaleString("es-VE")}
                            </span>
                          </div>

                          {a.motivo && (
                            <p className="text-gray-600 text-[11px] italic">
                              Motivo: &quot;{a.motivo}&quot;
                            </p>
                          )}

                          {a.campos_modificados && Object.keys(a.campos_modificados).length > 0 && (
                            <div className="mt-2 bg-white p-2.5 rounded-lg border border-gray-200/80 space-y-1 text-[11px]">
                              {Object.entries(a.campos_modificados).map(([key, rawVal]) => {
                                const val = rawVal as { anterior?: unknown; nuevo?: unknown } | undefined;
                                return (
                                  <div key={key} className="flex items-start justify-between text-gray-700">
                                    <span className="font-semibold text-gray-500 capitalize">{key.replace(/_/g, " ")}:</span>
                                    <div className="text-right">
                                      {val?.anterior !== undefined && val?.anterior !== null && (
                                        <span className="line-through text-red-500 mr-1.5">
                                          {String(val.anterior)}
                                        </span>
                                      )}
                                      <span className="text-emerald-700 font-medium">
                                        {val?.nuevo !== undefined && val?.nuevo !== null ? String(val.nuevo) : "—"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="text-[10px] text-gray-400 pt-1">
                            Modificado por: <strong>{a.realizado_por_nombre || "Administrador"}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                      Sin eventos de auditoría registrados.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
