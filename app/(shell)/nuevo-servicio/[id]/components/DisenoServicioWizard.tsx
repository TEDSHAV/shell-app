"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Save,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  ExternalLink,
  BookOpen,
  Edit2,
  Check,
  X,
  MessageSquare,
  GraduationCap,
  Wrench,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CostTable from "./CostTable";
import ManualOfertaTecnicaModal from "./ManualOfertaTecnicaModal";
import OfertaTecnicaEditorModal from "./OfertaTecnicaEditorModal";
import FichaTecnicaEditorModal from "./FichaTecnicaEditorModal";
import DisenoNotasModal from "../../components/DisenoNotasModal";
import {
  saveBloqueRecursos,
  saveBloqueHigiene,
  saveBloquePlanificacion,
  saveBloqueControles,
  saveBloqueSalidas,
  finalizarSolicitud,
  updateNombreSugerido,
  saveOfertaTecnicaAction,
  saveFichaTecnicaAction,
} from "@/actions/diseno-servicio";
import {
  CAP_CHECKLIST_ITEMS,
  ST_CHECKLIST_ITEMS,
  EMPTY_BLOQUE_RECURSOS,
  EMPTY_BLOQUE_HIGIENE,
  EMPTY_BLOQUE_PLANIFICACION,
  EMPTY_BLOQUE_CONTROLES,
  EMPTY_BLOQUE_SALIDAS,
  type DisenoServicioFullData,
  type BloqueRecursosRequisitos,
  type BloqueHigieneSeguridadAmbiente,
  type BloquePlanificacionFactibilidad,
  type BloqueControlesDiseno,
  type BloqueSalidasDiseno,
  type OfertaTecnicaData,
  type FichaTecnicaData,
  createDefaultOfertaTecnicaFromSolicitud,
  createDefaultFichaTecnicaFromSolicitud,
} from "@/types/diseno-servicio";

const STEPS = [
  { label: "Cabecera", description: "Datos de cabecera" },
  { label: "Recursos", description: "Recursos y requisitos" },
  { label: "Higiene y Ambiente", description: "Seguridad y ambiente" },
  { label: "Factibilidad", description: "Planificación y costos" },
  { label: "Controles", description: "Controles del diseño" },
  { label: "Salidas", description: "Salidas y documentación técnica" },
];

const LIST_PATH = "/nuevo-servicio";

