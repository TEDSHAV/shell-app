"use client";

import { useState } from "react";
import {
  X,
  Save,
  Plus,
  Trash2,
  BookOpen,
  Sparkles,
  FileText,
  Clock,
  ShieldCheck,
  Target,
  FileCheck2,
  Layers,
  RotateCcw,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  type OfertaTecnicaData,
  type DisenoServicioFullData,
  DEFAULT_TERMINOS_CONDICIONES,
  PRESET_IPER,
  PRESET_QUIMICOS,
  createDefaultOfertaTecnicaFromSolicitud,
} from "@/types/diseno-servicio";

interface OfertaTecnicaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: OfertaTecnicaData) => void;
  currentData: OfertaTecnicaData | null;
  solicitud: DisenoServicioFullData;
  onOpenManual: () => void;
}

export default function OfertaTecnicaEditorModal({
  isOpen,
  onClose,
  onSave,
  currentData,
  solicitud,
  onOpenManual,
}: OfertaTecnicaEditorModalProps) {
  // Initialize state
  const [formData, setFormData] = useState<OfertaTecnicaData>(() => {
    if (currentData && currentData.titulo_servicio) {
      return currentData;
    }
    return createDefaultOfertaTecnicaFromSolicitud(
      solicitud,
      solicitud.bloque_recursos_requisitos,
      solicitud.bloque_planificacion_factibilidad,
    );
  });

  const [activeTab, setActiveTab] = useState<
    "general" | "objetivos" | "alcance" | "normas" | "entregables" | "terminos"
  >("general");

  // Temporary inputs for adding items
  const [newObjetivo, setNewObjetivo] = useState("");
  const [newIncluye, setNewIncluye] = useState("");
  const [newNoIncluye, setNewNoIncluye] = useState("");
  const [newNorma, setNewNorma] = useState("");
  const [newEquipo, setNewEquipo] = useState("");
  const [newPersonal, setNewPersonal] = useState("");
  const [newTermino, setNewTermino] = useState("");

  // New Deliverable draft
  const [newEntregable, setNewEntregable] = useState({
    titulo: "",
    descripcion: "",
    formato: "Digital (PDF)",
  });

  if (!isOpen) return null;

  const handleSyncFromForm = () => {
    if (
      confirm(
        "¿Desea prellenar la Oferta Técnica con los datos actuales de la solicitud? Los cambios no guardados se actualizarán.",
      )
    ) {
      const generated = createDefaultOfertaTecnicaFromSolicitud(
        solicitud,
        solicitud.bloque_recursos_requisitos,
        solicitud.bloque_planificacion_factibilidad,
      );
      setFormData(generated);
    }
  };

  const handleLoadPreset = (type: "iper" | "quimicos") => {
    const name = type === "iper" ? "Matriz IPER" : "Compatibilidad Química";
    if (confirm(`¿Cargar la plantilla oficial de ${name}?`)) {
      setFormData(type === "iper" ? { ...PRESET_IPER } : { ...PRESET_QUIMICOS });
    }
  };

  const handleSaveAndClose = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <FileText className="h-6 w-6 text-slate-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  Editor de Oferta Técnica (Cliente)
                </h2>
                <Badge className="bg-white/10 text-slate-300 text-xs border border-white/15">
                  {formData.revision || "Rev. 00"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Elabora el documento técnico y plan de ejecución que se entregará al cliente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenManual}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs flex items-center gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Manual de Elaboración
            </Button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-slate-50 border-b border-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Acciones rápidas:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncFromForm}
              className="h-7 text-xs bg-white text-slate-700 border-gray-300 hover:bg-gray-100"
            >
              <Sparkles className="h-3 w-3 mr-1 text-slate-600" />
              Sincronizar con Solicitud
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoadPreset("iper")}
              className="h-7 text-xs bg-white text-slate-700 border-gray-300 hover:bg-gray-100"
            >
              Cargar Plantilla IPER
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoadPreset("quimicos")}
              className="h-7 text-xs bg-white text-slate-700 border-gray-300 hover:bg-gray-100"
            >
              Cargar Plantilla Químicos
            </Button>
          </div>
          <span className="text-gray-500 text-[11px]">
            * Los cambios se aplican al cerrar o guardar
          </span>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-gray-200 bg-gray-50/90 px-6 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "general"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            1. Identificación & Propósito
          </button>
          <button
            onClick={() => setActiveTab("objetivos")}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "objetivos"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            2. Objetivos ({formData.objetivos_especificos.length})
          </button>
          <button
            onClick={() => setActiveTab("alcance")}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "alcance"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            3. Alcance & Exclusiones
          </button>
          <button
            onClick={() => setActiveTab("normas")}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "normas"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            4. Normas & Recursos
          </button>
          <button
            onClick={() => setActiveTab("entregables")}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "entregables"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            5. Duración & Entregables ({formData.entregables.length})
          </button>
          <button
            onClick={() => setActiveTab("terminos")}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "terminos"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            6. Términos & Garantía
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-gray-800">
          {/* TAB 1: IDENTIFICACIÓN & PROPÓSITO */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-gray-700">Título Formal del Servicio</Label>
                <Input
                  value={formData.titulo_servicio}
                  onChange={(e) => setFormData({ ...formData, titulo_servicio: e.target.value })}
                  placeholder="Ej: MATRIZ DE IDENTIFICACION DE PELIGRO Y EVALUACION DE RIESGO (IPER)"
                  className="mt-1 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-bold text-gray-700">N° de Presupuesto / Código</Label>
                  <Input
                    value={formData.codigo_presupuesto || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_presupuesto: e.target.value })}
                    placeholder="Ej: PRE-2026-0042"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-700">Fecha de Emisión</Label>
                  <Input
                    type="date"
                    value={formData.fecha_oferta || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_oferta: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-700">Revisión</Label>
                  <Input
                    value={formData.revision || ""}
                    onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                    placeholder="Ej: Rev. 00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-700">Ciudad / Lugar</Label>
                  <Input
                    value={formData.ciudad_lugar || ""}
                    onChange={(e) => setFormData({ ...formData, ciudad_lugar: e.target.value })}
                    placeholder="Ej: Puerto La Cruz"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">Cliente Receptor / Empresa</Label>
                <Input
                  value={formData.cliente_receptor || ""}
                  onChange={(e) => setFormData({ ...formData, cliente_receptor: e.target.value })}
                  placeholder="Ej: COCA-COLA FEMSA DE VENEZUELA"
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-bold text-gray-700">Propósito del Servicio</Label>
                  <span className="text-[11px] text-gray-500">Fundamentación técnica y objetivo general</span>
                </div>
                <Textarea
                  value={formData.proposito}
                  onChange={(e) => setFormData({ ...formData, proposito: e.target.value })}
                  rows={4}
                  placeholder="Realizar estudio sistemático y estructurado para identificar los peligros..."
                />
              </div>
            </div>
          )}

          {/* TAB 2: OBJETIVOS ESPECÍFICOS */}
          {activeTab === "objetivos" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Lista de Objetivos Específicos</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enumera las actividades y metas puntuales que componen la ejecución del servicio (se imprimirán numeradas).
                </p>
              </div>

              {/* Add form */}
              <div className="flex gap-2">
                <Input
                  value={newObjetivo}
                  onChange={(e) => setNewObjetivo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newObjetivo.trim()) {
                      e.preventDefault();
                      setFormData({
                        ...formData,
                        objetivos_especificos: [...formData.objetivos_especificos, newObjetivo.trim()],
                      });
                      setNewObjetivo("");
                    }
                  }}
                  placeholder="Escribe un objetivo específico y presiona Enter o Agregar..."
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newObjetivo.trim()) {
                      setFormData({
                        ...formData,
                        objetivos_especificos: [...formData.objetivos_especificos, newObjetivo.trim()],
                      });
                      setNewObjetivo("");
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>

              {/* List */}
              <div className="space-y-2 mt-3">
                {formData.objetivos_especificos.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4 text-center">
                    No se han registrado objetivos específicos aún.
                  </p>
                ) : (
                  formData.objetivos_especificos.map((obj, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group hover:bg-slate-100/60 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <Input
                        value={obj}
                        onChange={(e) => {
                          const updated = [...formData.objetivos_especificos];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, objetivos_especificos: updated });
                        }}
                        className="bg-transparent border-0 shadow-none focus-visible:ring-1 p-0 text-xs leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.objetivos_especificos.filter((_, i) => i !== idx);
                          setFormData({ ...formData, objetivos_especificos: updated });
                        }}
                        className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Eliminar objetivo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ALCANCE & EXCLUSIONES */}
          {activeTab === "alcance" && (
            <div className="space-y-5">
              <div>
                <Label className="text-xs font-bold text-gray-700">Ubicación / Centro de Trabajo</Label>
                <Input
                  value={formData.alcance_ubicacion || ""}
                  onChange={(e) => setFormData({ ...formData, alcance_ubicacion: e.target.value })}
                  placeholder="Ej: Instalaciones de planta ubicada en Barcelona, Edo. Anzoátegui"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Lo que incluye */}
                <div className="space-y-3 p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Lo que INCLUYE el Servicio
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newIncluye}
                      onChange={(e) => setNewIncluye(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newIncluye.trim()) {
                          e.preventDefault();
                          setFormData({
                            ...formData,
                            alcance_incluye: [...formData.alcance_incluye, newIncluye.trim()],
                          });
                          setNewIncluye("");
                        }
                      }}
                      placeholder="Nuevo elemento incluido..."
                      className="text-xs bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newIncluye.trim()) {
                          setFormData({
                            ...formData,
                            alcance_incluye: [...formData.alcance_incluye, newIncluye.trim()],
                          });
                          setNewIncluye("");
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {formData.alcance_incluye.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-emerald-100 text-xs"
                      >
                        <span className="flex-1 text-gray-700">• {item}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.alcance_incluye.filter((_, i) => i !== idx);
                            setFormData({ ...formData, alcance_incluye: updated });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lo que no incluye */}
                <div className="space-y-3 p-4 bg-red-50/40 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Lo que NO INCLUYE el Servicio (Exclusiones)
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newNoIncluye}
                      onChange={(e) => setNewNoIncluye(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newNoIncluye.trim()) {
                          e.preventDefault();
                          setFormData({
                            ...formData,
                            alcance_no_incluye: [...formData.alcance_no_incluye, newNoIncluye.trim()],
                          });
                          setNewNoIncluye("");
                        }
                      }}
                      placeholder="Nueva exclusión de servicio..."
                      className="text-xs bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newNoIncluye.trim()) {
                          setFormData({
                            ...formData,
                            alcance_no_incluye: [...formData.alcance_no_incluye, newNoIncluye.trim()],
                          });
                          setNewNoIncluye("");
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white shrink-0 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {formData.alcance_no_incluye.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-red-100 text-xs"
                      >
                        <span className="flex-1 text-gray-700">✕ {item}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.alcance_no_incluye.filter((_, i) => i !== idx);
                            setFormData({ ...formData, alcance_no_incluye: updated });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NORMAS & RECURSOS */}
          {activeTab === "normas" && (
            <div className="space-y-5">
              {/* Normas */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-gray-700">
                  Normas y Metodología Aplicables (COVENIN, NT INPSASEL, Leyes)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newNorma}
                    onChange={(e) => setNewNorma(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newNorma.trim()) {
                        e.preventDefault();
                        setFormData({
                          ...formData,
                          normas_metodologia: [...formData.normas_metodologia, newNorma.trim()],
                        });
                        setNewNorma("");
                      }
                    }}
                    placeholder="Ej: Norma COVENIN 4004. Sistema de Gestión..."
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (newNorma.trim()) {
                        setFormData({
                          ...formData,
                          normas_metodologia: [...formData.normas_metodologia, newNorma.trim()],
                        });
                        setNewNorma("");
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {formData.normas_metodologia.map((norm, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                    >
                      <span className="flex-1 text-gray-700">- {norm}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.normas_metodologia.filter((_, i) => i !== idx);
                          setFormData({ ...formData, normas_metodologia: updated });
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instrumentos y Equipos */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-gray-700">
                  Instrumentos y Equipos Requeridos
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newEquipo}
                    onChange={(e) => setNewEquipo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newEquipo.trim()) {
                        e.preventDefault();
                        setFormData({
                          ...formData,
                          instrumentos_equipos: [...formData.instrumentos_equipos, newEquipo.trim()],
                        });
                        setNewEquipo("");
                      }
                    }}
                    placeholder="Ej: Formatos estandarizados de inspección, Sonómetro..."
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (newEquipo.trim()) {
                        setFormData({
                          ...formData,
                          instrumentos_equipos: [...formData.instrumentos_equipos, newEquipo.trim()],
                        });
                        setNewEquipo("");
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {formData.instrumentos_equipos.map((eq, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                    >
                      <span className="flex-1 text-gray-700">- {eq}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.instrumentos_equipos.filter((_, i) => i !== idx);
                          setFormData({ ...formData, instrumentos_equipos: updated });
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Asignado */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-gray-700">
                  Recurso Humano Asignado para la Evaluación
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newPersonal}
                    onChange={(e) => setNewPersonal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPersonal.trim()) {
                        e.preventDefault();
                        setFormData({
                          ...formData,
                          recurso_humano: [...formData.recurso_humano, newPersonal.trim()],
                        });
                        setNewPersonal("");
                      }
                    }}
                    placeholder="Ej: (01) Coordinador Técnico, (01) Analista de Servicios..."
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (newPersonal.trim()) {
                        setFormData({
                          ...formData,
                          recurso_humano: [...formData.recurso_humano, newPersonal.trim()],
                        });
                        setNewPersonal("");
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {formData.recurso_humano.map((rh, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                    >
                      <span className="flex-1 text-gray-700">- {rh}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.recurso_humano.filter((_, i) => i !== idx);
                          setFormData({ ...formData, recurso_humano: updated });
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TIEMPOS & ENTREGABLES */}
          {activeTab === "entregables" && (
            <div className="space-y-5">
              {/* Duración */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-600" />
                  Duración y Desglose Operativo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Duración Total Estimada</Label>
                    <Input
                      value={formData.duracion?.total_estimado || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duracion: { ...formData.duracion, total_estimado: e.target.value },
                        })
                      }
                      placeholder="Ej: 10 días hábiles"
                      className="mt-1 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Días en Campo (Recolección)</Label>
                    <Input
                      value={formData.duracion?.dias_campo || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duracion: { ...formData.duracion, dias_campo: e.target.value },
                        })
                      }
                      placeholder="Ej: 03 días hábiles en campo"
                      className="mt-1 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Días en Informe (Gabinete)</Label>
                    <Input
                      value={formData.duracion?.dias_informe || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duracion: { ...formData.duracion, dias_informe: e.target.value },
                        })
                      }
                      placeholder="Ej: 07 días hábiles para informe"
                      className="mt-1 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Entregables */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700">
                    Entregables Tangibles para el Cliente
                  </Label>
                  <span className="text-[11px] text-gray-500">Documentos que se consignarán</span>
                </div>

                {/* Add deliverable draft */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      value={newEntregable.titulo}
                      onChange={(e) => setNewEntregable({ ...newEntregable, titulo: e.target.value })}
                      placeholder="Título del entregable..."
                      className="sm:col-span-2 text-xs bg-white"
                    />
                    <Input
                      value={newEntregable.formato}
                      onChange={(e) => setNewEntregable({ ...newEntregable, formato: e.target.value })}
                      placeholder="Formato (PDF, Excel, PPT)..."
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newEntregable.descripcion}
                      onChange={(e) => setNewEntregable({ ...newEntregable, descripcion: e.target.value })}
                      placeholder="Breve descripción del contenido o alcance..."
                      className="text-xs bg-white flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (newEntregable.titulo.trim()) {
                          setFormData({
                            ...formData,
                            entregables: [
                              ...formData.entregables,
                              {
                                id: `ent-${Date.now()}`,
                                titulo: newEntregable.titulo.trim(),
                                formato: newEntregable.formato.trim(),
                                descripcion: newEntregable.descripcion.trim(),
                              },
                            ],
                          });
                          setNewEntregable({
                            titulo: "",
                            descripcion: "",
                            formato: "Digital (PDF)",
                          });
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Agregar Entregable
                    </Button>
                  </div>
                </div>

                {/* List of deliverables */}
                <div className="space-y-2">
                  {formData.entregables.map((ent, idx) => (
                    <div
                      key={ent.id || idx}
                      className="p-3 bg-white border border-gray-200 rounded-lg flex items-start justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-xs">
                            {idx + 1}. {ent.titulo}
                          </span>
                          {ent.formato && (
                            <Badge className="text-[10px] bg-slate-100 text-slate-700 border-gray-200">
                              {ent.formato}
                            </Badge>
                          )}
                        </div>
                        {ent.descripcion && (
                          <p className="text-[11px] text-gray-500 leading-relaxed">{ent.descripcion}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.entregables.filter((_, i) => i !== idx);
                          setFormData({ ...formData, entregables: updated });
                        }}
                        className="text-gray-400 hover:text-red-500 p-1 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TÉRMINOS & CONDICIONES */}
          {activeTab === "terminos" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-gray-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm">Consideraciones y Términos de Servicio</h3>
                    <Badge className="bg-slate-200 text-slate-800 border-gray-300 text-xs">
                      {formData.terminos_condiciones.length} cláusula{formData.terminos_condiciones.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Puedes agregar, editar el texto completo, reordenar y eliminar cualquier cláusula que aparecerá en la Oferta Técnica.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      terminos_condiciones: [...DEFAULT_TERMINOS_CONDICIONES],
                    })
                  }
                  className="text-xs text-gray-700 border-gray-300 hover:bg-white shrink-0 self-start sm:self-auto"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
                  Restaurar Estándar SHA
                </Button>
              </div>

              {/* Add new clause */}
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                <Label className="text-xs font-semibold text-gray-700">Agregar Nueva Cláusula Personalizada</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Textarea
                    value={newTermino}
                    onChange={(e) => setNewTermino(e.target.value)}
                    placeholder="Escribe aquí los términos, garantías o condiciones específicas para este servicio o cliente..."
                    rows={2}
                    className="text-xs resize-y"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (newTermino.trim()) {
                        setFormData({
                          ...formData,
                          terminos_condiciones: [...formData.terminos_condiciones, newTermino.trim()],
                        });
                        setNewTermino("");
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs self-end sm:self-auto h-auto py-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Agregar
                  </Button>
                </div>
              </div>

              {/* Quick library presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Cláusulas Frecuentes SHA (Clic para agregar si no está en la lista):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Garantía técnica de revisión por 30 días calendario.",
                    "SHA de Venezuela dispondrá de 03 a 05 días hábiles para entrega final.",
                    "Toda reprogramación debe notificarse con al menos 24 horas de anticipación.",
                    "El cliente garantiza condiciones seguras de operación y acompañamiento de especialistas.",
                    "Inducciones de seguridad >4h deben notificarse en la reunión de apertura.",
                    "SHA mantendrá estricta confidencialidad de la información y resultados técnicos recopilados.",
                  ].map((preset, i) => {
                    const exists = formData.terminos_condiciones.some((t) => t.includes(preset.slice(0, 25)));
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={exists}
                        onClick={() => {
                          if (!exists) {
                            setFormData({
                              ...formData,
                              terminos_condiciones: [...formData.terminos_condiciones, preset],
                            });
                          }
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all text-left ${
                          exists
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {exists ? "✓ " : "+ "}
                        {preset.slice(0, 48)}...
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* List of terms */}
              <div className="space-y-3">
                {formData.terminos_condiciones.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">No hay cláusulas definidas para esta Oferta Técnica.</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          terminos_condiciones: [...DEFAULT_TERMINOS_CONDICIONES],
                        })
                      }
                      className="text-xs text-slate-800 hover:underline mt-1"
                    >
                      Cargar cláusulas estándar de SHA
                    </Button>
                  </div>
                ) : (
                  formData.terminos_condiciones.map((term, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-slate-400 transition-colors space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            Término / Condición #{idx + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Move Up */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              if (idx > 0) {
                                const updated = [...formData.terminos_condiciones];
                                const temp = updated[idx - 1];
                                updated[idx - 1] = updated[idx];
                                updated[idx] = temp;
                                setFormData({ ...formData, terminos_condiciones: updated });
                              }
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${
                              idx === 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-gray-800"
                            }`}
                            title="Mover arriba"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          {/* Move Down */}
                          <button
                            type="button"
                            disabled={idx === formData.terminos_condiciones.length - 1}
                            onClick={() => {
                              if (idx < formData.terminos_condiciones.length - 1) {
                                const updated = [...formData.terminos_condiciones];
                                const temp = updated[idx + 1];
                                updated[idx + 1] = updated[idx];
                                updated[idx] = temp;
                                setFormData({ ...formData, terminos_condiciones: updated });
                              }
                            }}
                            className={`p-1 rounded hover:bg-gray-100 ${
                              idx === formData.terminos_condiciones.length - 1
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-500 hover:text-gray-800"
                            }`}
                            title="Mover abajo"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.terminos_condiciones.filter((_, i) => i !== idx);
                              setFormData({ ...formData, terminos_condiciones: updated });
                            }}
                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 ml-1"
                            title="Eliminar cláusula"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <Textarea
                        value={term}
                        rows={Math.max(2, Math.ceil(term.length / 90))}
                        onChange={(e) => {
                          const updated = [...formData.terminos_condiciones];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, terminos_condiciones: updated });
                        }}
                        className="text-xs leading-relaxed border-gray-200 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 bg-gray-50/50 hover:bg-white"
                        placeholder="Redacta la cláusula técnica o condición de servicio..."
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-gray-500">
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveAndClose}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              Guardar y Aplicar a la Solicitud
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
