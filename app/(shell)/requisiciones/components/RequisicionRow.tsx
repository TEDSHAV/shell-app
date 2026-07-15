"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteRequisicionRecord, setRequisicionEstatus, markAllItemsVerificadas, acknowledgeRequisicionReceipt } from "@/actions/requisiciones";
import { Eye, Edit, Trash2, Lock, CheckCircle2, Undo2, XCircle, CalendarClock, AlertTriangle, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RequisicionRow({
  record,
  isAdminView = false,
  osiLookup,
}: {
  record: any;
  isAdminView?: boolean;
  osiLookup?: Map<number, string>;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localEstatus, setLocalEstatus] = useState<string>(record.estatus_admin || "pendiente");
  const [localItems, setLocalItems] = useState<any[]>(record.additional_items || []);

  const estatus = localEstatus;
  const isProcesada = estatus === "procesada";
  const isRechazada = estatus === "rechazada";
  const isPendiente = estatus === "pendiente";
  const isResolved = isProcesada || isRechazada;
  const isAcuseRecibido = record.acuse_recibido === true;
  const canAcknowledge = isProcesada && !isAcuseRecibido && !isAdminView;
  const isInterna =
    record.tipo_solicitud === "Interno" ||
    (!record.tipo_solicitud && !record.id_osi);
  const locked = isResolved && !isAdminView;

  const additionalItems = localItems;
  const osiFixedItems: any[] = record.osi_fixed_items || [];
  const fixedVerifiedCount = osiFixedItems.reduce((sum: number, fi: any) =>
    sum +
    (fi.verificacion_traslado === "listo" ? 1 : 0) +
    (fi.verificacion_impresion === "listo" ? 1 : 0) +
    (fi.verificacion_honorarios === "listo" ? 1 : 0) +
    (fi.verificacion_informe_final === "listo" ? 1 : 0), 0);
  const fixedTotalCount = osiFixedItems.length * 4;
  const additionalVerifiedCount = additionalItems.filter((item: any) => item.verificacion === "listo").length;
  const verifiedCount = fixedVerifiedCount + additionalVerifiedCount;
  const totalCount = fixedTotalCount + additionalItems.length;

  // Execution date badge
  const executionDate = record.v_osi_formato_completo?.fecha_inicio_real;
  let executionBadge: { text: string; color: string } | null = null;
  if (executionDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exec = new Date(executionDate + "T00:00:00");
    const diffDays = Math.round((exec.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      executionBadge = { text: diffDays === 0 ? "Hoy" : `Vencida ${Math.abs(diffDays)}d`, color: "red" };
    } else if (diffDays <= 7) {
      executionBadge = { text: `Faltan ${diffDays}d`, color: "amber" };
    } else {
      executionBadge = { text: `Faltan ${diffDays}d`, color: "blue" };
    }
  }

  const handleRowClick = () => {
    router.push(`/requisiciones/view/${record.id}`);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSetEstatus = async (e: React.MouseEvent, target: "pendiente" | "procesada" | "rechazada") => {
    e.stopPropagation();
    if (target === "procesada" && totalCount > 0 && verifiedCount < totalCount) {
      if (!confirm(`Hay ${verifiedCount} de ${totalCount} items verificados. ¿Marcar todos como Listo y procesar?`)) return;
      const prevEstatus = localEstatus;
      const prevItems = localItems;
      // Optimistic: mark all as listo + set procesada
      setLocalItems(prev => prev.map(item => ({ ...item, verificacion: "listo" })));
      setLocalEstatus("procesada");
      setIsUpdating(true);
      try {
        await markAllItemsVerificadas(record.id);
        await setRequisicionEstatus(record.id, "procesada");
      } catch (error) {
        console.error("Error updating estatus:", error);
        // Rollback
        setLocalEstatus(prevEstatus);
        setLocalItems(prevItems);
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
    const prevEstatus = localEstatus;
    // Optimistic update
    setLocalEstatus(target);
    setIsUpdating(true);
    try {
      await setRequisicionEstatus(record.id, target);
    } catch (error) {
      console.error("Error updating estatus:", error);
      // Rollback
      setLocalEstatus(prevEstatus);
      alert("Error al actualizar el estatus");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Confirmar la recepción de esta requisición procesada?")) return;
    setIsUpdating(true);
    try {
      await acknowledgeRequisicionReceipt(record.id);
      router.refresh();
    } catch (error) {
      console.error("Error acknowledging receipt:", error);
      alert(error instanceof Error ? error.message : "Error al confirmar la recepción");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <tr 
      onClick={handleRowClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {isInterna ? (
          <span className="text-gray-400 italic">N/A</span>
        ) : record.requisiciones_osis?.length > 0 ? (
          <span className="font-medium text-blue-700">
            {record.requisiciones_osis
              .map((ro: any) => osiLookup?.get(ro.id_osi) || ro.id_osi)
              .join(", ")}
          </span>
        ) : (
          record.v_osi_formato_completo?.nro_osi || "-"
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {record.solicitante || "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">
        {record.gerencia_solicitante || "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          isInterna ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {isInterna ? "Interna" : "Externa"}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex items-center gap-2">
          {executionDate
            ? new Date(executionDate + "T00:00:00").toLocaleDateString()
            : record.fecha_solicitud
              ? new Date(record.fecha_solicitud + "T00:00:00").toLocaleDateString()
              : "-"}
          {executionBadge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              executionBadge.color === "red" ? "bg-red-100 text-red-700" :
              executionBadge.color === "amber" ? "bg-amber-100 text-amber-700" :
              "bg-blue-100 text-blue-700"
            }`}>
              {executionBadge.color === "red" ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
              {executionBadge.text}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          isProcesada ? 'bg-emerald-100 text-emerald-800' : isRechazada ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {isProcesada ? "Procesada" : isRechazada ? "Rechazada" : "Pendiente"}
        </span>
        {isProcesada && isAcuseRecibido && (
          <span className="ml-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
            Recibido
          </span>
        )}
      </td>
      {isAdminView && (
        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
          {totalCount > 0 ? (
            <span className={`text-xs font-bold ${
              verifiedCount === totalCount ? "text-emerald-600" : verifiedCount > 0 ? "text-amber-600" : "text-gray-400"
            }`}>
              {verifiedCount}/{totalCount}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
      )}
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" onClick={handleActionClick}>
        <div className="flex gap-1 items-center justify-center">
          <Link href={`/requisiciones/view/${record.id}`}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-600 hover:text-gray-900" 
              title="Ver"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {!isAdminView && locked ? (
            <span
              className="h-8 w-8 flex items-center justify-center text-gray-400"
              title="Procesada por Administración: bloqueada para edición"
            >
              <Lock className="h-4 w-4" />
            </span>
          ) : !isAdminView ? (
            <>
              <Link href={`/requisiciones/edit/${record.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800" title="Editar">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (confirm("¿Está seguro de que desea eliminar este registro?")) {
                    await deleteRequisicionRecord(record.id);
                    router.refresh();
                  }
                }}
              >
                <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : null}
          {isAdminView && isPendiente && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUpdating}
                onClick={(e) => handleSetEstatus(e, "procesada")}
                className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                title="Procesar"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUpdating}
                onClick={(e) => handleSetEstatus(e, "rechazada")}
                className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                title="Rechazar"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {isAdminView && isResolved && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isUpdating}
              onClick={(e) => handleSetEstatus(e, "pendiente")}
              className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
              title="Revertir"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          )}
          {canAcknowledge && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isUpdating}
              onClick={handleAcknowledge}
              className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              title="Confirmar Recepción"
            >
              <PackageCheck className="h-4 w-4" />
            </Button>
          )}
          {isProcesada && isAcuseRecibido && !isAdminView && (
            <span
              className="h-8 w-8 flex items-center justify-center text-emerald-600"
              title="Recepción confirmada"
            >
              <PackageCheck className="h-4 w-4" />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
