"use client";

import React, { useState, useEffect } from "react";
import { X, Building2, Save, AlertCircle, CreditCard, MapPin } from "lucide-react";
import type {
  Proveedor,
  ProveedorWithDetails,
  EstadoVenezuela,
  CiudadVenezuela,
  ImpactoNivel,
  EstadoOperativoProveedor,
  MonedaHabitual,
} from "../types/proveedores";
import {
  createProveedor,
  updateProveedor,
  fetchCatalogoCiudades,
} from "../actions/proveedores";

interface ProveedorFormModalProps {
  proveedor?: ProveedorWithDetails | null;
  estados: EstadoVenezuela[];
  onClose: () => void;
  onSuccess: (updatedOrCreated: Proveedor) => void;
}

const CATEGORIAS_SUGERIDAS = [
  "MEDICINA OCUPACIONAL",
  "TECNOLOGÍA / COMPUTACIÓN",
  "ALQUILER DE OFICINA",
  "ASESOR EXTERNO / AUDITOR",
  "SUMINISTROS DE OFICINA",
  "MANTENIMIENTO Y SERVICIOS",
  "TRANSPORTE Y LOGÍSTICA",
  "SEGURIDAD Y SALUD LABORAL",
  "CAPACITACIÓN Y FORMACIÓN",
  "UNIFORMES Y DOTACIÓN",
  "SEGUROS Y PÓLIZAS",
];

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
  "Banco Sofitasa",
  "Dólares / Zelle / Internacional",
];