export default function DisenoServicioWizard({
  solicitud,
  userData,
  initialReadOnly = false,
  canEditFinished = false,
}: {
  solicitud: DisenoServicioFullData;
  userData: any;
  initialReadOnly?: boolean;
  canEditFinished?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompleted = solicitud.id_estatus === 38;

  const [isReadOnly, setIsReadOnly] = useState<boolean>(() => {
    if (searchParams.get("mode") === "readonly") return true;
    if (initialReadOnly) return true;
    // Completed designs are read-only UNLESS the user has coordinator, leader, TED, or admin privileges
    if (isCompleted && !canEditFinished) return true;
    return false;
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showFinalizeSuccess, setShowFinalizeSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Modals state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesCount, setNotesCount] = useState<number>(() => (solicitud as any)?.notas_count || 0);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isOfertaModalOpen, setIsOfertaModalOpen] = useState(false);
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false);

  // Suggested title state
  const [nombreSugerido, setNombreSugerido] = useState(solicitud.nombre_sugerido || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(solicitud.nombre_sugerido || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const handleSaveTitle = async () => {
    const trimmed = tempTitle.trim();
    if (!trimmed) {
      alert("El nombre sugerido no puede estar vacío");
      return;
    }
    setIsSavingTitle(true);
    try {
      await updateNombreSugerido(solicitud.id, trimmed);
      setNombreSugerido(trimmed);
      setIsEditingTitle(false);
      showSaveMessage("success", "Título actualizado con éxito");
    } catch {
      showSaveMessage("error", "Error al actualizar el título");
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Determine service nature (CAP vs ST)
  const rawNaturaleza = (solicitud.bloque_recursos_requisitos as any)?.tipo_naturaleza_servicio;
  const isCAP =
    rawNaturaleza === "cap" ||
    solicitud.id_departamento_ejecutante === 3 ||
    solicitud.tipo_servicio?.toLowerCase().includes("cap");

  // Blocks state with robust deep merging to prevent undefined nested properties
  const [bloqueRecursos, setBloqueRecursos] = useState<BloqueRecursosRequisitos>(() => {
    const raw = solicitud.bloque_recursos_requisitos || ({} as any);
    return {
      ...EMPTY_BLOQUE_RECURSOS,
      ...raw,
      objetivo: raw.objetivo || solicitud.objetivo_proposito || "",
      proposito: raw.proposito || solicitud.objetivo_proposito || "",
      tipo_naturaleza_servicio: raw.tipo_naturaleza_servicio || (isCAP ? "cap" : "st"),
      antecedentes: {
        ...EMPTY_BLOQUE_RECURSOS.antecedentes,
        ...(raw.antecedentes || {}),
      },
    };
  });

  const [bloqueHigiene, setBloqueHigiene] = useState<BloqueHigieneSeguridadAmbiente>(() => {
    const raw = solicitud.bloque_higiene_seguridad_ambiente || ({} as any);
    return {
      ambiental: {
        ...EMPTY_BLOQUE_HIGIENE.ambiental,
        ...(raw.ambiental || {}),
      },
      peligros: {
        ...EMPTY_BLOQUE_HIGIENE.peligros,
        ...(raw.peligros || {}),
      },
    };
  });

  const [bloquePlanificacion, setBloquePlanificacion] = useState<BloquePlanificacionFactibilidad>(() => {
    const raw = solicitud.bloque_planificacion_factibilidad || ({} as any);
    return {
      ...EMPTY_BLOQUE_PLANIFICACION,
      ...raw,
      aprobacion: {
        ...EMPTY_BLOQUE_PLANIFICACION.aprobacion,
        ...(raw.aprobacion || {}),
      },
      estructura_costos: raw.estructura_costos || [],
    };
  });

  const [bloqueControles, setBloqueControles] = useState<BloqueControlesDiseno>(() => {
    const raw = solicitud.bloque_controles_diseno || ({} as any);
    return {
      revision: { ...EMPTY_BLOQUE_CONTROLES.revision, ...(raw.revision || {}) },
      verificacion: { ...EMPTY_BLOQUE_CONTROLES.verificacion, ...(raw.verificacion || {}) },
      validacion: { ...EMPTY_BLOQUE_CONTROLES.validacion, ...(raw.validacion || {}) },
    };
  });

  const [bloqueSalidas, setBloqueSalidas] = useState<BloqueSalidasDiseno>(() => {
    const raw = solicitud.bloque_salidas_diseno || EMPTY_BLOQUE_SALIDAS;
    const existingChecklist = raw.checklist || [];
    const existingCap = raw.checklist_cap || [];

    const baseStList =
      existingChecklist.length > 0
        ? existingChecklist
        : ST_CHECKLIST_ITEMS.map((item) => ({
            item,
            aplica: isCAP ? ("no_aplica" as const) : ("" as const),
            especifique: "",
          }));

    const baseCapList =
      existingCap.length > 0
        ? existingCap
        : CAP_CHECKLIST_ITEMS.map((item) => ({
            item,
            aplica: !isCAP ? ("no_aplica" as const) : ("" as const),
            especifique: "",
          }));

    return {
      ...EMPTY_BLOQUE_SALIDAS,
      ...raw,
      checklist: baseStList,
      checklist_cap: baseCapList,
    };
  });

  const showSaveMessage = (type: "success" | "error", text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const handleSave = async (stepIndex: number, advance = false) => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      switch (stepIndex) {
        case 1:
          await saveBloqueRecursos(solicitud.id, bloqueRecursos);
          break;
        case 2:
          await saveBloqueHigiene(solicitud.id, bloqueHigiene);
          break;
        case 3:
          await saveBloquePlanificacion(solicitud.id, bloquePlanificacion);
          break;
        case 4:
          await saveBloqueControles(solicitud.id, bloqueControles);
          break;
        case 5:
          await saveBloqueSalidas(solicitud.id, bloqueSalidas);
          break;
      }
      showSaveMessage("success", "Datos guardados exitosamente.");
      if (advance && currentStep < 5) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error("Save error:", error);
      showSaveMessage("error", "Error al guardar los datos.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    setIsSaving(true);
    try {
      await saveBloqueSalidas(solicitud.id, bloqueSalidas);
      await finalizarSolicitud(solicitud.id);
      setShowFinalizeConfirm(false);
      setShowFinalizeSuccess(true);
      setTimeout(() => {
        router.push(LIST_PATH);
      }, 3500);
    } catch (error) {
      console.error("Finalize error:", error);
      showSaveMessage("error", "Error al finalizar la solicitud.");
    } finally {
      setIsSaving(false);
    }
  };

  // PDF rendering of complete design document (client-side)
  const renderPdfBlob = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { default: DisenoServicioPdfDocument } = await import("./DisenoServicioPdfDocument");
    return pdf(<DisenoServicioPdfDocument solicitud={{ ...solicitud, nombre_sugerido: nombreSugerido }} />).toBlob();
  };

  const handlePrintPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await renderPdfBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF del expediente");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner / Actions Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="h-8 text-sm font-semibold max-w-md"
                  placeholder="Nombre del servicio"
                />
                <Button
                  size="sm"
                  onClick={handleSaveTitle}
                  disabled={isSavingTitle}
                  className="h-8 px-2.5 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTempTitle(nombreSugerido);
                    setIsEditingTitle(false);
                  }}
                  className="h-8 px-2 text-gray-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-base">{nombreSugerido}</span>
                {!isReadOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingTitle(true)}
                    className="h-7 w-7 text-gray-400 hover:text-gray-700"
                    title="Editar nombre sugerido"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
            <Badge className={isCAP ? "bg-purple-100 text-purple-800 border-purple-300" : "bg-orange-100 text-orange-800 border-orange-300"}>
              {isCAP ? "Capacitación" : "Servicios Técnicos"}
            </Badge>
            <Badge className={isCompleted ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}>
              {solicitud.estatus_nombre || "Pendiente"}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            Solicitante: <span className="font-medium text-gray-700">{solicitud.solicitante_nombre || "—"}</span> ({solicitud.solicitante_departamento || "—"})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Notes Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsNotesOpen(true)}
            className="text-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 h-8"
          >
            <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
            Notas
            {notesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
                {notesCount}
              </span>
            )}
          </Button>

          {/* Full Design PDF */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintPdf}
            disabled={isGeneratingPdf}
            className="text-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 h-8"
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
            {isGeneratingPdf ? "Generando..." : "Ver formato de Solicitud"}
          </Button>
        </div>
      </div>

      {/* Save Notification */}
      {saveMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
            saveMessage.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {saveMessage.text}
        </div>
      )}

      {/* Step Stepper Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === idx;
          const isDone = currentStep > idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-50 border-indigo-500 shadow-2xs"
                  : isDone
                  ? "bg-white border-gray-300 hover:bg-gray-50"
                  : "bg-gray-50 border-gray-200 opacity-75 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isDone ? "✓" : idx + 1}
                </span>
                <span className={`text-xs font-semibold line-clamp-1 ${isActive ? "text-indigo-900" : "text-gray-700"}`}>
                  {step.label}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 line-clamp-1">{step.description}</p>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="shadow-xs border-gray-200">
        <CardHeader className="border-b border-gray-100 pb-3">
          <CardTitle className="text-base font-bold text-gray-900">
            {STEPS[currentStep].label} — {STEPS[currentStep].description}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* STEP 0: Cabecera */}
          {currentStep === 0 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs">Tipo de Solicitud</Label>
                  <p className="font-semibold text-gray-800 capitalize">
                    {solicitud.tipo_solicitud || "Creación"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs">Fecha de Solicitud</Label>
                  <p className="font-semibold text-gray-800">
                    {solicitud.fecha_solicitud
                      ? new Date(solicitud.fecha_solicitud).toLocaleDateString("es-VE")
                      : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs">Departamento Ejecutor</Label>
                  <p className="font-semibold text-gray-800">
                    {isCAP ? "Capacitación (CAP)" : "Servicios Técnicos (ST)"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-gray-700 font-semibold text-xs">
                  Objetivo / Propósito de la Solicitud (Negocios)
                </Label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 leading-relaxed">
                  {solicitud.objetivo_proposito || "No especificado por el solicitante."}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Recursos y Requisitos */}
          {currentStep === 1 && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700 text-xs">Objetivo Específico del Servicio</Label>
                <Textarea
                  rows={3}
                  value={bloqueRecursos.objetivo_especifico || ""}
                  onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, objetivo_especifico: e.target.value })}
                  placeholder="Detalle los objetivos específicos que debe cumplir el diseño del servicio..."
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 text-xs">Personal Requerido</Label>
                  <Textarea
                    rows={2}
                    value={bloqueRecursos.personal_requerido || ""}
                    onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, personal_requerido: e.target.value })}
                    placeholder="Perfiles técnicos, facilitadores o especialistas..."
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 text-xs">Equipos y Herramientas</Label>
                  <Textarea
                    rows={2}
                    value={bloqueRecursos.equipos_herramientas || ""}
                    onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, equipos_herramientas: e.target.value })}
                    placeholder="Equipos de medición, transporte, computación..."
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 text-xs">Software / Plataforma</Label>
                  <Textarea
                    rows={2}
                    value={bloqueRecursos.software || ""}
                    onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, software: e.target.value })}
                    placeholder="Software especializado, LMS, herramientas digitales..."
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 text-xs">Infraestructura</Label>
                  <Textarea
                    rows={2}
                    value={bloqueRecursos.infraestructura || ""}
                    onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, infraestructura: e.target.value })}
                    placeholder="Aulas, laboratorios, talleres o locaciones cliente..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700 text-xs">Requisitos Legales y Normativos</Label>
                <Textarea
                  rows={2}
                  value={bloqueRecursos.requisitos_legales || ""}
                  onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, requisitos_legales: e.target.value })}
                  placeholder="LOPCYMAT, COVENIN, ISO, INPSASEL u otras leyes aplicables..."
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700 text-xs">Requisitos del Cliente</Label>
                <Textarea
                  rows={2}
                  value={bloqueRecursos.requisitos_cliente || ""}
                  onChange={(e) => setBloqueRecursos({ ...bloqueRecursos, requisitos_cliente: e.target.value })}
                  placeholder="Expectativas, alcance acordado o condiciones especiales..."
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Higiene, Seguridad y Ambiente */}
          {currentStep === 2 && (
            <div className="space-y-5 text-xs">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <Label className="font-bold text-gray-900 text-xs block">Aspectos Ambientales</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bloqueHigiene.ambiental?.generacion_residuos || false}
                      onChange={(e) =>
                        setBloqueHigiene({
                          ...bloqueHigiene,
                          ambiental: {
                            ...(bloqueHigiene.ambiental || EMPTY_BLOQUE_HIGIENE.ambiental),
                            generacion_residuos: e.target.checked,
                          },
                        })
                      }
                      disabled={isReadOnly}
                      className="accent-indigo-600"
                    />
                    <span>Generación de Residuos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bloqueHigiene.ambiental?.consumo_energia || false}
                      onChange={(e) =>
                        setBloqueHigiene({
                          ...bloqueHigiene,
                          ambiental: {
                            ...(bloqueHigiene.ambiental || EMPTY_BLOQUE_HIGIENE.ambiental),
                            consumo_energia: e.target.checked,
                          },
                        })
                      }
                      disabled={isReadOnly}
                      className="accent-indigo-600"
                    />
                    <span>Consumo de Energía</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bloqueHigiene.ambiental?.emisiones_vertidos || false}
                      onChange={(e) =>
                        setBloqueHigiene({
                          ...bloqueHigiene,
                          ambiental: {
                            ...(bloqueHigiene.ambiental || EMPTY_BLOQUE_HIGIENE.ambiental),
                            emisiones_vertidos: e.target.checked,
                          },
                        })
                      }
                      disabled={isReadOnly}
                      className="accent-indigo-600"
                    />
                    <span>Emisiones o Vertidos</span>
                  </label>
                </div>
                <div className="pt-2">
                  <Label className="font-semibold text-gray-700 text-xs">Nivel de Significancia Ambiental</Label>
                  <Input
                    value={bloqueHigiene.ambiental?.significancia || ""}
                    onChange={(e) =>
                      setBloqueHigiene({
                        ...bloqueHigiene,
                        ambiental: {
                          ...(bloqueHigiene.ambiental || EMPTY_BLOQUE_HIGIENE.ambiental),
                          significancia: e.target.value,
                        },
                      })
                    }
                    placeholder="Baja, Moderada, Alta..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <Label className="font-bold text-gray-900 text-xs block">Peligros Ocupacionales Asociados</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries({
                    biologicos: "Biológicos",
                    mecanicos: "Mecánicos",
                    ergonomicos: "Ergonómicos",
                    electricos: "Eléctricos",
                    quimicos: "Químicos",
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean((bloqueHigiene.peligros as any)?.[key])}
                        onChange={(e) =>
                          setBloqueHigiene({
                            ...bloqueHigiene,
                            peligros: {
                              ...(bloqueHigiene.peligros || EMPTY_BLOQUE_HIGIENE.peligros),
                              [key]: e.target.checked,
                            },
                          })
                        }
                        disabled={isReadOnly}
                        className="accent-indigo-600"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="pt-2">
                  <Label className="font-semibold text-gray-700 text-xs">Descripción de Medidas Preventivas</Label>
                  <Textarea
                    rows={2}
                    value={bloqueHigiene.peligros?.descripcion || ""}
                    onChange={(e) =>
                      setBloqueHigiene({
                        ...bloqueHigiene,
                        peligros: {
                          ...(bloqueHigiene.peligros || EMPTY_BLOQUE_HIGIENE.peligros),
                          descripcion: e.target.value,
                        },
                      })
                    }
                    placeholder="Medidas de control para el personal que ejecutará el servicio..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Planificación y Factibilidad */}
          {currentStep === 3 && (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 text-xs">Tiempo Estimado de Desarrollo</Label>
                  <Input
                    value={bloquePlanificacion.tiempo_estimado || ""}
                    onChange={(e) =>
                      setBloquePlanificacion({ ...bloquePlanificacion, tiempo_estimado: e.target.value })
                    }
                    placeholder="EJ: 2 semanas, 10 días hábiles..."
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 text-xs">Fecha Estimada de Finalización</Label>
                  <Input
                    type="date"
                    value={bloquePlanificacion.fecha_estimada_finalizacion || ""}
                    onChange={(e) =>
                      setBloquePlanificacion({
                        ...bloquePlanificacion,
                        fecha_estimada_finalizacion: e.target.value,
                      })
                    }
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 text-xs">Viabilidad Técnica</Label>
                  <select
                    value={bloquePlanificacion.viabilidad_tecnica || ""}
                    onChange={(e) =>
                      setBloquePlanificacion({
                        ...bloquePlanificacion,
                        viabilidad_tecnica: e.target.value as any,
                      })
                    }
                    disabled={isReadOnly}
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs"
                  >
                    <option value="">Seleccione...</option>
                    <option value="favorable">Favorable</option>
                    <option value="no_favorable">No Favorable</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700 text-xs">Viabilidad Económica</Label>
                  <select
                    value={bloquePlanificacion.viabilidad_economica || ""}
                    onChange={(e) =>
                      setBloquePlanificacion({
                        ...bloquePlanificacion,
                        viabilidad_economica: e.target.value as any,
                      })
                    }
                    disabled={isReadOnly}
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs"
                  >
                    <option value="">Seleccione...</option>
                    <option value="favorable">Favorable</option>
                    <option value="no_favorable">No Favorable</option>
                  </select>
                </div>
              </div>

              {/* Estructura de Costos */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <Label className="font-bold text-gray-900 text-xs block">
                  Estructura de Costos del Desarrollo
                </Label>
                <CostTable
                  items={bloquePlanificacion.estructura_costos || []}
                  readOnly={isReadOnly}
                  onChange={(items) => {
                    const total = items.reduce((acc, curr) => acc + (curr.total || 0), 0);
                    setBloquePlanificacion({
                      ...bloquePlanificacion,
                      estructura_costos: items,
                      costo_total: total,
                    });
                  }}
                />
              </div>

              {/* Aprobación de Inicio de Diseño */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <Label className="font-bold text-gray-900 text-xs block">
                  Aprobación de Inicio de Diseño
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={bloquePlanificacion.aprobacion?.aprobado || false}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        const isApproved = e.target.checked;
                        setBloquePlanificacion({
                          ...bloquePlanificacion,
                          aprobacion: {
                            nombre: isApproved
                              ? bloquePlanificacion.aprobacion?.nombre || userData?.nombre_apellido || ""
                              : "",
                            cargo: isApproved
                              ? bloquePlanificacion.aprobacion?.cargo || userData?.cargo || userData?.rol || userData?.role || solicitud.cargo_solicitante || ""
                              : "",
                            fecha: isApproved
                              ? bloquePlanificacion.aprobacion?.fecha || new Date().toISOString().split("T")[0]
                              : "",
                            aprobado: isApproved,
                          },
                        });
                      }}
                      className="accent-indigo-600 rounded"
                    />
                    <Label className="text-xs font-medium text-gray-800">
                      Aprobar inicio de diseño
                    </Label>
                  </div>

                  {bloquePlanificacion.aprobacion?.aprobado && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">Nombre del Aprobador</Label>
                        <Input
                          value={bloquePlanificacion.aprobacion?.nombre || ""}
                          onChange={(e) =>
                            setBloquePlanificacion({
                              ...bloquePlanificacion,
                              aprobacion: {
                                ...(bloquePlanificacion.aprobacion || EMPTY_BLOQUE_PLANIFICACION.aprobacion),
                                nombre: e.target.value,
                              },
                            })
                          }
                          placeholder="Nombre y apellido..."
                          disabled={isReadOnly}
                          className="h-8 text-xs bg-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">Cargo del Aprobador</Label>
                        <Input
                          value={bloquePlanificacion.aprobacion?.cargo || ""}
                          onChange={(e) =>
                            setBloquePlanificacion({
                              ...bloquePlanificacion,
                              aprobacion: {
                                ...(bloquePlanificacion.aprobacion || EMPTY_BLOQUE_PLANIFICACION.aprobacion),
                                cargo: e.target.value,
                              },
                            })
                          }
                          placeholder="Cargo..."
                          disabled={isReadOnly}
                          className="h-8 text-xs bg-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-gray-700">Fecha de Aprobación</Label>
                        <Input
                          type="date"
                          value={bloquePlanificacion.aprobacion?.fecha || ""}
                          onChange={(e) =>
                            setBloquePlanificacion({
                              ...bloquePlanificacion,
                              aprobacion: {
                                ...(bloquePlanificacion.aprobacion || EMPTY_BLOQUE_PLANIFICACION.aprobacion),
                                fecha: e.target.value,
                              },
                            })
                          }
                          disabled={isReadOnly}
                          className="h-8 text-xs bg-white mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Controles del Diseño */}
          {currentStep === 4 && (
            <div className="space-y-5 text-xs">
              {(["revision", "verificacion", "validacion"] as const).map((stage, i) => {
                const stageNames = {
                  revision: "Revisión del Diseño (Entradas y requisitos)",
                  verificacion: "Verificación del Diseño (Cumplimiento de especificaciones)",
                  validacion: "Validación del Diseño (Prueba piloto o aptitud de uso)",
                };
                const val = bloqueControles[stage] || EMPTY_BLOQUE_CONTROLES[stage];
                return (
                  <div key={stage} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-gray-900 text-xs">
                        {i + 1}. {stageNames[stage]}
                      </Label>
                      <select
                        value={val.resultado || ""}
                        onChange={(e) =>
                          setBloqueControles({
                            ...bloqueControles,
                            [stage]: {
                              ...(bloqueControles[stage] || EMPTY_BLOQUE_CONTROLES[stage]),
                              resultado: e.target.value as any,
                            },
                          })
                        }
                        disabled={isReadOnly}
                        className="h-7 text-xs rounded border border-gray-300 bg-white px-2"
                      >
                        <option value="">Resultado...</option>
                        <option value="conforme">Conforme</option>
                        <option value="no_conforme">No Conforme</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-500 text-[11px]">Responsable</Label>
                        <Input
                          value={val.responsable || ""}
                          onChange={(e) =>
                            setBloqueControles({
                              ...bloqueControles,
                              [stage]: {
                                ...(bloqueControles[stage] || EMPTY_BLOQUE_CONTROLES[stage]),
                                responsable: e.target.value,
                              },
                            })
                          }
                          placeholder="Nombre y cargo..."
                          disabled={isReadOnly}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-500 text-[11px]">Fecha</Label>
                        <Input
                          type="date"
                          value={val.fecha || ""}
                          onChange={(e) =>
                            setBloqueControles({
                              ...bloqueControles,
                              [stage]: {
                                ...(bloqueControles[stage] || EMPTY_BLOQUE_CONTROLES[stage]),
                                fecha: e.target.value,
                              },
                            })
                          }
                          disabled={isReadOnly}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-500 text-[11px]">Descripción / Hallazgos</Label>
                      <Textarea
                        rows={2}
                        value={val.descripcion || ""}
                        onChange={(e) =>
                          setBloqueControles({
                            ...bloqueControles,
                            [stage]: {
                              ...(bloqueControles[stage] || EMPTY_BLOQUE_CONTROLES[stage]),
                              descripcion: e.target.value,
                            },
                          })
                        }
                        placeholder="Evidencia de la revisión, verificación o validación..."
                        disabled={isReadOnly}
                        className="text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 5: Salidas del Diseño */}
          {currentStep === 5 && (
            <div className="space-y-6 text-xs">
              {/* Checklists */}
              <div className="space-y-4">
                <Label className="font-bold text-gray-900 text-xs block">
                  Checklist de Entregables Técnicos
                </Label>

                {isCAP ? (
                  /* CAP Checklist */
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-purple-900 bg-purple-50 px-3 py-2 rounded-t border border-purple-200">
                      Entregables de Capacitación (CAP)
                    </div>
                    {bloqueSalidas.checklist_cap.map((checkItem, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <Label className="text-xs font-medium text-gray-800">{checkItem.item}</Label>
                        </div>
                        <div className="flex items-center gap-4">
                          <RadioGroup
                            value={checkItem.aplica}
                            onValueChange={(val) => {
                              if (isReadOnly) return;
                              const newChecklist = [...bloqueSalidas.checklist_cap];
                              newChecklist[idx] = { ...checkItem, aplica: val as any };
                              setBloqueSalidas({ ...bloqueSalidas, checklist_cap: newChecklist });
                            }}
                            className="flex gap-3"
                          >
                            <div className="flex items-center gap-1">
                              <RadioGroupItem value="aplica" disabled={isReadOnly} />
                              <Label className="text-xs">Aplica</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <RadioGroupItem value="no_aplica" disabled={isReadOnly} />
                              <Label className="text-xs">No Aplica</Label>
                            </div>
                          </RadioGroup>
                          {checkItem.aplica === "aplica" && (
                            <Input
                              value={checkItem.especifique}
                              onChange={(e) => {
                                const newChecklist = [...bloqueSalidas.checklist_cap];
                                newChecklist[idx] = { ...checkItem, especifique: e.target.value };
                                setBloqueSalidas({ ...bloqueSalidas, checklist_cap: newChecklist });
                              }}
                              placeholder="Especifique"
                              className="h-8 w-40"
                              disabled={isReadOnly}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ST Checklist */
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-orange-900 bg-orange-50 px-3 py-2 rounded-t border border-orange-200">
                      Entregables de Servicios Técnicos (ST)
                    </div>
                    {bloqueSalidas.checklist.map((checkItem, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <Label className="text-xs font-medium text-gray-800">{checkItem.item}</Label>
                        </div>
                        <div className="flex items-center gap-4">
                          <RadioGroup
                            value={checkItem.aplica}
                            onValueChange={(val) => {
                              if (isReadOnly) return;
                              const newChecklist = [...bloqueSalidas.checklist];
                              newChecklist[idx] = { ...checkItem, aplica: val as any };
                              setBloqueSalidas({ ...bloqueSalidas, checklist: newChecklist });
                            }}
                            className="flex gap-3"
                          >
                            <div className="flex items-center gap-1">
                              <RadioGroupItem value="aplica" disabled={isReadOnly} />
                              <Label className="text-xs">Aplica</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <RadioGroupItem value="no_aplica" disabled={isReadOnly} />
                              <Label className="text-xs">No Aplica</Label>
                            </div>
                          </RadioGroup>
                          {checkItem.aplica === "aplica" && (
                            <Input
                              value={checkItem.especifique}
                              onChange={(e) => {
                                const newChecklist = [...bloqueSalidas.checklist];
                                newChecklist[idx] = { ...checkItem, especifique: e.target.value };
                                setBloqueSalidas({ ...bloqueSalidas, checklist: newChecklist });
                              }}
                              placeholder="Especifique"
                              className="h-8 w-40"
                              disabled={isReadOnly}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DEDICATED OUTPUT PANEL: Ficha Técnica (CAP) OR Oferta Técnica (ST) */}
              {isCAP ? (
                /* Capacitación: Ficha Técnica Panel */
                <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-700 text-white rounded-xl shadow-xs">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900">
                            Documento de Ficha Técnica de Curso (FT-CO)
                          </h3>
                          <Badge
                            className={
                              bloqueSalidas.ficha_tecnica
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]"
                                : "bg-purple-100 text-purple-800 border-purple-200 text-[10px]"
                            }
                          >
                            {bloqueSalidas.ficha_tecnica ? "Configurada" : "Borrador preliminar"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Estructura el contenido, objetivos pedagógicos y requisitos para el catálogo oficial de Capacitación.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isReadOnly && (
                        <Button
                          type="button"
                          onClick={() => setIsFichaModalOpen(true)}
                          className="h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded-lg px-3 shadow-xs inline-flex items-center gap-1.5 font-semibold transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          {bloqueSalidas.ficha_tecnica ? "Editar Ficha Técnica" : "Configurar Ficha Técnica"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-white rounded-lg border border-purple-100 p-4 text-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-gray-600">
                      <div>
                        <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider text-gray-400">
                          Título del Curso:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {bloqueSalidas.ficha_tecnica?.nombre || nombreSugerido || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider text-gray-400">
                          Carga Horaria:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {bloqueSalidas.ficha_tecnica?.carga_horaria_std || 8} Horas
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider text-gray-400">
                          Modalidad:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {bloqueSalidas.ficha_tecnica?.modalidad || "Presencial"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider text-gray-400">
                          Certificación:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {bloqueSalidas.ficha_tecnica?.nota_aprobatoria
                            ? `Aprobación (Mín: ${bloqueSalidas.ficha_tecnica.nota_aprobatoria})`
                            : "Participación"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-100 gap-2">
                      <span className="text-[11px] text-gray-500">
                        Formato oficial con sellos regulatorios (INPSASEL, SENCAMER, MINEC, INCES, MPPE) e ISO 9001.
                      </span>
                      <a
                        href={`/api/diseno-servicio/${solicitud.id}/ficha-tecnica-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-md px-2.5 inline-flex items-center gap-1.5 font-medium transition-colors"
                      >
                        <Printer className="h-3 w-3 text-purple-700" />
                        Ver PDF Ficha Técnica
                        <ExternalLink className="h-2.5 w-2.5 text-purple-500" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                /* Servicios Técnicos: Oferta Técnica Panel */
                <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-800 text-white rounded-xl shadow-xs">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900">
                            Documento de Oferta Técnica (Cliente)
                          </h3>
                          <Badge
                            className={
                              bloqueSalidas.oferta_tecnica
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]"
                                : "bg-slate-200 text-slate-800 border-slate-300 text-[10px]"
                            }
                          >
                            {bloqueSalidas.oferta_tecnica ? "Configurada" : "Borrador preliminar"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Elabora y personaliza la propuesta técnica formal con alcance, metodología y entregables.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsManualOpen(true)}
                        className="h-8 text-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-1.5"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-slate-600" />
                        Guía de Elaboración
                      </Button>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          onClick={() => setIsOfertaModalOpen(true)}
                          className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 shadow-xs inline-flex items-center gap-1.5 font-semibold transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          {bloqueSalidas.oferta_tecnica ? "Editar Oferta Técnica" : "Configurar Oferta Técnica"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-gray-600">
                      <div>
                        <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider text-gray-400">
                          Título del Servicio:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {bloqueSalidas.oferta_tecnica?.titulo_servicio || nombreSugerido || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider text-gray-400">
                          Objetivos Específicos:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {bloqueSalidas.oferta_tecnica?.objetivos_especificos?.length || 0} registrados
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider text-gray-400">
                          Entregables:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {bloqueSalidas.oferta_tecnica?.entregables?.length || 0} definidos
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block text-[11px] uppercase tracking-wider text-gray-400">
                          Duración Estimada:
                        </span>
                        <span className="text-gray-900 font-medium">
                          {bloqueSalidas.oferta_tecnica?.duracion?.total_estimado || "No definida"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-100 gap-2">
                      <span className="text-[11px] text-gray-500">
                        Formato oficial con sellos regulatorios (INPSASEL, SENCAMER, MINEC, INCES, SNC) e ISO 9001.
                      </span>
                      <a
                        href={`/api/diseno-servicio/${solicitud.id}/oferta-tecnica-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-md px-2.5 inline-flex items-center gap-1.5 font-medium transition-colors"
                      >
                        <Printer className="h-3 w-3 text-slate-600" />
                        Ver PDF Oferta
                        <ExternalLink className="h-2.5 w-2.5 text-slate-500" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Declaración de cumplimiento */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div>
                  <Label className="font-semibold text-gray-800 text-xs">
                    Declaración de Cumplimiento: ¿Las salidas del diseño cumplen con las entradas del Bloque I?
                  </Label>
                  <RadioGroup
                    value={
                      bloqueSalidas.declaracion_cumplimiento === null
                        ? ""
                        : bloqueSalidas.declaracion_cumplimiento
                        ? "si"
                        : "no"
                    }
                    onValueChange={(val) =>
                      !isReadOnly &&
                      setBloqueSalidas({ ...bloqueSalidas, declaracion_cumplimiento: val === "si" })
                    }
                    className="flex gap-6 mt-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="si" disabled={isReadOnly} />
                      <Label className="text-xs">Sí, cumple plenamente</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" disabled={isReadOnly} />
                      <Label className="text-xs">No cumple</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="font-semibold text-gray-800 text-xs">Observaciones Finales</Label>
                  <Textarea
                    value={bloqueSalidas.observaciones || ""}
                    onChange={(e) => setBloqueSalidas({ ...bloqueSalidas, observaciones: e.target.value })}
                    rows={2}
                    placeholder="Comentarios adicionales sobre el cierre del diseño..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              {/* Finalize Confirmation Banner */}
              {showFinalizeConfirm && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 animate-in fade-in">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900">
                      ¿Confirmas la finalización y aprobación de este diseño de servicio?
                    </p>
                    <p className="text-xs text-amber-800">
                      Al finalizar, esta solicitud quedará en estatus <strong>Completada</strong> y el nuevo servicio será <strong>incorporado automáticamente al Catálogo de Servicios (catalogo_servicios)</strong> para que Negocios y su departamento puedan presupuestarlo y operarlo.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleFinalize}
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4"
                    >
                      {isSaving ? "Finalizando y Sincronizando..." : "Sí, Finalizar y Publicar en Catálogo"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFinalizeConfirm(false)}
                      className="text-xs h-8"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {showFinalizeSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-medium animate-in fade-in">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">¡Solicitud finalizada con éxito!</p>
                    <p className="text-[11px] text-emerald-700">
                      El servicio ha sido aprobado y publicado en el Catálogo de Servicios. Redireccionando al listado...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0 || isSaving}
          className="flex gap-1.5 text-xs h-9"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <div className="flex items-center gap-2">
          {isReadOnly ? (
            currentStep < 5 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                className="flex gap-1.5 text-xs h-9 text-gray-700 hover:text-indigo-600"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            )
          ) : (
            <>
              {currentStep > 0 && currentStep < 5 && (
                <Button
                  variant="outline"
                  onClick={() => handleSave(currentStep, false)}
                  disabled={isSaving}
                  className="flex gap-1.5 text-xs h-9"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </Button>
              )}

              {currentStep < 5 && (
                <Button
                  onClick={() => handleSave(currentStep, true)}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex gap-1.5 text-xs h-9"
                >
                  {isSaving ? "Guardando..." : "Guardar y Continuar"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              {currentStep === 5 && !isCompleted && !isReadOnly && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleSave(5, false)}
                    disabled={isSaving}
                    className="flex gap-1.5 text-xs h-9"
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                  <Button
                    onClick={() => setShowFinalizeConfirm(true)}
                    disabled={isSaving || showFinalizeConfirm}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex gap-1.5 text-xs h-9 font-semibold"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Finalizar Solicitud
                  </Button>
                </>
              )}

              {currentStep === 5 && isCompleted && !isReadOnly && (
                <Button
                  onClick={() => handleSave(5, false)}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex gap-1.5 text-xs h-9 font-semibold"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Guardando cambios..." : "Guardar Cambios"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <DisenoNotasModal
        solicitudId={solicitud.id}
        solicitudNombre={nombreSugerido}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onNoteCountChange={(count) => setNotesCount(count)}
      />

      <ManualOfertaTecnicaModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      <OfertaTecnicaEditorModal
        isOpen={isOfertaModalOpen}
        onClose={() => setIsOfertaModalOpen(false)}
        onSave={async (updatedOferta) => {
          setBloqueSalidas((prev) => ({ ...prev, oferta_tecnica: updatedOferta }));
          await saveOfertaTecnicaAction(solicitud.id, updatedOferta);
          showSaveMessage("success", "Oferta técnica guardada con éxito.");
        }}
        currentData={bloqueSalidas.oferta_tecnica || null}
        solicitud={{ ...solicitud, nombre_sugerido: nombreSugerido }}
        onOpenManual={() => setIsManualOpen(true)}
      />

      <FichaTecnicaEditorModal
        isOpen={isFichaModalOpen}
        onClose={() => setIsFichaModalOpen(false)}
        onSave={async (updatedFicha) => {
          setBloqueSalidas((prev) => ({ ...prev, ficha_tecnica: updatedFicha }));
          await saveFichaTecnicaAction(solicitud.id, updatedFicha);
          showSaveMessage("success", "Ficha técnica guardada con éxito.");
        }}
        currentData={bloqueSalidas.ficha_tecnica || null}
        solicitud={{ ...solicitud, nombre_sugerido: nombreSugerido }}
      />
    </div>
  );
}
