"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { RequisicionFormData, OSIFullData, RequisicionItem } from "@/types/requisiciones";
import { Button } from "@/components/ui/button";
import {
  getOSIForRequisicion,
  createRequisicionRecord,
  updateRequisicionRecord,
  getRequisicionRecord,
  getFacilitatorsForDropdown,
} from "@/actions/requisiciones";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function RequisicionForm({ 
  osis = [], 
  facilitators = [], 
  userData = null,
  editRecord = null,
  canSwitchMode = false,
  isTEDDept = false
}: { 
  osis?: OSIFullData[], 
  facilitators?: any[], 
  userData?: any,
  editRecord?: any,
  canSwitchMode?: boolean,
  isTEDDept?: boolean
}) {
  return (
    <Suspense fallback={<div>Cargando formulario...</div>}>
      <RequisicionFormContent 
        initialOsis={osis} 
        initialFacilitators={facilitators} 
        initialUserData={userData}
        editRecord={editRecord}
        canSwitchMode={canSwitchMode}
        isTEDDept={isTEDDept}
      />
    </Suspense>
  );
}

function RequisicionFormContent({ 
  initialOsis, 
  initialFacilitators, 
  initialUserData,
  editRecord,
  canSwitchMode,
  isTEDDept
}: { 
  initialOsis: OSIFullData[], 
  initialFacilitators: any[], 
  initialUserData: any,
  editRecord: any,
  canSwitchMode: boolean,
  isTEDDept: boolean
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || (editRecord?.id?.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [osis] = useState<OSIFullData[]>(initialOsis);
  const [facilitators] = useState<any[]>(initialFacilitators);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<RequisicionFormData>({
    selectedOSI: editRecord ? (initialOsis.find((o: any) => o.id_osi === editRecord.id_osi) || null) : null,
    corresponde_a: editRecord?.corresponde_a || "",
    fecha_solicitud: editRecord?.fecha_solicitud || new Date().toISOString().split("T")[0],
    tipo_solicitud: editRecord?.tipo_solicitud || "",
    nro_correlativo: editRecord?.nro_correlativo || "",
    tipo_servicio: editRecord?.tipo_servicio || "",
    gerencia_solicitante: editRecord?.gerencia_solicitante || (isTEDDept ? "TED" : initialUserData?.departamentos?.nombre || "SERVICIOS"),
    solicitante: editRecord?.solicitante || initialUserData?.nombre_apellido || "",
    prioridad: editRecord?.prioridad || "Alta",

    // Details - Fixed Items Quantities (Removed from UI, defaulting to 1 in actions)
    cant_traslado: editRecord?.cant_traslado ?? 1,
    cant_impresion: editRecord?.cant_impresion ?? 1,
    cant_honorarios: editRecord?.cant_honorarios ?? 1,
    cant_informe_final: editRecord?.cant_informe_final ?? 1,

    // Details
    dias_traslado: editRecord?.dias_traslado ?? 1,
    costo_traslado: editRecord?.costo_traslado ?? 0,
    impresion_total: editRecord?.impresion_total ?? 0,
    honorarios_horas: editRecord?.honorarios_horas ?? 0,
    honorarios_costo_hora: editRecord?.honorarios_costo_hora ?? 0,
    honorarios_total: editRecord?.honorarios_total ?? 0,
    informe_final_total: editRecord?.informe_final_total ?? 0,

    // Additional dynamic items
    additional_items: editRecord?.additional_items || [],

    // Facilitator
    cod_facilitador: editRecord?.cod_facilitador?.toString() || "",
    facilitador: editRecord?.facilitador || "",
    cedula_facilitador: editRecord?.cedula_facilitador || "",
    rif_facilitador: editRecord?.rif_facilitador || "",
    banco: editRecord?.banco || "",
    nro_cuenta: editRecord?.nro_cuenta || "",

    observaciones: editRecord?.observaciones_compras || "",
  });

  // Handle outside click for OSI dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCapacitacion = formData.gerencia_solicitante.trim().toLowerCase() === "capacitacion";
  const isTEDMode = formData.gerencia_solicitante.trim().toLowerCase() === "ted";

  const handleModeSwitch = (mode: "capacitacion" | "servicios tecnicos" | "ted") => {
    const gerenciaMap = {
      capacitacion: "Capacitacion",
      "servicios tecnicos": "Servicios Tecnicos",
      ted: "TED",
    };
    setFormData((prev) => ({
      ...prev,
      gerencia_solicitante: gerenciaMap[mode],
      selectedOSI: null,
    }));
    setSearchTerm("");
  };

  // Ensure at least one empty row for personalized items when non-Capacitacion (including TED mode)
  useEffect(() => {
    if (!isCapacitacion && formData.additional_items.length === 0) {
      const newItem: RequisicionItem = {
        id: Math.random().toString(36).substr(2, 9),
        cant: 1,
        unidad: "",
        descripcion: "",
        costo_unitario: 0,
        total: 0,
      };
      setFormData((prev) => ({
        ...prev,
        additional_items: [...prev.additional_items, newItem],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCapacitacion]);

  const osiTipoServicio = isCapacitacion ? "capacitacion" : "servicios tecnicos";

  const isOSIRequired = !isTEDMode;

  const filteredOSIs = osis.filter(
    (osi) =>
      osi.tipo_servicio?.toLowerCase() === osiTipoServicio &&
      (osi.nro_osi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        osi.servicio?.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleOSISelect = (osi: OSIFullData) => {
    setFormData((prev) => ({
      ...prev,
      selectedOSI: osi,
      costo_traslado: osi.costo_traslado || 0,
      impresion_total: osi.costo_impresion_material || 0,
      honorarios_horas: osi.horas_honorarios_instructor || 0,
      honorarios_costo_hora: osi.tarifa_hora_honorarios || 0,
      honorarios_total: (osi.horas_honorarios_instructor || 0) * (osi.tarifa_hora_honorarios || 0),
    }));
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const handleFacilitatorChange = (facilitatorId: string) => {
    const facilitator = facilitators.find((f) => f.id === parseInt(facilitatorId));
    const mainBank = facilitator?.datos_bancarios?.find((db: any) => db.es_principal) || facilitator?.datos_bancarios?.[0];
    
    setFormData((prev) => ({
      ...prev,
      cod_facilitador: facilitatorId,
      facilitador: facilitator?.nombre_apellido || "",
      cedula_facilitador: facilitator?.cedula || "",
      rif_facilitador: facilitator?.rif || "",
      banco: mainBank?.banco || "",
      nro_cuenta: mainBank?.nro_cuenta || "",
    }));
  };

  const addAdditionalItem = () => {
    const newItem: RequisicionItem = {
      id: Math.random().toString(36).substr(2, 9),
      cant: 1,
      unidad: "",
      descripcion: "",
      costo_unitario: 0,
      total: 0,
    };
    setFormData((prev) => ({
      ...prev,
      additional_items: [...prev.additional_items, newItem],
    }));
  };

  const removeAdditionalItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      additional_items: prev.additional_items.filter((item) => item.id !== id),
    }));
  };

  const updateAdditionalItem = (id: string, updates: Partial<RequisicionItem>) => {
    setFormData((prev) => ({
      ...prev,
      additional_items: prev.additional_items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };
          updatedItem.total = updatedItem.cant * updatedItem.costo_unitario;
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOSIRequired && !formData.selectedOSI) {
      alert("Por favor seleccione una OSI");
      return;
    }

    setIsLoading(true);
    try {
      if (editId) {
        await updateRequisicionRecord(parseInt(editId), formData);
      } else {
        await createRequisicionRecord(formData);
      }
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/requisiciones");
      }, 2000);
    } catch (error) {
      console.error("Error saving requisition:", error);
      alert("Error al guardar el registro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto pb-10 relative">
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm mx-4 bg-white shadow-2xl border-none">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Éxito!</h3>
              <p className="text-gray-600">
                La solicitud de requisición ha sido guardada correctamente.
              </p>
              <div className="mt-6 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-[progress_2s_linear]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {canSwitchMode && (
        <div className="flex gap-1 mb-4">
          {isTEDDept && (
            <button
              type="button"
              onClick={() => handleModeSwitch("ted")}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
                isTEDMode
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              General
            </button>
          )}
          <button
            type="button"
            onClick={() => handleModeSwitch("capacitacion")}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
              isCapacitacion
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            Capacitación
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("servicios tecnicos")}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
              !isCapacitacion && !isTEDMode
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            Servicios Técnicos
          </button>
        </div>
      )}

      <Card className="shadow-md border-gray-300">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Fecha de solicitud:
            </div>
            <div className={`p-3 border-r border-gray-300 ${isTEDMode ? "col-span-9" : "col-span-4"}`}>
              <Input 
                type="date"
                value={formData.fecha_solicitud}
                onChange={(e) => setFormData(p => ({...p, fecha_solicitud: e.target.value}))}
                className="h-8 border-none focus-visible:ring-0 px-0"
              />
            </div>
            {!isTEDMode && (
            <>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              N° OSI:
            </div>
            <div className="col-span-3 p-3 relative" ref={dropdownRef}>
               <Input 
                  placeholder="Buscar OSI..."
                  value={searchTerm || (formData.selectedOSI?.nro_osi || "")}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="h-8 border-none focus-visible:ring-0 px-0 font-bold text-blue-700"
                />
                {isDropdownOpen && filteredOSIs.length > 0 && (
                  <div className="absolute z-50 w-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                    {filteredOSIs.map((osi) => (
                      <div
                        key={osi.id_osi}
                        onClick={() => handleOSISelect(osi)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                      >
                        <div className="font-bold">{osi.nro_osi}</div>
                        <div className="text-gray-600 truncate">{osi.servicio}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            </>
            )}
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Gerencia solicitante:</span>
            </div>
            <div className="col-span-4 p-3 border-r border-gray-300">
              <Input 
                value={formData.gerencia_solicitante}
                readOnly
                className="h-8 border-none focus-visible:ring-0 px-0 text-sm font-medium uppercase bg-gray-50/50 cursor-not-allowed"
              />
            </div>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm leading-tight text-center">Nombre del solicitante:</span>
            </div>
            <div className="col-span-3 p-3 flex items-center">
              <Input 
                value={formData.solicitante}
                onChange={(e) => setFormData(p => ({...p, solicitante: e.target.value}))}
                className="h-8 border-none focus-visible:ring-0 px-0 text-sm font-bold uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Prioridad:
            </div>
            <div className="col-span-9 p-3 flex gap-8 items-center">
              <RadioGroup 
                value={formData.prioridad} 
                onValueChange={(v: any) => setFormData(p => ({...p, prioridad: v}))}
                className="grid-flow-col"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Alta" id="p-alta" />
                  <Label htmlFor="p-alta" className="text-xs">Alta</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Media" id="p-media" />
                  <Label htmlFor="p-media" className="text-xs">Media</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Baja" id="p-baja" />
                  <Label htmlFor="p-baja" className="text-xs">Baja</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Details Table section */}
          <div className="bg-gray-200 py-1 font-bold text-center text-sm border-b border-gray-300 uppercase">
            Detalles de la solicitud
          </div>
          
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-center border-b border-gray-300">
                <th className="p-2 border-r border-gray-300 w-12">ITEM</th>
                <th className="p-2 border-r border-gray-300 w-20">UNIDAD/ CONCEPTO</th>
                <th className="p-2 border-r border-gray-300">DESCRIPCIÓN</th>
                <th className="p-2 w-32">TOTAL</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isCapacitacion && (
              <>
              {/* Item 1: Traslado */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">1</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">T</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={formData.dias_traslado || ""} 
                      onChange={(e) => setFormData(p => ({...p, dias_traslado: parseInt(e.target.value) || 0}))}
                      className="h-6 w-12 border-gray-300 p-1 text-center" 
                    />
                    <span className="uppercase text-[10px] font-medium">DÍAS DE TRASL. COSTO X C/U $</span>
                    <Input 
                      type="number" 
                      value={formData.costo_traslado || ""} 
                      onChange={(e) => setFormData(p => ({...p, costo_traslado: parseFloat(e.target.value) || 0}))}
                      className="h-6 w-20 border-gray-300 p-1 font-bold" 
                    />
                  </div>
                </td>
                <td className="p-2 text-center font-bold">
                  ${((formData.dias_traslado || 0) * (formData.costo_traslado || 0)).toFixed(2)}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              {/* Item 2: Impresión */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">2</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">I</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">IMPRESIÓN TOTAL $</span>
                    <Input 
                      type="number" 
                      value={formData.impresion_total || ""} 
                      onChange={(e) => setFormData(p => ({...p, impresion_total: parseFloat(e.target.value) || 0}))}
                      className="h-6 w-24 border-gray-300 p-1 font-bold" 
                    />
                  </div>
                </td>
                <td className="p-2 text-center font-bold">
                  ${(formData.impresion_total || 0).toFixed(2)}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              {/* Item 3: Honorarios */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">3</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">H</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="font-medium uppercase">HONORARIOS $</span>
                    <Input 
                      type="number" 
                      value={formData.honorarios_costo_hora || ""} 
                      onChange={(e) => {
                        const cost = parseFloat(e.target.value) || 0;
                        setFormData(p => ({
                          ...p, 
                          honorarios_costo_hora: cost, 
                          honorarios_total: (p.honorarios_horas || 0) * cost
                        }))
                      }}
                      className="h-6 w-24 border-gray-300 p-1 font-bold" 
                    />
                    <span className="font-medium uppercase">, POR HORAS</span>
                    <Input 
                      type="number" 
                      value={formData.honorarios_horas || ""} 
                      onChange={(e) => {
                        const h = parseFloat(e.target.value) || 0;
                        setFormData(p => ({
                          ...p, 
                          honorarios_horas: h, 
                          honorarios_total: h * (p.honorarios_costo_hora ?? 0)
                        }))
                      }}
                      className="h-6 w-12 border-gray-300 p-1 text-center" 
                    />
                  </div>
                </td>
                <td className="p-2 text-center font-bold">
                  ${(formData.honorarios_total || 0).toFixed(2)}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              {/* Item 4: Informe Final */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">4</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase whitespace-nowrap">IF</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">INFORME FINAL $</span>
                    <Input 
                      type="number" 
                      value={formData.informe_final_total || ""} 
                      onChange={(e) => setFormData(p => ({...p, informe_final_total: parseFloat(e.target.value) || 0}))}
                      className="h-6 w-24 border-gray-300 p-1 font-bold" 
                      placeholder="0.00"
                    />
                  </div>
                </td>
                <td className="p-2 text-center font-bold">
                  ${(formData.informe_final_total || 0).toFixed(2)}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              </>
              )}

              {/* Additional Items */}
              {formData.additional_items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-300 bg-blue-50/30">
                  <td className="p-2 text-center border-r border-gray-300 font-bold">{index + (isCapacitacion ? 5 : 1)}</td>
                  <td className="p-2 border-r border-gray-300">
                    <Input 
                      className="h-6 w-full text-center border-gray-300 p-1 uppercase font-bold" 
                      value={item.unidad}
                      onChange={(e) => updateAdditionalItem(item.id, { unidad: e.target.value })}
                      placeholder="UND"
                    />
                  </td>
                  <td className="p-2 border-r border-gray-300">
                    <div className="flex items-center gap-2">
                      <Input 
                        className="h-6 flex-1 border-gray-300 p-1 uppercase" 
                        value={item.descripcion}
                        onChange={(e) => updateAdditionalItem(item.id, { descripcion: e.target.value })}
                        placeholder="Descripción del item..."
                      />
                      <div className="flex items-center gap-1">
                        <span>$</span>
                        <Input 
                          type="number"
                          className="h-6 w-20 border-gray-300 p-1" 
                          value={item.costo_unitario}
                          onChange={(e) => updateAdditionalItem(item.id, { costo_unitario: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-center font-bold">
                    ${item.total.toFixed(2)}
                  </td>
                  <td className="p-2 border-l border-gray-300 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeAdditionalItem(item.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="bg-gray-100 border-b border-gray-300">
                <td colSpan={3} className="p-2 text-right font-bold uppercase text-sm">Total General:</td>
                <td className="p-2 text-center font-bold text-sm bg-yellow-50">
                  ${(
                    (isCapacitacion
                      ? (formData.dias_traslado || 0) * (formData.costo_traslado || 0) +
                        (formData.impresion_total || 0) +
                        (formData.honorarios_total || 0) +
                        (formData.informe_final_total || 0)
                      : 0) +
                    formData.additional_items.reduce((sum, item) => sum + item.total, 0)
                  ).toFixed(2)}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
            </tbody>
          </table>

          {/* Add Item Button */}
          <div className="p-2 border-b border-gray-300 flex justify-center bg-gray-50/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs flex gap-2 border-dashed border-gray-400"
              onClick={addAdditionalItem}
            >
              <Plus size={14} />
              Añadir Item Personalizado
            </Button>
          </div>

          <div className="bg-gray-200 py-0.5 font-bold px-2 text-sm border-b border-gray-300 uppercase">
            Observaciones
          </div>
          <div className="p-2 border-b border-gray-300">
            <Textarea 
              value={formData.observaciones}
              onChange={(e) => setFormData(p => ({...p, observaciones: e.target.value}))}
              className="min-h-[60px] text-xs border-gray-300 uppercase"
              placeholder="Escriba aquí cualquier observación adicional..."
            />
          </div>

          {isCapacitacion && (
          <>
          <div className="grid grid-cols-12 border-b border-gray-300 text-xs">
            <div className="col-span-3 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Facilitador Asignado:
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              DATOS PERSONALES
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              CEDULA
            </div>
            <div className="col-span-3 p-2 bg-gray-50 flex items-center font-bold">
              RIF
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300 text-xs h-12">
            <div className="col-span-3 border-r border-gray-300 flex flex-col">
              <div className="flex-1">
                <Select onValueChange={handleFacilitatorChange} value={formData.cod_facilitador}>
                  <SelectTrigger className="h-full border-none focus:ring-0 rounded-none text-xs">
                    <SelectValue placeholder="Seleccionar Facilitador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {facilitators.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.nombre_apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="px-2 pb-1 text-[10px] text-gray-500 border-t border-gray-100 flex justify-between">
                <span>Cód Facilitador:</span>
                <span className="font-bold">{formData.cod_facilitador || "-"}</span>
              </div>
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center font-bold uppercase">
              {formData.facilitador || "-"}
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center font-bold">
              {formData.cedula_facilitador || "-"}
            </div>
            <div className="col-span-3 p-2 flex items-center font-bold uppercase">
              {formData.rif_facilitador || "-"}
            </div>
          </div>

          <div className="grid grid-cols-12 text-xs h-10 border-b border-gray-300">
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Banco
            </div>
            <div className="col-span-6 p-2 border-r border-gray-300 flex items-center font-bold uppercase">
              {formData.banco || "-"}
            </div>
            <div className="col-span-2 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Nro Cuenta.
            </div>
            <div className="col-span-3 p-2 flex items-center font-bold">
              {formData.nro_cuenta || "-"}
            </div>
          </div>
          </>
          )}

          <div className="p-4 flex justify-end gap-3 bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Guardando..." : editId ? "Actualizar Requisición" : "Crear Requisición"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
