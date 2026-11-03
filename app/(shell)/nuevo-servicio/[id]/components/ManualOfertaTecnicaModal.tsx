"use client";

import { useState } from "react";
import {
  BookOpen,
  X,
  Target,
  ShieldCheck,
  FileCheck2,
  Clock,
  Sparkles,
  AlertTriangle,
  FileText,
  ChevronRight,
  Layers,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ManualOfertaTecnicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPreset?: (presetType: "iper" | "quimicos") => void;
}

export default function ManualOfertaTecnicaModal({
  isOpen,
  onClose,
  onLoadPreset,
}: ManualOfertaTecnicaModalProps) {
  const [activeTab, setActiveTab] = useState<
    "intro" | "secciones" | "alcance" | "entregables" | "ejemplos" | "checklist"
  >("intro");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 text-white p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <BookOpen className="h-6 w-6 text-slate-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  Guía Práctica: Elaboración de Ofertas Técnicas
                </h2>
                <Badge className="bg-white/10 text-slate-300 text-xs border border-white/15">
                  Servicios Técnicos SHA
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Manual metodológico para convertir solicitudes de Negocios en propuestas técnicas ejecutables y de alto impacto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab("intro")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "intro"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            1. Propósito y Flujo
          </button>
          <button
            onClick={() => setActiveTab("secciones")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "secciones"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            2. Estructura & Objetivos
          </button>
          <button
            onClick={() => setActiveTab("alcance")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "alcance"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            3. Inclusiones vs Exclusiones
          </button>
          <button
            onClick={() => setActiveTab("entregables")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "entregables"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            4. Tiempos & Entregables
          </button>
          <button
            onClick={() => setActiveTab("ejemplos")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "ejemplos"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            5. Plantillas & Casos Reales
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "checklist"
                ? "border-slate-900 text-slate-900 bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            6. Checklist de Control
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-gray-700 leading-relaxed">
          {/* TAB 1: INTRODUCCIÓN Y FLUJO */}
          {activeTab === "intro" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-slate-600" />
                  El puente entre Negocios y Servicios Técnicos
                </h3>
                <p className="text-slate-700 text-xs mt-1">
                  Cuando el equipo comercial (Negocios) registra una solicitud de nuevo servicio (formato interno RG-NEG-003),
                  esta representa una necesidad o intención del cliente. El rol de Servicios Técnicos es realizar la investigación,
                  definir la metodología rigurosa y plasmar un documento formal que sirva tanto de propuesta técnica como de plan de ejecución:
                  la <strong>Oferta Técnica</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                  <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs">1</span>
                    Entrada (Negocios)
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Necesidad del Cliente</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Nombre tentativo, objetivo general, empresa solicitante y requerimientos preliminares.
                  </p>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                  <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs">2</span>
                    Investigación Técnica
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Análisis y Diseño (ST)</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Búsqueda normativa (COVENIN, INPSASEL), formulación de objetivos, delimitación de alcance y estimación de recursos.
                  </p>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                  <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs">3</span>
                    Salida Formal
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm">Oferta Técnica (PDF)</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Documento formal emitido con membrete oficial, entregables tangibles, exclusiones claras y condiciones de servicio.
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60">
                <h4 className="font-bold text-gray-900 text-sm mb-2">¿Para qué se utiliza la Oferta Técnica generada?</h4>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Soporte para Negocios / Cotización:</strong> El equipo comercial adjunta esta propuesta técnica a la cotización económica para el cliente.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Ficha de Ejecución Operativa:</strong> Define exactamente qué hará el personal técnico en campo y qué formatos debe levantar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Blindaje de Responsabilidad:</strong> Delimita las exclusiones (lo que no incluye) para evitar que el cliente exija alcances fuera de presupuesto.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: ESTRUCTURA Y OBJETIVOS */}
          {activeTab === "secciones" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Estructura Fundamental de la Oferta</h3>
                <p className="text-xs text-gray-500">
                  Una oferta técnica profesional sigue 8 secciones cardinales ordenadas lógicamente:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sección 1</span>
                  <h4 className="font-bold text-gray-900 text-sm">Propósito del Servicio</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Debe redactarse en infinitivo (<em>"Realizar...", "Desarrollar...", "Evaluar..."</em>) y responder a tres preguntas:
                    <strong> ¿Qué se hará?</strong>, <strong>¿Con qué enfoque técnico o normativo?</strong> y <strong>¿Para qué beneficio o mitigación de riesgo?</strong>.
                  </p>
                  <div className="mt-2 text-xs bg-gray-50 p-2.5 rounded border border-gray-200 italic text-gray-700">
                    Ejemplo: "Realizar estudio sistemático y estructurado para identificar los peligros, evaluar los riesgos y determinar medidas de control en puestos y áreas de trabajo, a fin de priorizar las situaciones de riesgo en función de su criticidad."
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sección 2</span>
                  <h4 className="font-bold text-gray-900 text-sm">Objetivos Específicos</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Deben ser metas verificables y secuenciales de la ejecución. Es recomendable listar entre 4 y 10 objetivos que describan el paso a paso del servicio:
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-gray-600 list-disc list-inside">
                    <li>Paso 1: Aplicación de instrumentos y levantamiento de inventario en campo.</li>
                    <li>Paso 2: Análisis técnico y revisión de documentación (FDS/SDS, perfiles de cargo, normativas).</li>
                    <li>Paso 3: Evaluación y jerarquización de riesgos o incompatibilidades.</li>
                    <li>Paso 4: Formulación de controles, layout o inducción técnica.</li>
                    <li>Paso 5: Emisión del informe técnico con diagnóstico, conclusiones y recomendaciones.</li>
                  </ul>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sección 3</span>
                  <h4 className="font-bold text-gray-900 text-sm">Normas y Metodología Aplicables</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Cita con precisión las normas COVENIN, Normas Técnicas del INPSASEL (ej. NT 04-2023), leyes marco (LOPCYMAT, Ley de Sustancias Peligrosas)
                    o estándares corporativos (KORE, ISO 45001, SGA/GHS).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INCLUSIONES VS EXCLUSIONES */}
          {activeTab === "alcance" && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  La Regla de Oro: Definir claramente lo que NO incluye
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  En servicios técnicos y de consultoría, los conflictos más comunes con clientes surgen por suposiciones no aclaradas.
                  Redactar una sección explícita de <strong>"Lo que no incluye el servicio"</strong> blinda contractualmente a SHA de Venezuela
                  y protege el presupuesto de costos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lo que incluye */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Lo que INCLUYE el Servicio
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Visita técnica y levantamiento de información en campo.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Procesamiento de datos e investigación normativa en gabinete.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Elaboración de matrices, informes y recomendaciones técnicas.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Horas de inducción al personal (si está presupuestado).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Reunión de apertura y entrega del informe final digital/impreso.</span>
                    </li>
                  </ul>
                </div>

                {/* Lo que NO incluye */}
                <div className="p-4 bg-red-50/50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Lo que NO INCLUYE (Exclusiones)
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-600 font-bold">✕</span>
                      <span>Ejecución física de reorganizaciones, mudanzas o adecuaciones civiles.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-600 font-bold">✕</span>
                      <span>Ensayos de laboratorio fisicoquímico (se usan SDS de fabricantes).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-600 font-bold">✕</span>
                      <span>Suministro de estanterías, gabinetes, kits de derrames o EPP.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-600 font-bold">✕</span>
                      <span>Gestión, transporte o disposición final de residuos peligrosos.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-red-600 font-bold">✕</span>
                      <span>Mediciones ambientales cuantitativas no contratadas expresamente.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TIEMPOS Y ENTREGABLES */}
          {activeTab === "entregables" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Desglose de Duración y Entregables Tangibles</h3>
                <p className="text-xs text-gray-500">
                  El cliente y el equipo de compras necesitan visualizar plazos realistas y los productos concretos que recibirán.
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                  División de Tiempos: Campo vs Gabinete
                </h4>
                <p className="text-xs text-gray-600">
                  Nunca indiques un plazo único total sin desglosar. La experiencia demuestra que la recolección en campo depende de la operatividad
                  de la planta, mientras que el informe técnico depende de los analistas de SHA:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <strong>1. Días de Campo (Levantamiento):</strong>
                    <p className="text-gray-500 mt-0.5">Tiempo en instalaciones del cliente para inspecciones, toma de datos, fotos y entrevistas.</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <strong>2. Días de Informe (Gabinete):</strong>
                    <p className="text-gray-500 mt-0.5">Tiempo para tabular información, procesar matrices, redactar conclusiones y validar internamente.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-slate-600" />
                  Entregables Tangibles y sus Formatos
                </h4>
                <p className="text-xs text-gray-600">
                  Cada entregable debe especificar su nombre, una breve descripción de contenido y su formato de entrega (PDF, Excel, PPT):
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200">
                    <div>
                      <span className="font-semibold text-gray-900">1. Informe Técnico con Diagnóstico Situacional</span>
                      <p className="text-gray-500 text-[11px]">Auditoría de cumplimiento, fotografías, hallazgos y plan de acción.</p>
                    </div>
                    <Badge className="bg-white text-gray-700 border-gray-300">Digital PDF / Impreso</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200">
                    <div>
                      <span className="font-semibold text-gray-900">2. Matriz Operativa de Gestión (IPER o Compatibilidad)</span>
                      <p className="text-gray-500 text-[11px]">Archivo de cálculo paramétrico para uso diario por los supervisores.</p>
                    </div>
                    <Badge className="bg-white text-gray-700 border-gray-300">Excel (.xlsx)</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200">
                    <div>
                      <span className="font-semibold text-gray-900">3. Presentación Ejecutiva Gerencial</span>
                      <p className="text-gray-500 text-[11px]">Resumen de alto nivel con hallazgos clave para directores y gerentes.</p>
                    </div>
                    <Badge className="bg-white text-gray-700 border-gray-300">PowerPoint (PPTX)</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PLANTILLAS Y CASOS REALES */}
          {activeTab === "ejemplos" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-1">Plantillas Preconfiguradas Disponibles</h3>
                <p className="text-xs text-gray-500">
                  Puedes cargar cualquiera de estas plantillas oficiales directamente en el editor para ahorrar tiempo y mantener la uniformidad corporativa:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card IPER */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Plantilla 01</span>
                      <span className="text-xs text-gray-400">2 Páginas estándar</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mt-2">
                      Matriz IPER (Identificación de Peligros y Evaluación de Riesgos)
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Ideal para evaluaciones generales de seguridad en plantas industriales, talleres, almacenes y oficinas bajo COVENIN 4004 y NT 04-2023.
                    </p>
                  </div>
                  {onLoadPreset && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs border-gray-300 text-slate-700 hover:bg-gray-100"
                      onClick={() => onLoadPreset("iper")}
                    >
                      Cargar Plantilla IPER en el Editor
                    </Button>
                  )}
                </div>

                {/* Card Químicos */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Plantilla 02</span>
                      <span className="text-xs text-gray-400">3 Páginas avanzada</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mt-2">
                      Estudio de Compatibilidad de Productos Químicos
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Enfocado en almacenamiento seguro, segregación por FDS/SDS, layouts de almacén, SGA y estándares corporativos tipo KORE.
                    </p>
                  </div>
                  {onLoadPreset && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs border-gray-300 text-slate-700 hover:bg-gray-100"
                      onClick={() => onLoadPreset("quimicos")}
                    >
                      Cargar Plantilla Químicos en el Editor
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CHECKLIST DE CONTROL */}
          {activeTab === "checklist" && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-emerald-600" />
                  Lista de Verificación de Calidad antes de Emitir la Oferta
                </h3>
                <p className="text-xs text-emerald-800 mt-1">
                  Antes de descargar o enviar la Oferta Técnica a Negocios, valida que cumpla estos 6 puntos clave:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">1</div>
                  <div>
                    <strong>¿El título coincide exactamente con la necesidad técnica requerida?</strong>
                    <p className="text-gray-500 mt-0.5">Evita términos ambiguos como "Asesoría general" y utiliza nombres descriptivos ("Estudio de Compatibilidad...", "Evaluación IPER...").</p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">2</div>
                  <div>
                    <strong>¿Están claramente delimitadas las exclusiones ("Lo que no incluye")?</strong>
                    <p className="text-gray-500 mt-0.5">Verifica que no quede abierta la posibilidad de que el cliente exija compras de equipos u obras civiles.</p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">3</div>
                  <div>
                    <strong>¿Los objetivos específicos cubren el ciclo completo del servicio?</strong>
                    <p className="text-gray-500 mt-0.5">Desde el levantamiento inicial hasta la emisión y presentación del informe final.</p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">4</div>
                  <div>
                    <strong>¿Las normas citadas corresponden con el marco regulatorio vigente?</strong>
                    <p className="text-gray-500 mt-0.5">Revisa que las normas COVENIN o resoluciones INPSASEL citadas no estén derogadas.</p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">5</div>
                  <div>
                    <strong>¿Los entregables tienen formato definido (PDF, Excel, PPT)?</strong>
                    <p className="text-gray-500 mt-0.5">Brinda certeza al cliente sobre el producto digital o físico que recibirá al culminar el servicio.</p>
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">6</div>
                  <div>
                    <strong>¿Los términos de garantía y preaviso están incluidos?</strong>
                    <p className="text-gray-500 mt-0.5">Asegura los 30 días de garantía y el preaviso de 24 horas para reprogramaciones operativas.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            SHA de Venezuela, C.A. · Departamento de Servicios Técnicos & Calidad
          </p>
          <Button onClick={onClose} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
            Entendido / Cerrar Guía
          </Button>
        </div>
      </div>
    </div>
  );
}
