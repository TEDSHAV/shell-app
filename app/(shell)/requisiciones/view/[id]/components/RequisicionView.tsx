"use client";

import { Card, CardContent } from "@/components/ui/card";
import { RequisicionItem } from "@/types/requisiciones";

export default function RequisicionView({ 
  record, 
  osiData,
  osiLookup
}: { 
  record: any, 
  osiData: any,
  osiLookup?: Map<number, string>
}) {
  const additionalItems: RequisicionItem[] = record.additional_items || [];
  
  const isCapacitacion = record.gerencia_solicitante?.trim().toLowerCase() === "capacitacion";
  const isGeneralMode = record.tipo_solicitud === "Interno";
  const linkedOSIs: { id_osi: number }[] = record.requisiciones_osis || [];
  
  // Totals calculations based on totals stored in DB (as updated in create/update actions)
  const totalTraslado = isCapacitacion ? (record.costo_traslado || 0) : 0;
  const totalImpresion = isCapacitacion ? (record.impresion_total || 0) : 0;
  const totalHonorarios = isCapacitacion ? (record.honorarios_total || 0) : 0;
  const totalInformeFinal = isCapacitacion ? (record.informe_final_total || 0) : 0;
  const totalAdditional = additionalItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalGeneral = totalTraslado + totalImpresion + totalHonorarios + totalInformeFinal + totalAdditional;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <Card className="shadow-md border-gray-300">
        <CardContent className="p-0">
          {/* Header section */}
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Fecha de solicitud:
            </div>
            <div className={`p-3 border-r border-gray-300 flex items-center ${isGeneralMode ? "col-span-9" : "col-span-4"}`}>
              {record.fecha_solicitud ? new Date(record.fecha_solicitud + "T00:00:00").toLocaleDateString() : "-"}
            </div>
            {!isGeneralMode && (
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
                {isGeneralMode ? (
                  <th className="p-2 w-24">VERIF.</th>
                ) : (
                  <th className="p-2 w-32">TOTAL</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isCapacitacion && (
              <>
              {/* Item 1: Traslado */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">1</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">T</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{record.dias_traslado || 0}</span>
                    <span className="uppercase text-[10px] font-medium">DÍAS DE TRASL. COSTO TOTAL $</span>
                  </div>
                </td>
                <td className="p-2 text-center font-bold border-r border-gray-300 bg-gray-50/50">
                  ${totalTraslado.toFixed(2)}
                </td>
                <td className="p-2 text-center font-bold bg-gray-50/50">
                  ${totalTraslado.toFixed(2)}
                </td>
              </tr>
              {/* Item 2: Impresión */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">2</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">I</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">IMPRESIÓN TOTAL $</span>
                  </div>
                </td>
                <td className="p-2 text-center font-bold border-r border-gray-300 bg-gray-50/50">
                  ${totalImpresion.toFixed(2)}
                </td>
                <td className="p-2 text-center font-bold bg-gray-50/50">
                  ${totalImpresion.toFixed(2)}
                </td>
              </tr>
              {/* Item 3: Honorarios */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">3</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">H</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="font-medium uppercase">HONORARIOS TOTAL $</span>
                    <span className="mx-2 font-bold">{totalHonorarios.toFixed(2)}</span>
                    <span className="font-medium uppercase">, POR HORAS</span>
                    <span className="font-bold">{record.honorarios_horas || 0}</span>
                  </div>
                </td>
                <td className="p-2 text-center font-bold border-r border-gray-300 bg-gray-50/50">
                  ${totalHonorarios.toFixed(2)}
                </td>
                <td className="p-2 text-center font-bold bg-gray-50/50">
                  ${totalHonorarios.toFixed(2)}
                </td>
              </tr>
              {/* Item 4: Informe Final */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">4</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase whitespace-nowrap">IF</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">INFORME FINAL $</span>
                  </div>
                </td>
                <td className="p-2 text-center font-bold border-r border-gray-300 bg-gray-50/50">
                  ${totalInformeFinal.toFixed(2)}
                </td>
                <td className="p-2 text-center font-bold bg-gray-50/50">
                  ${totalInformeFinal.toFixed(2)}
                </td>
              </tr>
              </>
              )}

              {/* Additional Items */}
              {additionalItems.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-300 bg-blue-50/10">
                  <td className="p-2 text-center border-r border-gray-300 font-bold">{index + (isCapacitacion ? 5 : 1)}</td>
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
                </tr>
              ))}

              {!isGeneralMode && (
              <tr className="bg-gray-100 border-b border-gray-300">
                <td colSpan={5} className="p-2 text-right font-bold uppercase text-sm">Total General:</td>
                <td className="p-2 text-center font-bold text-sm bg-yellow-50">
                  ${totalGeneral.toFixed(2)}
                </td>
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
            <div className="col-span-3 border-r border-gray-300 flex flex-col justify-center px-2">
              <span className="font-bold">{record.cod_facilitador || "-"}</span>
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center font-bold uppercase">
              {record.facilitador || "-"}
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center font-bold">
              {record.cedula_facilitador || "-"}
            </div>
            <div className="col-span-3 p-2 flex items-center font-bold uppercase">
              {record.rif_facilitador || "-"}
            </div>
          </div>

          <div className="grid grid-cols-12 text-xs h-10 border-b border-gray-300">
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Banco
            </div>
            <div className="col-span-6 p-2 border-r border-gray-300 flex items-center font-bold uppercase">
              {record.banco || "-"}
            </div>
            <div className="col-span-2 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Nro Cuenta.
            </div>
            <div className="col-span-3 p-2 flex items-center font-bold">
              {record.nro_cuenta || "-"}
            </div>
          </div>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