export default function ProveedorFormModal({
  proveedor,
  estados,
  onClose,
  onSuccess,
}: ProveedorFormModalProps) {
  const isEditing = Boolean(proveedor?.id);

  // Form states
  const [nombreRazonSocial, setNombreRazonSocial] = useState(proveedor?.nombre_razon_social || "");
  const [rifPrefix, setRifPrefix] = useState(() => {
    if (proveedor?.rif_proveedor) {
      const match = proveedor.rif_proveedor.match(/^([JVGE])/i);
      return match ? match[1].toUpperCase() : "J";
    }
    return "J";
  });
  const [rifNumber, setRifNumber] = useState(() => {
    if (proveedor?.rif_proveedor) {
      return proveedor.rif_proveedor.replace(/^[JVGE]-?/i, "");
    }
    return "";
  });
  const [fechaVencimientoRif, setFechaVencimientoRif] = useState(proveedor?.fecha_vencimiento_rif || "");
  const [productoServicio, setProductoServicio] = useState(proveedor?.producto_servicio_admin || "");
  const [impactoNivel, setImpactoNivel] = useState<ImpactoNivel>(proveedor?.impacto_nivel || "bajo");
  const [estadoOperativo, setEstadoOperativo] = useState<EstadoOperativoProveedor>(proveedor?.estado_operativo || "activo");

  // Contact & Location
  const [personaContacto, setPersonaContacto] = useState(proveedor?.persona_contacto || "");
  const [cedulaContacto, setCedulaContacto] = useState(proveedor?.cedula_contacto || "");
  const [telefono, setTelefono] = useState(proveedor?.telefono || "");
  const [email, setEmail] = useState(proveedor?.email || "");
  const [direccionFiscal, setDireccionFiscal] = useState(proveedor?.direccion_fiscal || "");
  const [idEstado, setIdEstado] = useState<number | "">(proveedor?.id_estado_geografico || "");
  const [idCiudad, setIdCiudad] = useState<number | "">(proveedor?.id_ciudad || "");
  const [ciudades, setCiudades] = useState<CiudadVenezuela[]>([]);

  // Financial & Commercial (Dropdown: Contado, Crédito, Otro)
  const initialCond = proveedor?.condicion_pago || "Contado";
  const isContado = /^contado$/i.test(initialCond);
  const isCredito = /^cr[eé]dito/i.test(initialCond);
  const [condicionPagoTipo, setCondicionPagoTipo] = useState<"Contado" | "Crédito" | "Otro">(
    isContado ? "Contado" : isCredito ? "Crédito" : initialCond ? "Otro" : "Contado"
  );
  const [condicionPagoCustom, setCondicionPagoCustom] = useState(
    !isContado && !isCredito ? initialCond : ""
  );
  const [diasCredito, setDiasCredito] = useState(proveedor?.dias_credito || 0);
  const [monedaHabitual, setMonedaHabitual] = useState<MonedaHabitual>(proveedor?.moneda_habitual || "USD");
  const [retencionIva, setRetencionIva] = useState(proveedor?.retencion_iva ?? true);
  const [retencionIslr, setRetencionIslr] = useState(proveedor?.retencion_islr ?? true);

  // Notes
  const [notas, setNotas] = useState(proveedor?.notas_observaciones || "");
  const [motivoEdicion, setMotivoEdicion] = useState("");

  // Initial Bank Account (Creation only)
  const [hasInitialBank, setHasInitialBank] = useState(false);
  const [bankBanco, setBankBanco] = useState("Banesco");
  const [bankCuenta, setBankCuenta] = useState("");
  const [bankTitular, setBankTitular] = useState("");
  const [bankPagoMovil, setBankPagoMovil] = useState("");
  const [bankTipo, setBankTipo] = useState("corriente");

  // UI States
  const [activeTab, setActiveTab] = useState<"general" | "contacto" | "financiero" | "banco">("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load cities when state changes
  useEffect(() => {
    if (idEstado) {
      fetchCatalogoCiudades(Number(idEstado)).then(setCiudades);
    } else {
      setCiudades([]);
      setIdCiudad("");
    }
  }, [idEstado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombreRazonSocial.trim()) {
      setErrorMsg("La razón social o nombre de la empresa es obligatorio");
      setActiveTab("general");
      return;
    }

    const fullRif = rifNumber.trim() ? `${rifPrefix}-${rifNumber.trim().replace(/[^0-9]/g, "")}` : null;
    const finalCondicion =
      condicionPagoTipo === "Otro"
        ? (condicionPagoCustom.trim() || "Otro")
        : condicionPagoTipo;

    setIsSubmitting(true);
    try {
      if (isEditing && proveedor) {
        const res = await updateProveedor(
          proveedor.id,
          {
            nombre_razon_social: nombreRazonSocial.trim().toUpperCase(),
            rif_proveedor: fullRif,
            fecha_vencimiento_rif: fechaVencimientoRif || null,
            producto_servicio_admin: productoServicio.trim().toUpperCase() || null,
            impacto_nivel: impactoNivel,
            estado_operativo: estadoOperativo,
            persona_contacto: personaContacto.trim() || null,
            cedula_contacto: cedulaContacto.trim() || null,
            telefono: telefono.trim() || null,
            email: email.trim().toLowerCase() || null,
            direccion_fiscal: direccionFiscal.trim() || null,
            id_estado_geografico: idEstado ? Number(idEstado) : null,
            id_ciudad: idCiudad ? Number(idCiudad) : null,
            condicion_pago: finalCondicion,
            dias_credito: condicionPagoTipo === "Contado" ? 0 : Number(diasCredito) || 0,
            moneda_habitual: monedaHabitual,
            retencion_iva: retencionIva,
            retencion_islr: retencionIslr,
            notas_observaciones: notas.trim() || null,
          },
          motivoEdicion.trim() || "Modificación de datos del proveedor"
        );

        if (!res.success) {
          setErrorMsg(res.error || "Error al actualizar proveedor");
          setIsSubmitting(false);
          return;
        }

        onSuccess({
          ...proveedor,
          nombre_razon_social: nombreRazonSocial.trim().toUpperCase(),
          rif_proveedor: fullRif,
          impacto_nivel: impactoNivel,
          estado_operativo: estadoOperativo,
          producto_servicio_admin: productoServicio.trim().toUpperCase() || null,
          persona_contacto: personaContacto.trim() || null,
          cedula_contacto: cedulaContacto.trim() || null,
          telefono: telefono.trim() || null,
          email: email.trim().toLowerCase() || null,
          direccion_fiscal: direccionFiscal.trim() || null,
          id_estado_geografico: idEstado ? Number(idEstado) : null,
          id_ciudad: idCiudad ? Number(idCiudad) : null,
          condicion_pago: finalCondicion,
          dias_credito: condicionPagoTipo === "Contado" ? 0 : Number(diasCredito) || 0,
          moneda_habitual: monedaHabitual,
          retencion_iva: retencionIva,
          retencion_islr: retencionIslr,
          notas_observaciones: notas.trim() || null,
        });
      } else {
        // Create new
        const res = await createProveedor({
          nombre_razon_social: nombreRazonSocial.trim().toUpperCase(),
          rif_proveedor: fullRif,
          fecha_vencimiento_rif: fechaVencimientoRif || null,
          producto_servicio_admin: productoServicio.trim().toUpperCase() || null,
          impacto_nivel: impactoNivel,
          estado_operativo: estadoOperativo,
          persona_contacto: personaContacto.trim() || null,
          cedula_contacto: cedulaContacto.trim() || null,
          telefono: telefono.trim() || null,
          email: email.trim().toLowerCase() || null,
          direccion_fiscal: direccionFiscal.trim() || null,
          id_estado_geografico: idEstado ? Number(idEstado) : null,
          id_ciudad: idCiudad ? Number(idCiudad) : null,
          condicion_pago: finalCondicion,
          dias_credito: condicionPagoTipo === "Contado" ? 0 : Number(diasCredito) || 0,
          moneda_habitual: monedaHabitual,
          retencion_iva: retencionIva,
          retencion_islr: retencionIslr,
          notas_observaciones: notas.trim() || null,
          banco_inicial:
            hasInitialBank && bankCuenta.trim()
              ? {
                  banco: bankBanco,
                  nro_cuenta: bankCuenta.trim(),
                  cedula_titular: fullRif || undefined,
                  nombre_titular: bankTitular.trim() || nombreRazonSocial.trim(),
                  telefono_pago_movil: bankPagoMovil.trim() || undefined,
                  tipo_cuenta: bankTipo,
                }
              : null,
        });

        if (!res.success || !res.data) {
          setErrorMsg(res.error || "Error al registrar proveedor");
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.data);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg("Ocurrió un error inesperado al guardar");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#0C3F69] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditing ? "Editar Proveedor" : "Registrar Nuevo Proveedor"}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditing ? `Modificando registro de ${proveedor?.nombre_razon_social}` : "Completa la información jurídica, operativa y bancaria"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-4 sm:px-6 gap-2 bg-white overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "general"
                ? "border-[#0C3F69] text-[#0C3F69]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. General & Impacto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contacto")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "contacto"
                ? "border-[#0C3F69] text-[#0C3F69]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            2. Contacto & Ubicación
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("financiero")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "financiero"
                ? "border-[#0C3F69] text-[#0C3F69]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            3. Comercial & Finanzas
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setActiveTab("banco")}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === "banco"
                  ? "border-[#0C3F69] text-[#0C3F69]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              4. Cuenta Bancaria Inicial
            </button>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: General & Impacto */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Razón Social / Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: SERVICIOS MÉDICOS OCCIDENTE, C.A."
                  value={nombreRazonSocial}
                  onChange={(e) => setNombreRazonSocial(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs uppercase focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CI / RIF */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cédula / RIF (CI / RIF)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={rifPrefix}
                      onChange={(e) => setRifPrefix(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-xl text-xs bg-gray-50 font-bold focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                    >
                      <option value="J">J - Jurídico</option>
                      <option value="V">V - Venezolano / Natural</option>
                      <option value="G">G - Gubernamental</option>
                      <option value="E">E - Extranjero</option>
                    </select>
                    <input
                      type="text"
                      placeholder="12345678 o 123456789"
                      value={rifNumber}
                      onChange={(e) => setRifNumber(e.target.value.replace(/[^0-9]/g, ""))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                    />
                  </div>
                </div>

                {/* Fecha Vencimiento RIF */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Vencimiento de RIF
                  </label>
                  <input
                    type="date"
                    value={fechaVencimientoRif}
                    onChange={(e) => setFechaVencimientoRif(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                  />
                </div>
              </div>

              {/* Rubro / Categoría con autocomplete sugerencias */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Categoría / Rubro de Servicio
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="categorias-list"
                    placeholder="Selecciona o escribe una categoría (ej: MEDICINA OCUPACIONAL)"
                    value={productoServicio}
                    onChange={(e) => setProductoServicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs uppercase focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                  />
                  <datalist id="categorias-list">
                    {CATEGORIAS_SUGERIDAS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 2 CATEGORIAS DE IMPACTO */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Nivel de Impacto Operativo (Clasificación ISO / Calidad)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      impactoNivel === "alto"
                        ? "border-red-500 bg-red-50/60"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="impacto_nivel"
                      value="alto"
                      checked={impactoNivel === "alto"}
                      onChange={() => setImpactoNivel("alto")}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-red-900 block">🔴 Alto Impacto</span>
                      <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                        Crítico para la operación, medicina ocupacional, infraestructura o clientes directos.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      impactoNivel === "bajo"
                        ? "border-blue-500 bg-blue-50/60"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="impacto_nivel"
                      value="bajo"
                      checked={impactoNivel === "bajo"}
                      onChange={() => setImpactoNivel("bajo")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-blue-900 block">🔵 Bajo Impacto</span>
                      <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">
                        Suministros generales, consumibles, servicios administrativos estándar.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Estado Operativo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Estado Operativo
                </label>
                <select
                  value={estadoOperativo}
                  onChange={(e) => setEstadoOperativo(e.target.value as EstadoOperativoProveedor)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden font-medium"
                >
                  <option value="activo">Activo (Habilitado para contrataciones)</option>
                  <option value="en_revision">En Revisión (Documentos o tarifas pendientes)</option>
                  <option value="suspendido">Suspendido (Pausa temporal)</option>
                  <option value="inactivo">Inactivo (Desincorporado)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: Contacto & Ubicación */}
          {activeTab === "contacto" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Lic. Carlos Mendoza"
                    value={personaContacto}
                    onChange={(e) => setPersonaContacto(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cédula de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: V-14234567"
                    value={cedulaContacto}
                    onChange={(e) => setCedulaContacto(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 04141234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estado (Venezuela)
                  </label>
                  <select
                    value={idEstado}
                    onChange={(e) => setIdEstado(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                  >
                    <option value="">-- Selecciona Estado --</option>
                    {estados.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.nombre_estado}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <select
                    value={idCiudad}
                    onChange={(e) => setIdCiudad(e.target.value ? Number(e.target.value) : "")}
                    disabled={!idEstado}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">-- Selecciona Ciudad --</option>
                    {ciudades.map((ciu) => (
                      <option key={ciu.id} value={ciu.id}>
                        {ciu.nombre_ciudad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dirección Fiscal
                </label>
                <textarea
                  rows={2}
                  placeholder="Calle, avenida, edificio, piso, local..."
                  value={direccionFiscal}
                  onChange={(e) => setDireccionFiscal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Comercial & Finanzas */}
          {activeTab === "financiero" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Condición de Pago: Dropdown Contado / Crédito / Otro */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Condición de Pago
                  </label>
                  <select
                    value={condicionPagoTipo}
                    onChange={(e) => {
                      const val = e.target.value as "Contado" | "Crédito" | "Otro";
                      setCondicionPagoTipo(val);
                      if (val === "Contado") setDiasCredito(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden font-medium"
                  >
                    <option value="Contado">Contado</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Otro">Otro (Especificar)</option>
                  </select>
                </div>

                {/* Subfield if Crédito or Otro */}
                {condicionPagoTipo === "Crédito" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Días de Crédito
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="15, 30, 45..."
                      value={diasCredito || ""}
                      onChange={(e) => setDiasCredito(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden font-semibold text-[#0C3F69]"
                    />
                  </div>
                ) : condicionPagoTipo === "Otro" ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Especificar Condición
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 50% anticipo / 50% entrega"
                      value={condicionPagoCustom}
                      onChange={(e) => setCondicionPagoCustom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Plazo
                    </label>
                    <div className="px-3 py-2 bg-gray-100 rounded-xl text-xs text-gray-500 font-medium">
                      Inmediato (0 días)
                    </div>
                  </div>
                )}

                {/* Moneda Habitual */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Moneda Habitual
                  </label>
                  <select
                    value={monedaHabitual}
                    onChange={(e) => setMonedaHabitual(e.target.value as MonedaHabitual)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden font-medium"
                  >
                    <option value="USD">USD - Dólares</option>
                    <option value="VES">VES - Bolívares</option>
                    <option value="EUR">EUR - Euros</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <span className="text-xs font-bold text-gray-800 block">Retenciones Fiscales SENIAT</span>
                <div className="flex gap-6">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={retencionIva}
                      onChange={(e) => setRetencionIva(e.target.checked)}
                      className="rounded-sm border-gray-300 text-[#0C3F69] focus:ring-[#0C3F69]"
                    />
                    <span>Aplica Retención de IVA (75% / 100%)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={retencionIslr}
                      onChange={(e) => setRetencionIslr(e.target.checked)}
                      className="rounded-sm border-gray-300 text-[#0C3F69] focus:ring-[#0C3F69]"
                    />
                    <span>Aplica Retención de ISLR</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notas u Observaciones Internas
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre acuerdos comerciales, especificaciones de entrega, historial..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                />
              </div>

              {isEditing && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Motivo del Cambio (para auditoría)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Actualización de teléfonos de contacto y condición de pago"
                    value={motivoEdicion}
                    onChange={(e) => setMotivoEdicion(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Cuenta Bancaria Inicial (Creation Only) */}
          {!isEditing && activeTab === "banco" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">¿Registrar cuenta bancaria ahora?</span>
                  <span className="text-[11px] text-gray-500">También podrás agregar cuentas más tarde desde la ficha</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasInitialBank}
                  onChange={(e) => setHasInitialBank(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-[#0C3F69] focus:ring-[#0C3F69]"
                />
              </div>

              {hasInitialBank && (
                <div className="space-y-4 bg-blue-50/40 p-4 rounded-xl border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Banco
                      </label>
                      <select
                        value={bankBanco}
                        onChange={(e) => setBankBanco(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                      >
                        {BANCOS_VENEZUELA.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tipo de Cuenta
                      </label>
                      <select
                        value={bankTipo}
                        onChange={(e) => setBankTipo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                      >
                        <option value="corriente">Corriente</option>
                        <option value="ahorro">Ahorro</option>
                        <option value="dolares">Divisas / Nacional</option>
                        <option value="internacional">Internacional</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Número de Cuenta (20 dígitos)
                    </label>
                    <input
                      type="text"
                      placeholder="0102 0000 00 0000000000"
                      value={bankCuenta}
                      onChange={(e) => setBankCuenta(e.target.value.replace(/[^0-9]/g, "").slice(0, 20))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono tracking-wider focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {bankCuenta.length}/20 dígitos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nombre del Titular
                      </label>
                      <input
                        type="text"
                        placeholder="Si difiere de la razón social"
                        value={bankTitular}
                        onChange={(e) => setBankTitular(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Teléfono Pago Móvil
                      </label>
                      <input
                        type="tel"
                        placeholder="04141234567"
                        value={bankPagoMovil}
                        onChange={(e) => setBankPagoMovil(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0C3F69]/20 focus:border-[#0C3F69] outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0C3F69] hover:bg-[#145C8F] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Proveedor"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
