"use client";

import { useState, Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequisicionItem, OSIFixedItem } from "@/types/requisiciones";
import { setRequisicionEstatus, updateItemVerificacion, updateFixedItemVerificacion, markAllItemsVerificadas, saveVerificacionProgress, getExchangeRate } from "@/actions/requisiciones";
import { CheckCircle2, XCircle, Undo2, Clock, AlertTriangle, CalendarClock, Copy, Check, Download, Save } from "lucide-react";

export default function RequisicionView({ 
  record, 
  osiData,
  osiLookup,
  isAdminView = false,
}: { 
  record: any, 
  osiData: any,
  osiLookup?: Map<number, string>,
  isAdminView?: boolean,
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<RequisicionItem[]>(record.additional_items || []);
  const [localFixedItems, setLocalFixedItems] = useState<OSIFixedItem[]>(record.osi_fixed_items || []);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>("");
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const isGeneralMode = record.tipo_solicitud === "Interno";
  const isCapacitacionForRate = !isGeneralMode && record.gerencia_solicitante?.trim().toLowerCase() === "capacitacion";

  useEffect(() => {
    if (!isCapacitacionForRate) return;
    let cancelled = false;
    (async () => {
      setIsLoadingRate(true);
      try {
        const rate = await getExchangeRate();
        if (!cancelled && rate) {
          setExchangeRateInput(String(rate));
        }
      } catch (e) {
        console.error("Error fetching exchange rate:", e);
      } finally {
        if (!cancelled) setIsLoadingRate(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCapacitacionForRate]);

  const verificadoPorMap: Record<string, string> = record.verificado_por_map || {};
  const formatVerificadoTitle = (isListo: boolean, verificadoPor?: string | null, verificadoEn?: string | null) => {
    if (!isListo) return "Marcar como verificado";
    if (verificadoPor && verificadoEn) {
      const nombre = verificadoPorMap[verificadoPor] || "usuario desconocido";
      const d = new Date(verificadoEn);
      const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
      return `Verificado por ${nombre} el ${dateStr}`;
    }
    return "Verificado";
  };

  const handleCopy = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1500);
    } catch (e) {
      console.error("Error copying to clipboard:", e);
    }
  };

  const additionalItems: RequisicionItem[] = localItems;
  const isCapacitacion = isCapacitacionForRate;
  const osiFixedItems: OSIFixedItem[] = isCapacitacion ? localFixedItems : [];
  
  const estatus = record.estatus_admin || "pendiente";
  const isProcesada = estatus === "procesada";
  const isRechazada = estatus === "rechazada";
  const isPendiente = estatus === "pendiente";
  const isResolved = isProcesada || isRechazada;
  const linkedOSIs: { id_osi: number }[] = record.requisiciones_osis || [];
  const showOSIHeader = !isGeneralMode || linkedOSIs.length > 0;
  
  const totalFixed = osiFixedItems.reduce((sum, fi) =>
    sum + (fi.dias_traslado || 0) * (fi.costo_traslado || 0) +
    (fi.impresion_total || 0) +
    (fi.honorarios_total || 0) +
    (fi.informe_final_total || 0), 0);
  const totalAdditional = additionalItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalGeneral = totalFixed + totalAdditional;

  // Total of only verified ("listo") items — used for copy-all VES calculation
  const verifiedFixedTotal = osiFixedItems.reduce((sum, fi) =>
    sum +
    (fi.verificacion_traslado === "listo" ? (fi.dias_traslado || 0) * (fi.costo_traslado || 0) : 0) +
    (fi.verificacion_impresion === "listo" ? (fi.impresion_total || 0) : 0) +
    (fi.verificacion_honorarios === "listo" ? (fi.honorarios_total || 0) : 0) +
    (fi.verificacion_informe_final === "listo" ? (fi.informe_final_total || 0) : 0), 0);
  const verifiedAdditionalTotal = additionalItems
    .filter(item => item.verificacion === "listo")
    .reduce((sum, item) => sum + (item.total || 0), 0);
  const verifiedTotal = verifiedFixedTotal + verifiedAdditionalTotal;

  // Item verification progress (fixed items + additional items)
  const fixedVerifiedCount = osiFixedItems.reduce((sum, fi) =>
    sum +
    (fi.verificacion_traslado === "listo" ? 1 : 0) +
    (fi.verificacion_impresion === "listo" ? 1 : 0) +
    (fi.verificacion_honorarios === "listo" ? 1 : 0) +
    (fi.verificacion_informe_final === "listo" ? 1 : 0), 0);
  const fixedTotalCount = osiFixedItems.length * 4;
  const additionalVerifiedCount = additionalItems.filter(item => item.verificacion === "listo").length;
  const verifiedCount = fixedVerifiedCount + additionalVerifiedCount;
  const totalCount = fixedTotalCount + additionalItems.length;
  const progressPct = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0;

  // Execution date alert
  const executionDate = osiData?.fecha_inicio_real;
  let executionAlert: { text: string; color: string; icon: any } | null = null;
  if (!isGeneralMode && executionDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exec = new Date(executionDate + "T00:00:00");
    const diffMs = exec.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      executionAlert = { text: `Faltan ${diffDays} días para la fecha de ejecución`, color: "blue", icon: CalendarClock };
    } else if (diffDays > 0) {
      executionAlert = { text: `Atención: Quedan ${diffDays} días para la ejecución`, color: "amber", icon: AlertTriangle };
    } else if (diffDays === 0) {
      executionAlert = { text: "La fecha de ejecución es hoy", color: "red", icon: AlertTriangle };
    } else {
      executionAlert = { text: `La fecha de ejecución fue hace ${Math.abs(diffDays)} días`, color: "red", icon: Clock };
    }
  }

  const handleSetEstatus = async (target: "pendiente" | "procesada" | "rechazada") => {
    if (target === "procesada" && totalCount > 0 && verifiedCount < totalCount) {
      if (!confirm(`Hay ${verifiedCount} de ${totalCount} items verificados. ¿Marcar todos como Listo y procesar?`)) return;
      setIsUpdating(true);
      try {
        await markAllItemsVerificadas(record.id);
        setLocalItems(prev => prev.map(item => ({ ...item, verificacion: "listo" as const })));
        setLocalFixedItems(prev => prev.map(fi => ({
          ...fi,
          verificacion_traslado: "listo" as const,
          verificacion_impresion: "listo" as const,
          verificacion_honorarios: "listo" as const,
          verificacion_informe_final: "listo" as const,
        })));
        await setRequisicionEstatus(record.id, "procesada");
        router.refresh();
      } catch (error) {
        console.error("Error updating estatus:", error);
        alert("Error al actualizar el estatus");
      } finally {
        setIsUpdating(false);
      }
      return;
    }
    const messages: Record<string, string> = {
      procesada: "¿Marcar esta requisición como Procesada? El solicitante ya no podrá editarla.",
      rechazada: "¿Rechazar esta requisición? El solicitante será notificado y no podrá editarla.",
      pendiente: "¿Revertir esta requisición a Pendiente?",
    };
    if (!confirm(messages[target])) return;
    setIsUpdating(true);
    try {
      await setRequisicionEstatus(record.id, target);
      router.refresh();
    } catch (error) {
      console.error("Error updating estatus:", error);
      alert("Error al actualizar el estatus");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveProgress = async () => {
    setIsUpdating(true);
    try {
      const result = await saveVerificacionProgress(record.id);
      alert(`Notificación enviada al solicitante: ${result.verifiedCount} de ${result.totalCount} items verificados.`);
    } catch (error) {
      console.error("Error saving verification progress:", error);
      alert("Error al guardar el avance");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { default: RequisicionPdfDocument } = await import("./RequisicionPdfDocument");
      const blob = await pdf(
        <RequisicionPdfDocument
          record={record}
          isCapacitacion={isCapacitacion}
          isGeneralMode={isGeneralMode}
          osiFixedItems={osiFixedItems}
          additionalItems={additionalItems}
          linkedOSIs={linkedOSIs}
          osiLookup={osiLookup}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Requisicion-${record.nro_correlativo || record.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleToggleItem = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === "listo" ? "pendiente" : "listo";
    // Optimistic update: immediately reflect the change in local state
    setLocalItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, verificacion: newStatus as "listo" | "pendiente" } : item
    ));
    setTogglingItemId(itemId);
    try {
      await updateItemVerificacion(record.id, itemId, newStatus as "listo" | "pendiente");
    } catch (error) {
      console.error("Error updating item verification:", error);
      // Rollback on error
      setLocalItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, verificacion: currentStatus as "listo" | "pendiente" } : item
      ));
      alert("Error al actualizar el item");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleToggleFixedItem = async (
    idOsi: number,
    field: "verificacion_traslado" | "verificacion_impresion" | "verificacion_honorarios" | "verificacion_informe_final",
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "listo" ? "pendiente" : "listo";
    setLocalFixedItems(prev => prev.map(fi =>
      fi.id_osi === idOsi ? { ...fi, [field]: newStatus } : fi
    ));
    setTogglingItemId(`${idOsi}-${field}`);
    try {
      await updateFixedItemVerificacion(record.id, idOsi, field, newStatus as "listo" | "pendiente");
    } catch (error) {
      console.error("Error updating fixed item verification:", error);
      setLocalFixedItems(prev => prev.map(fi =>
        fi.id_osi === idOsi ? { ...fi, [field]: currentStatus } : fi
      ));
      alert("Error al actualizar el item");
    } finally {
      setTogglingItemId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isGeneratingPdf}
          onClick={handleDownloadPdf}
          className="h-8 px-3 text-xs flex gap-1"
        >
          <Download className="h-3.5 w-3.5" />
          {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
        </Button>
      </div>
      {/* Execution date alert */}
      {executionAlert && (() => {
        const Icon = executionAlert.icon;
        const colorClasses = {
          blue: "bg-blue-50 border-blue-300 text-blue-800",
          amber: "bg-amber-50 border-amber-300 text-amber-800",
          red: "bg-red-50 border-red-300 text-red-800",
        };
        return (
          <div className={`mb-4 flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium ${colorClasses[executionAlert.color as keyof typeof colorClasses]}`}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            {executionAlert.text}
            {executionDate && (
              <span className="ml-auto text-xs font-normal opacity-70">
                {new Date(executionDate + "T00:00:00").toLocaleDateString()}
              </span>
            )}
          </div>
        );
      })()}

      {/* Admin action bar */}
      {isAdminView && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <span className="text-sm font-medium text-gray-600">Estatus:</span>
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
            isProcesada ? 'bg-emerald-100 text-emerald-800' : isRechazada ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {isProcesada ? "Procesada" : isRechazada ? "Rechazada" : "Pendiente"}
          </span>
          {isResolved && record.procesada_por_nombre && (
            <span className="text-xs text-gray-500">
              {isProcesada ? "Procesada" : "Rechazada"} por <span className="font-medium text-gray-700">{record.procesada_por_nombre}</span>
              {record.procesada_at && ` el ${new Date(record.procesada_at).toLocaleString()}`}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            {isPendiente && (
              <>
                {verifiedCount > 0 && verifiedCount < totalCount && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    onClick={handleSaveProgress}
                    className="h-8 px-3 text-xs flex gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar Avance
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleSetEstatus("procesada")}
                  className="h-8 px-3 text-xs flex gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Procesar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleSetEstatus("rechazada")}
                  className="h-8 px-3 text-xs flex gap-1 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rechazar
                </Button>
              </>
            )}
            {isResolved && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => handleSetEstatus("pendiente")}
                className="h-8 px-3 text-xs flex gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Revertir
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Verification progress (admin only) */}
      {isAdminView && totalCount > 0 && (
        <div className="mb-4 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Progreso de verificación de items:</span>
            <span className={`text-xs font-bold ${
              verifiedCount === totalCount ? "text-emerald-600" : verifiedCount > 0 ? "text-amber-600" : "text-gray-400"
            }`}>
              {verifiedCount} de {totalCount} verificados
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                verifiedCount === totalCount ? "bg-emerald-500" : verifiedCount > 0 ? "bg-amber-500" : "bg-gray-300"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <Card className="shadow-md border-gray-300">
        <CardContent className="p-0">
          {/* Header section */}
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Fecha de solicitud:
            </div>
            <div className={`p-3 border-r border-gray-300 flex items-center ${showOSIHeader ? "col-span-4" : "col-span-9"}`}>
              {record.fecha_solicitud ? new Date(record.fecha_solicitud + "T00:00:00").toLocaleDateString() : "-"}
            </div>
            {showOSIHeader && (
            <>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              N° OSI:
            </div>
            <div className="col-span-3 p-3 flex flex-wrap items-center gap-1 font-bold text-blue-700">
              {linkedOSIs.length > 0
                ? linkedOSIs.map((ro: any, i) => (
                    <span key={ro.id_osi} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-gray-400">,</span>}
                      {osiLookup?.get(ro.id_osi) || osiData?.nro_osi || `#${ro.id_osi}`}
                    </span>
                  ))
                : osiData?.nro_osi || record.numero_osi || "-"}
            </div>
            </>
            )}
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Gerencia solicitante:</span>
            </div>
            <div className="col-span-4 p-3 border-r border-gray-300 flex items-center uppercase font-medium">
              {record.gerencia_solicitante || "-"}
            </div>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center text-center">
              <span className="font-bold text-xs leading-tight">Nombre del solicitante:</span>
            </div>
            <div className="col-span-3 p-3 flex items-center font-bold uppercase">
              {record.solicitante || "-"}
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Prioridad:
            </div>
            <div className="col-span-9 p-3 flex items-center">
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                record.prioridad === 'Alta' ? 'bg-red-100 text-red-800' : 
                record.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-green-100 text-green-800'
              }`}>
                {record.prioridad || "-"}
              </span>
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
                <th className="p-2 border-r border-gray-300 w-16">CANT</th>
                <th className="p-2 border-r border-gray-300">DESCRIPCIÓN</th>
                {!isGeneralMode && (
                  <th className="p-2 border-r border-gray-300 w-32">PRECIO U.</th>
                )}
                {((isCapacitacion && osiFixedItems.length > 1) || (!isCapacitacion && linkedOSIs.length > 1)) && (
                  <th className="p-2 border-r border-gray-300 w-28">OSI</th>
                )}
                {isGeneralMode ? (
                  <th className="p-2 w-24">VERIF.</th>
                ) : (
                  <th className="p-2 w-32">TOTAL</th>
                )}
                {isAdminView && (
                  <th className="p-2 w-20 border-l border-gray-300">✓</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isCapacitacion && (() => {
                let dynItemNum = osiFixedItems.length * 4 + 1;
                return (<>
                {osiFixedItems.map((fi, osiIdx) => {
                const osiTotal =
                  (fi.dias_traslado || 0) * (fi.costo_traslado || 0) +
                  (fi.impresion_total || 0) +
                  (fi.honorarios_total || 0) +
                  (fi.informe_final_total || 0);
                const osiAddlItems = additionalItems.filter(item => item.id_osi === fi.id_osi);
                const osiAddlTotal = osiAddlItems.reduce((sum, i) => sum + (i.total || 0), 0);
                return (
                <Fragment key={`osi-view-${fi.id_osi}`}>
              {/* OSI block header */}
              <tr className="bg-blue-100/60 border-b border-gray-300">
                <td colSpan={isAdminView ? (osiFixedItems.length > 1 ? 8 : 7) : (osiFixedItems.length > 1 ? 7 : 6)} className="p-2 font-bold text-xs text-blue-800">
                  OSI: {fi.nro_osi || `#${fi.id_osi}`}
                </td>
              </tr>
              {/* Item 1: Traslado */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">{osiIdx * 4 + 1}</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">T</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{fi.dias_traslado || 0}</span>
                    <span className="uppercase text-[10px] font-medium">DÍAS DE TRASL. COSTO TOTAL $</span>
                  </div>
                </td>
                <td className="p-2 text-center font-bold border-r border-gray-300 bg-gray-50/50">
                  ${((fi.dias_traslado || 0) * (fi.costo_traslado || 0)).toFixed(2)}
                </td>
                {osiFixedItems.length > 1 && (
                  <td className="p-2 text-center border-r border-gray-300 font-bold text-blue-700 text-[10px]">
                    {fi.nro_osi || `#${fi.id_osi}`}
                  </td>
                )}
                <td className="p-2 text-center font-bold bg-gray-50/50">
                  {""}
                </td>
                {isAdminView && (
                  <td className="p-2 text-center border-l border-gray-300">
                    <input
                      type="checkbox"
                      checked={fi.verificacion_traslado === "listo"}
                      disabled={togglingItemId === `${fi.id_osi}-verificacion_traslado`}
                      onChange={() => handleToggleFixedItem(fi.id_osi, "verificacion_traslado", fi.verificacion_traslado || "pendiente")}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      title={formatVerificadoTitle(fi.verificacion_traslado === "listo", fi.verificado_por_traslado, fi.verificado_en_traslado)}
                    />
                  </td>
                )}
              </tr>
              {/* Item 2: Impresión */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">{osiIdx * 4 + 2}</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">I</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">IMPRESIÓN TOTAL $</span>
                  </div>
                </td>
                <td className="p-2 text-center font-bold border-r border-gray-300 bg-gray-50/50">
                  ${(fi.impresion_total || 0).toFixed(2)}
                </td>
                {osiFixedItems.length > 1 && (
                  <td className="p-2 text-center border-r border-gray-300 font-bold text-blue-700 text-[10px]">
                    {fi.nro_osi || `#${fi.id_osi}`}
                  </td>
                )}
                <td className="p-2 text-center font-bold bg-gray-50/50">
                  {""}
                </td>
                {isAdminView && (
                  <td className="p-2 text-center border-l border-gray-300">
                    <input
                      type="checkbox"
                      checked={fi.verificacion_impresion === "listo"}
                      disabled={togglingItemId === `${fi.id_osi}-verificacion_impresion`}
                      onChange={() => handleToggleFixedItem(fi.id_osi, "verificacion_impresion", fi.verificacion_impresion || "pendiente")}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      title={formatVerificadoTitle(fi.verificacion_impresion === "listo", fi.verificado_por_impresion, fi.verificado_en_impresion)}
                    />
                  </td>
                )}
              </tr>
              {/* Item 3: Honorarios */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">{osiIdx * 4 + 3}</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">H</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="font-medium uppercase">HONORARIOS TOTAL $</span>
                    <span className="mx-2 font-bold">${(fi.honorarios_total || 0).toFixed(2)}</span>
                    <span className="font-medium uppercase">, POR HORAS</span>
                    <span className="font-bold">{fi.honorarios_horas || 0}</span>
                  </div>
                </td>
                <td className="p-2 text-center font-bold border-r border-gray-300 bg-gray-50/50">
                  ${(fi.honorarios_total || 0).toFixed(2)}
                </td>
                {osiFixedItems.length > 1 && (
                  <td className="p-2 text-center border-r border-gray-300 font-bold text-blue-700 text-[10px]">
                    {fi.nro_osi || `#${fi.id_osi}`}
                  </td>
                )}
                <td className="p-2 text-center font-bold bg-gray-50/50">
                  {""}
                </td>
                {isAdminView && (
                  <td className="p-2 text-center border-l border-gray-300">
                    <input
                      type="checkbox"
                      checked={fi.verificacion_honorarios === "listo"}
                      disabled={togglingItemId === `${fi.id_osi}-verificacion_honorarios`}
                      onChange={() => handleToggleFixedItem(fi.id_osi, "verificacion_honorarios", fi.verificacion_honorarios || "pendiente")}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      title={formatVerificadoTitle(fi.verificacion_honorarios === "listo", fi.verificado_por_honorarios, fi.verificado_en_honorarios)}
                    />
                  </td>
                )}
              </tr>
              {/* Item 4: Informe Final */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">{osiIdx * 4 + 4}</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase whitespace-nowrap">IF</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">INFORME FINAL $</span>
                  </div>
                </td>
                <td className="p-2 text-center font-bold border-r border-gray-300 bg-gray-50/50">
                  ${(fi.informe_final_total || 0).toFixed(2)}
                </td>
                {osiFixedItems.length > 1 && (
                  <td className="p-2 text-center border-r border-gray-300 font-bold text-blue-700 text-[10px]">
                    {fi.nro_osi || `#${fi.id_osi}`}
                  </td>
                )}
                <td className="p-2 text-center font-bold bg-gray-50/50">
                  {""}
                </td>
                {isAdminView && (
                  <td className="p-2 text-center border-l border-gray-300">
                    <input
                      type="checkbox"
                      checked={fi.verificacion_informe_final === "listo"}
                      disabled={togglingItemId === `${fi.id_osi}-verificacion_informe_final`}
                      onChange={() => handleToggleFixedItem(fi.id_osi, "verificacion_informe_final", fi.verificacion_informe_final || "pendiente")}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      title={formatVerificadoTitle(fi.verificacion_informe_final === "listo", fi.verificado_por_informe_final, fi.verificado_en_informe_final)}
                    />
                  </td>
                )}
              </tr>
              {/* Per-OSI subtotal */}
              <tr className="bg-gray-50 border-b border-gray-300">
                <td colSpan={osiFixedItems.length > 1 ? 5 : 4} className="p-2 text-right font-bold uppercase text-[10px]">Subtotal OSI {fi.nro_osi}:</td>
                {osiFixedItems.length > 1 ? (
                  <td className="p-2 text-center font-bold text-blue-700 text-[10px] border-r border-gray-300">
                    {fi.nro_osi || `#${fi.id_osi}`}
                  </td>
                ) : (
                  <td className="p-2 text-center font-bold text-xs border-r border-gray-300">
                    ${osiTotal.toFixed(2)}
                  </td>
                )}
                <td className="p-2 text-center font-bold text-xs bg-yellow-50">
                  ${osiTotal.toFixed(2)}
                </td>
                {isAdminView && <td className="p-2 border-l border-gray-300"></td>}
              </tr>
              {/* Dynamic items assigned to this OSI */}
              {osiAddlItems.length > 0 && (
                <tr className="bg-blue-100/40 border-b border-gray-300">
                  <td colSpan={isAdminView ? (osiFixedItems.length > 1 ? 8 : 7) : (osiFixedItems.length > 1 ? 7 : 6)} className="p-2 font-bold text-[10px] text-blue-700">
                    Items dinámicos — OSI: {fi.nro_osi || `#${fi.id_osi}`}
                  </td>
                </tr>
              )}
              {osiAddlItems.map((item) => {
                const itemNum = dynItemNum++;
                return (
                  <tr key={item.id} className="border-b border-gray-300 bg-blue-50/10">
                    <td className="p-2 text-center border-r border-gray-300 font-bold">{itemNum}</td>
                    <td className="p-2 border-r border-gray-300 text-center uppercase font-bold">
                      {item.unidad || "und"}
                    </td>
                    <td className="p-2 text-center border-r border-gray-300 font-bold">
                      {item.cant || 1}
                    </td>
                    <td className="p-2 border-r border-gray-300">
                      <div className="flex justify-between items-center px-1">
                        <span className="uppercase">{item.descripcion || "-"}</span>
                      </div>
                    </td>
                    <td className="p-2 text-center font-bold border-r border-gray-300">
                      ${item.costo_unitario?.toFixed(2) || "0.00"}
                    </td>
                    {osiFixedItems.length > 1 && (
                      <td className="p-2 text-center border-r border-gray-300 font-bold text-blue-700 text-[10px]">
                        {fi.nro_osi || `#${fi.id_osi}`}
                      </td>
                    )}
                    <td className="p-2 text-center font-bold bg-blue-50/20">
                      ${item.total?.toFixed(2) || "0.00"}
                    </td>
                    {isAdminView && (
                      <td className="p-2 text-center border-l border-gray-300">
                        <input
                          type="checkbox"
                          checked={item.verificacion === "listo"}
                          disabled={togglingItemId === item.id}
                          onChange={() => handleToggleItem(item.id, item.verificacion || "pendiente")}
                          className="h-4 w-4 cursor-pointer accent-emerald-600"
                          title={formatVerificadoTitle(item.verificacion === "listo", item.verificado_por, item.verificado_en)}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
              {/* Per-OSI dynamic subtotal */}
              {osiAddlItems.length > 0 && (
                <tr className="bg-gray-50 border-b border-gray-300">
                  <td colSpan={osiFixedItems.length > 1 ? 5 : 4} className="p-2 text-right font-bold uppercase text-[10px]">Subtotal items din. OSI {fi.nro_osi}:</td>
                  {osiFixedItems.length > 1 ? (
                    <td className="p-2 text-center font-bold text-blue-700 text-[10px] border-r border-gray-300">
                      {fi.nro_osi || `#${fi.id_osi}`}
                    </td>
                  ) : (
                    <td className="p-2 text-center font-bold text-xs border-r border-gray-300">
                      ${osiAddlTotal.toFixed(2)}
                    </td>
                  )}
                  <td className="p-2 text-center font-bold text-xs bg-yellow-50">
                    ${osiAddlTotal.toFixed(2)}
                  </td>
                  {isAdminView && <td className="p-2 border-l border-gray-300"></td>}
                </tr>
              )}
                </Fragment>
                );
              })}
              {/* Unassigned dynamic items (Capacitación) */}
              {(() => {
                const unassignedItems = additionalItems.filter(i => i.id_osi == null);
                if (unassignedItems.length === 0) return null;
                return (
                  <Fragment key="addl-unassigned">
                    <tr className="bg-amber-100/60 border-b border-gray-300">
                      <td colSpan={isAdminView ? (osiFixedItems.length > 1 ? 8 : 7) : (osiFixedItems.length > 1 ? 7 : 6)} className="p-2 font-bold text-xs text-amber-800">
                        Items dinámicos — Sin OSI asignada
                      </td>
                    </tr>
                    {unassignedItems.map((item) => {
                      const itemNum = dynItemNum++;
                      return (
                        <tr key={item.id} className="border-b border-gray-300 bg-amber-50/10">
                          <td className="p-2 text-center border-r border-gray-300 font-bold">{itemNum}</td>
                          <td className="p-2 border-r border-gray-300 text-center uppercase font-bold">
                            {item.unidad || "und"}
                          </td>
                          <td className="p-2 text-center border-r border-gray-300 font-bold">
                            {item.cant || 1}
                          </td>
                          <td className="p-2 border-r border-gray-300">
                            <div className="flex justify-between items-center px-1">
                              <span className="uppercase">{item.descripcion || "-"}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center font-bold border-r border-gray-300">
                            ${item.costo_unitario?.toFixed(2) || "0.00"}
                          </td>
                          {osiFixedItems.length > 1 && (
                            <td className="p-2 text-center border-r border-gray-300 font-bold text-amber-600 text-[10px]">
                              —
                            </td>
                          )}
                          <td className="p-2 text-center font-bold bg-amber-50/20">
                            ${item.total?.toFixed(2) || "0.00"}
                          </td>
                          {isAdminView && (
                            <td className="p-2 text-center border-l border-gray-300">
                              <input
                                type="checkbox"
                                checked={item.verificacion === "listo"}
                                disabled={togglingItemId === item.id}
                                onChange={() => handleToggleItem(item.id, item.verificacion || "pendiente")}
                                className="h-4 w-4 cursor-pointer accent-emerald-600"
                                title={formatVerificadoTitle(item.verificacion === "listo", item.verificado_por, item.verificado_en)}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })()}
              </>
              );
              })()}

              {/* Additional Items (non-Capacitación) */}
              {!isCapacitacion && additionalItems.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-300 bg-blue-50/10">
                  <td className="p-2 text-center border-r border-gray-300 font-bold">{index + 1}</td>
                  <td className="p-2 border-r border-gray-300 text-center uppercase font-bold">
                    {item.unidad || "und"}
                  </td>
                  <td className="p-2 text-center border-r border-gray-300 font-bold">
                    {item.cant || 1}
                  </td>
                  <td className="p-2 border-r border-gray-300">
                    <div className="flex justify-between items-center px-1">
                      <span className="uppercase">{item.descripcion || "-"}</span>
                    </div>
                  </td>
                  {!isGeneralMode && (
                    <td className="p-2 text-center font-bold border-r border-gray-300">
                      ${item.costo_unitario?.toFixed(2) || "0.00"}
                    </td>
                  )}
                  {linkedOSIs.length > 1 && (
                    <td className="p-2 text-center border-r border-gray-300 font-bold text-blue-700 text-[10px]">
                      {item.id_osi != null ? (osiLookup?.get(item.id_osi) || `#${item.id_osi}`) : "Sin asignar"}
                    </td>
                  )}
                  {isGeneralMode ? (
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.verificacion === "listo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.verificacion === "listo" ? "Listo" : "Pendiente"}
                      </span>
                    </td>
                  ) : (
                    <td className="p-2 text-center font-bold bg-blue-50/20">
                      ${item.total?.toFixed(2) || "0.00"}
                    </td>
                  )}
                  {isAdminView && (
                    <td className="p-2 text-center border-l border-gray-300">
                      <input
                        type="checkbox"
                        checked={item.verificacion === "listo"}
                        disabled={togglingItemId === item.id}
                        onChange={() => handleToggleItem(item.id, item.verificacion || "pendiente")}
                        className="h-4 w-4 cursor-pointer accent-emerald-600"
                        title={formatVerificadoTitle(item.verificacion === "listo", item.verificado_por, item.verificado_en)}
                      />
                    </td>
                  )}
                </tr>
              ))}

              {!isGeneralMode && (
              <tr className="bg-gray-100 border-b border-gray-300">
                <td colSpan={(isCapacitacion && osiFixedItems.length > 1) || (!isCapacitacion && linkedOSIs.length > 1) ? (isAdminView ? 6 : 6) : (isAdminView ? 5 : 5)} className="p-2 text-right font-bold uppercase text-sm">Total General:</td>
                <td className="p-2 text-center font-bold text-sm bg-yellow-50">
                  ${totalGeneral.toFixed(2)}
                </td>
                {isAdminView && (
                  <td className="p-2 border-l border-gray-300 bg-gray-100"></td>
                )}
              </tr>
              )}
            </tbody>
          </table>

          {/* Observations and Facilitator section */}
          <div className="bg-gray-200 py-0.5 font-bold px-2 text-sm border-b border-gray-300 uppercase">
            Observaciones
          </div>
          <div className="p-3 border-b border-gray-300 min-h-[60px] text-xs uppercase whitespace-pre-wrap">
            {record.observaciones_compras || "SIN OBSERVACIONES"}
          </div>

          {isAdminView && isCapacitacion && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Verifique cuidadosamente los datos bancarios del facilitador antes de realizar cualquier pago.</span>
            </div>
          )}

          {isCapacitacion && (() => {
            const parsedRate = parseFloat(exchangeRateInput) || 0;
            const vesAmount = verifiedTotal * parsedRate;
            const copyBlock = [
              `Nombre: ${record.facilitador || "-"}`,
              `Cédula/RIF: ${record.cedula_facilitador || "-"} / ${record.rif_facilitador || "-"}`,
              `Banco: ${record.banco || "-"}`,
              `Cuenta: ${record.nro_cuenta || "-"}`,
              `Teléfono: ${record.telefono_facilitador || "-"}`,
              `Monto Total USD (anticipado): $${verifiedTotal.toFixed(2)}`,
              `Tasa USD→VES: ${parsedRate || "-"}`,
              `Monto Total VES: Bs. ${vesAmount.toFixed(2)}`,
            ].join("\n");
            const CopyIcon = ({ field, value }: { field: string; value: string }) => (
              <button
                type="button"
                onClick={() => handleCopy(field, value)}
                className="ml-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Copiar"
              >
                {copiedField === field ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
            );
            return (
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
            <div className="col-span-3 p-2 bg-gray-50 flex items-center justify-between font-bold">
              RIF
              <button
                type="button"
                onClick={() => handleCopy("todo", copyBlock)}
                className="flex items-center gap-1 text-[10px] font-normal text-blue-700 hover:text-blue-900 normal-case"
                title="Copiar todos los datos"
              >
                {copiedField === "todo" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                Copiar todo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300 text-xs h-12">
            <div className="col-span-3 border-r border-gray-300 flex flex-col justify-center px-2">
              <span className="font-bold">{record.cod_facilitador || "-"}</span>
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center justify-between font-bold uppercase">
              {record.facilitador || "-"}
              {record.facilitador && <CopyIcon field="nombre" value={record.facilitador} />}
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center justify-between font-bold">
              {record.cedula_facilitador || "-"}
              {record.cedula_facilitador && <CopyIcon field="cedula" value={record.cedula_facilitador} />}
            </div>
            <div className="col-span-3 p-2 flex items-center justify-between font-bold uppercase">
              {record.rif_facilitador || "-"}
              {record.rif_facilitador && <CopyIcon field="rif" value={record.rif_facilitador} />}
            </div>
          </div>

          <div className="grid grid-cols-12 text-xs h-10 border-b border-gray-300">
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Banco
            </div>
            <div className="col-span-4 p-2 border-r border-gray-300 flex items-center justify-between font-bold uppercase">
              {record.banco || "-"}
              {record.banco && <CopyIcon field="banco" value={record.banco} />}
            </div>
            <div className="col-span-2 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Nro Cuenta.
            </div>
            <div className="col-span-2 p-2 border-r border-gray-300 flex items-center justify-between font-bold">
              {record.nro_cuenta || "-"}
              {record.nro_cuenta && <CopyIcon field="cuenta" value={record.nro_cuenta} />}
            </div>
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Tel.
            </div>
            <div className="col-span-2 p-2 flex items-center justify-between font-bold">
              {record.telefono_facilitador || "-"}
              {record.telefono_facilitador && <CopyIcon field="telefono" value={record.telefono_facilitador} />}
            </div>
          </div>

          {/* Exchange rate row */}
          <div className="grid grid-cols-12 text-xs h-12 border-b border-gray-300">
            <div className="col-span-3 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Tasa USD→VES:
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center gap-2">
              <input
                type="text"
                value={exchangeRateInput}
                onChange={(e) => setExchangeRateInput(e.target.value)}
                placeholder={isLoadingRate ? "Cargando..." : "Ingrese tasa"}
                disabled={isLoadingRate}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Monto Total VES:
            </div>
            <div className="col-span-3 p-2 flex items-center font-bold text-sm">
              {parsedRate > 0 ? `Bs. ${vesAmount.toFixed(2)}` : "-"}
            </div>
          </div>
          </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Bottom admin action bar */}
      {isAdminView && (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <span className="text-sm font-medium text-gray-600">Acciones:</span>
          <div className="ml-auto flex gap-2">
            {isPendiente && (
              <>
                {verifiedCount > 0 && verifiedCount < totalCount && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    onClick={handleSaveProgress}
                    className="h-8 px-3 text-xs flex gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar Avance
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleSetEstatus("procesada")}
                  className="h-8 px-3 text-xs flex gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Procesar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleSetEstatus("rechazada")}
                  className="h-8 px-3 text-xs flex gap-1 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rechazar
                </Button>
              </>
            )}
            {isResolved && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => handleSetEstatus("pendiente")}
                className="h-8 px-3 text-xs flex gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Revertir
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
