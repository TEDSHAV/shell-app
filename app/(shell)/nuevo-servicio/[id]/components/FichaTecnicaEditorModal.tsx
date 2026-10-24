"use client";

import { useState, useEffect } from "react";
import {
  X,
  Save,
  RotateCcw,
  BookOpen,
  GraduationCap,
  Sparkles,
  Printer,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type {
  FichaTecnicaData,
  DisenoServicioFullData,
} from "@/types/diseno-servicio";
import { createDefaultFichaTecnicaFromSolicitud } from "@/types/diseno-servicio";

interface FichaTecnicaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: FichaTecnicaData) => void;
  currentData: FichaTecnicaData | null;
  solicitud: DisenoServicioFullData;
}

const CATEGORIAS_CURSOS = [
  "Seguridad y Salud en el Trabajo (SST)",
  "Higiene Ocupacional y Ergonomía",
  "Manejo y Transporte Seguro",
  "Prevención y Control de Incendios",
  "Gestión Ambiental y Desechos",
  "Sistemas de Gestión e ISO",
  "Operaciones y Mantenimiento Técnico",
  "Supervisión y Liderazgo de Campo",
];

export default function FichaTecnicaEditorModal({
  isOpen,
  onClose,
  onSave,
  currentData,
  solicitud,
}: FichaTecnicaEditorModalProps) {
  const [formData, setFormData] = useState<FichaTecnicaData>(() => {
    if (currentData && currentData.nombre) return currentData;
    return createDefaultFichaTecnicaFromSolicitud(
      solicitud,
      solicitud.bloque_recursos_requisitos
    );
  });

  const [tipoCert, setTipoCert] = useState<"aprobacion" | "participacion">(() => {
    return formData.nota_aprobatoria && formData.nota_aprobatoria > 0
      ? "aprobacion"
      : "participacion";
  });

  useEffect(() => {
    if (currentData && currentData.nombre) {
      setFormData(currentData);
      setTipoCert(
        currentData.nota_aprobatoria && currentData.nota_aprobatoria > 0
          ? "aprobacion"
          : "participacion"
      );
    }
  }, [currentData]);

  if (!isOpen) return null;

  const handleResetToDefault = () => {
    if (
      !confirm(
        "¿Deseas restablecer los datos de la ficha técnica con los valores sugeridos de la solicitud?"
      )
    )
      return;
    const generated = createDefaultFichaTecnicaFromSolicitud(
      solicitud,
      solicitud.bloque_recursos_requisitos
    );
    setFormData(generated);
    setTipoCert("aprobacion");
  };

  const handleSave = () => {
    const payload: FichaTecnicaData = {
      ...formData,
      nombre: formData.nombre.trim().toUpperCase(),
      subtitulo: formData.subtitulo?.trim() || null,
      carga_horaria_std: Number(formData.carga_horaria_std) || 8,
      nota_aprobatoria: tipoCert === "aprobacion" ? Number(formData.nota_aprobatoria || 14) : 0,
      cursoId: solicitud.id_servicio_relacionado || formData.cursoId || null,
    };
    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-700 text-white rounded-xl shadow-xs">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">
                  Ficha Técnica del Curso (FT-CO)
                </h3>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs font-semibold">
                  Capacitación
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Configura los parámetros académicos y pedagógicos oficiales que se registrarán en el catálogo de cursos.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-500">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Row 1: Nombre & Subtítulo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700 text-xs">
                Nombre Oficial del Curso <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="EJ: MANEJO DEFENSIVO Y SEGURIDAD VIAL"
                className="font-semibold tracking-wide uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700 text-xs">
                Subtítulo o Mención Especial (Opcional)
              </Label>
              <Input
                value={formData.subtitulo || ""}
                onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
                placeholder="EJ: Técnicas avanzadas de conducción en operaciones petroleras"
              />
            </div>
          </div>

          {/* Row 2: Modalidad, Horas, Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700 text-xs">Modalidad</Label>
              <select
                value={formData.modalidad || "Presencial"}
                onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs shadow-2xs focus:border-purple-600 focus:outline-hidden"
              >
                <option value="Presencial">Presencial (In-Company / Instalaciones SHA)</option>
                <option value="Online (Síncrono)">Online (Clase en vivo sincrónica)</option>
                <option value="Híbrido / Mixto">Híbrido (Teoría online + Práctica en campo)</option>
                <option value="Virtual (Asíncrono)">Virtual (Autoformación asincrónica)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700 text-xs">Carga Horaria Estándar (Horas)</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={formData.carga_horaria_std || 8}
                onChange={(e) =>
                  setFormData({ ...formData, carga_horaria_std: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700 text-xs">Categoría Temática</Label>
              <select
                value={formData.categoria || ""}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs shadow-2xs focus:border-purple-600 focus:outline-hidden"
              >
                <option value="">Seleccione categoría...</option>
                {CATEGORIAS_CURSOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Dirigido a / Perfil del Participante */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-gray-700 text-xs">
              Perfil del Participante / Dirigido a
            </Label>
            <Textarea
              rows={2}
              value={formData.para_quien || ""}
              onChange={(e) => setFormData({ ...formData, para_quien: e.target.value })}
              placeholder="Describa el público objetivo, cargos o niveles de experiencia requeridos..."
              className="resize-none"
            />
          </div>

          {/* Row 4: Objetivo General */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-gray-700 text-xs">Objetivo General</Label>
            <Textarea
              rows={3}
              value={formData.objetivo_general || ""}
              onChange={(e) => setFormData({ ...formData, objetivo_general: e.target.value })}
              placeholder="Describa la competencia macro o meta general de aprendizaje del participante..."
              className="resize-none"
            />
          </div>

          {/* Row 5: Objetivos Específicos */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-gray-700 text-xs">
                Objetivos Específicos (Uno por línea)
              </Label>
              <span className="text-[10px] text-gray-400">
                Se formatearán automáticamente con viñetas en el PDF
              </span>
            </div>
            <Textarea
              rows={4}
              value={formData.objetivo_especifico || ""}
              onChange={(e) => setFormData({ ...formData, objetivo_especifico: e.target.value })}
              placeholder="• Identificar los factores de riesgo...&#10;• Aplicar las normas de seguridad...&#10;• Evaluar las condiciones..."
              className="font-mono text-[11px]"
            />
          </div>

          {/* Row 6: Contenido Programático / Módulos */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-gray-700 text-xs">
                Contenido Programático (Módulos y Temas)
              </Label>
              <span className="text-[10px] text-gray-400">
                Líneas que inicien con &apos;Módulo&apos; o &apos;Tema&apos; se destacarán en negrita
              </span>
            </div>
            <Textarea
              rows={6}
              value={formData.contenido_curso || ""}
              onChange={(e) => setFormData({ ...formData, contenido_curso: e.target.value })}
              placeholder="Módulo I: Marco Legal y Normativa Aplicable&#10;– LOPCYMAT y su Reglamento&#10;– Normas COVENIN&#10;&#10;Módulo II: Identificación de Peligros&#10;– Métodos de evaluación..."
              className="font-mono text-[11px]"
            />
          </div>

          {/* Row 7: Certificación y Carnet PVC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/60 p-4 rounded-xl border border-purple-200">
            <div className="space-y-2">
              <Label className="font-bold text-purple-950 text-xs">Modalidad de Certificación</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoCert"
                    checked={tipoCert === "aprobacion"}
                    onChange={() => setTipoCert("aprobacion")}
                    className="accent-purple-600"
                  />
                  <span className="font-medium text-gray-800">Aprobación</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoCert"
                    checked={tipoCert === "participacion"}
                    onChange={() => setTipoCert("participacion")}
                    className="accent-purple-600"
                  />
                  <span className="font-medium text-gray-800">Participación</span>
                </label>
              </div>

              {tipoCert === "aprobacion" && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-gray-600">Nota mínima aprobatoria:</span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.nota_aprobatoria || 14}
                    onChange={(e) =>
                      setFormData({ ...formData, nota_aprobatoria: parseInt(e.target.value) || 14 })
                    }
                    className="w-16 h-7 text-xs bg-white"
                  />
                  <span className="text-gray-500">/ 20 pts</span>
                </div>
              )}
            </div>

            <div className="space-y-2 sm:border-l sm:border-purple-200 sm:pl-4">
              <Label className="font-bold text-purple-950 text-xs">Emisión de Carnet Oficial</Label>
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.emite_carnet === true}
                  onChange={(e) => setFormData({ ...formData, emite_carnet: e.target.checked })}
                  className="mt-0.5 rounded-sm border-purple-300 accent-purple-600"
                />
                <span className="text-gray-800 leading-tight">
                  <span className="font-semibold block">Emite carnet PVC oficial</span>
                  <span className="text-[11px] text-gray-500">
                    Acredita al participante con carnet plástico con validación QR institucional
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between p-4 border-t border-gray-200 bg-gray-50 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            className="text-xs text-gray-600 border-gray-300 hover:bg-gray-100 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
            Restablecer Valores Sugeridos
          </Button>

          <div className="flex items-center gap-2">
            <a
              href={`/api/diseno-servicio/${solicitud.id}/ficha-tecnica-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg px-3 inline-flex items-center gap-1.5 font-medium transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              Ver PDF Actual
            </a>

            <Button
              type="button"
              onClick={handleSave}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-8 px-4 flex items-center gap-1.5 font-semibold"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar Ficha Técnica
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
