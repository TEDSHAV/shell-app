"use client";

import React, { useRef } from "react";
import { X, Printer, Building2, MapPin, CreditCard, ShieldCheck } from "lucide-react";
import type { ProveedorWithDetails, DatoBancarioProveedor } from "@/types/proveedores";
import { PROVEEDOR_IMPACTO_LABELS, PROVEEDOR_ESTADO_LABELS } from "@/types/proveedores";

interface ProveedorFichaModalProps {
  proveedor: ProveedorWithDetails | null;
  cuentasBancarias?: DatoBancarioProveedor[];
  onClose: () => void;
}

export default function ProveedorFichaModal({
  proveedor,
  cuentasBancarias = [],
  onClose,
}: ProveedorFichaModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!proveedor) return null;

  const handlePrint = () => {
    window.print();
  };

  const cuentas = cuentasBancarias.length > 0 ? cuentasBancarias : (proveedor.cuentas_bancarias || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header (Screen Only) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#0C3F69] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Ficha Oficial del Proveedor
              </h2>
              <p className="text-xs text-gray-500">
                Visualización corporativa para auditoría y guardado en PDF
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0C3F69] hover:bg-[#145C8F] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Body */}
        <div className="p-4 sm:p-8 overflow-y-auto print:p-6 print:m-0" ref={printRef} id="printable-ficha">
          {/* Print Header */}
          <div className="flex items-start justify-between border-b-2 border-[#0C3F69] pb-5 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-[#0C3F69]">SHA DE VENEZUELA</span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">C.A.</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Administración & Compras • RIF J-31315131-9</p>
              <h1 className="text-xl font-bold text-gray-900 mt-3">
                REGISTRO Y FICHA TÉCNICA DE PROVEEDOR
              </h1>
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                proveedor.impacto_nivel === "alto" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
              }`}>
                {PROVEEDOR_IMPACTO_LABELS[proveedor.impacto_nivel] || "Impacto General"}
              </span>
              <p className="text-[11px] text-gray-500 mt-1">
                Estado: <strong>{PROVEEDOR_ESTADO_LABELS[proveedor.estado_operativo] || proveedor.estado_operativo}</strong>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Emitido: {new Date().toLocaleDateString("es-VE", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Section 1: Datos de Identificación y Legales */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0C3F69]" />
              1. Identificación y Clasificación
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Razón Social / Nombre</span>
                <span className="text-sm font-bold text-gray-900 block mt-0.5">{proveedor.nombre_razon_social}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Cédula / RIF (CI / RIF)</span>
                <span className="text-sm font-bold text-gray-900 block mt-0.5">{proveedor.rif_proveedor || "No registrado"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Vencimiento RIF</span>
                <span className="text-sm font-medium text-gray-900 block mt-0.5">
                  {proveedor.fecha_vencimiento_rif || "No especificado"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Rubro / Categoría</span>
                <span className="text-xs font-semibold text-gray-800 block mt-0.5">
                  {proveedor.producto_servicio_admin || "General"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Nivel de Impacto Operativo</span>
                <span className={`text-xs font-bold block mt-0.5 ${proveedor.impacto_nivel === "alto" ? "text-red-700" : "text-blue-700"}`}>
                  {proveedor.impacto_nivel === "alto" ? "🔴 Alto Impacto (Crítico)" : "🔵 Bajo Impacto (Soporte)"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Condición de Pago</span>
                <span className="text-xs font-semibold text-gray-800 block mt-0.5">
                  {proveedor.condicion_pago || "Contado"}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Contacto & Ubicación */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-1">
              <MapPin className="w-3.5 h-3.5 text-[#0C3F69]" />
              2. Contacto y Domicilio Fiscal
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Persona de Contacto</span>
                <span className="text-xs font-semibold text-gray-900 block mt-0.5">
                  {proveedor.persona_contacto || "No especificado"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Cédula de Contacto</span>
                <span className="text-xs text-gray-800 block mt-0.5">{proveedor.cedula_contacto || "—"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Teléfono</span>
                <span className="text-xs font-medium text-gray-900 block mt-0.5">{proveedor.telefono || "—"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Correo Electrónico</span>
                <span className="text-xs text-gray-900 block mt-0.5 font-mono">{proveedor.email || "—"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Estado / Ciudad</span>
                <span className="text-xs text-gray-900 block mt-0.5">
                  {[proveedor.ciudad_nombre, proveedor.estado_nombre].filter(Boolean).join(", ") || "Venezuela"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Dirección Fiscal</span>
                <span className="text-xs text-gray-800 block mt-0.5">{proveedor.direccion_fiscal || "—"}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Condiciones Comerciales y Bancarias */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-1">
              <CreditCard className="w-3.5 h-3.5 text-[#0C3F69]" />
              3. Condiciones Financieras y Datos Bancarios
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200 mb-3 text-xs">
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Condición de Pago</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{proveedor.condicion_pago || "Contado"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Días de Crédito</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{proveedor.dias_credito ? `${proveedor.dias_credito} días` : "0 (Contado)"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Moneda Habitual</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{proveedor.moneda_habitual || "USD"}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-gray-400 block">Retenciones Fiscales</span>
                <span className="font-medium text-gray-800 mt-0.5 block">
                  IVA: {proveedor.retencion_iva ? "Aplica" : "No"} | ISLR: {proveedor.retencion_islr ? "Aplica" : "No"}
                </span>
              </div>
            </div>

            {/* Bank Accounts Table */}
            {cuentas.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Banco</th>
                      <th className="py-2.5 px-3">Número de Cuenta</th>
                      <th className="py-2.5 px-3">Titular / Cédula o RIF</th>
                      <th className="py-2.5 px-3">Pago Móvil</th>
                      <th className="py-2.5 px-3 text-center">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cuentas.map((c: DatoBancarioProveedor) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-semibold text-gray-900">
                          {c.banco}
                          {c.es_principal && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Principal
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-gray-800 tracking-wider">
                          {c.nro_cuenta}
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">
                          <div>{c.nombre_titular || proveedor.nombre_razon_social}</div>
                          <div className="text-[10px] text-gray-400">{c.cedula_titular || proveedor.rif_proveedor}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">
                          {c.telefono_pago_movil || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center capitalize text-gray-600">
                          {c.tipo_cuenta || "Corriente"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 text-center">
                Sin cuentas bancarias registradas actualmente.
              </div>
            )}
          </div>

          {/* Section 4: Notas u Observaciones */}
          {proveedor.notas_observaciones && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                4. Observaciones
              </h3>
              <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-200">
                {proveedor.notas_observaciones}
              </p>
            </div>
          )}

          {/* Signatures & Approval Footer */}
          <div className="mt-10 pt-6 border-t border-gray-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-14 border-b border-gray-300 w-48 mx-auto" />
              <p className="font-bold text-gray-800 mt-1">Elaborado por</p>
              <p className="text-[11px] text-gray-500">Administración & Compras</p>
            </div>
            <div>
              <div className="h-14 border-b border-gray-300 w-48 mx-auto" />
              <p className="font-bold text-gray-800 mt-1">Revisado y Aprobado</p>
              <p className="text-[11px] text-gray-500">Gerencia de Operaciones / Finanzas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
