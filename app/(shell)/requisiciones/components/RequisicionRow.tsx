"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteRequisicionRecord, setRequisicionEstatus } from "@/actions/requisiciones";
import { Eye, Edit, Trash2, Lock, CheckCircle2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RequisicionRow({
  record,
  isAdminView = false,
}: {
  record: any;
  isAdminView?: boolean;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const isProcesada = record.estatus_admin === "procesada";
  const isInterna =
    record.tipo_solicitud === "Interno" ||
    (!record.tipo_solicitud && !record.id_osi);
  const locked = isProcesada && !isAdminView;

  const handleRowClick = () => {
    router.push(`/requisiciones/view/${record.id}`);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleToggleEstatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = isProcesada ? "pendiente" : "procesada";
    const message = isProcesada
      ? "¿Revertir esta requisición a Pendiente?"
      : "¿Marcar esta requisición como Procesada? El solicitante ya no podrá editarla.";
    if (!confirm(message)) return;
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

  return (
    <tr 
      onClick={handleRowClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
        {record.nro_correlativo || "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {isInterna ? (
          <span className="text-gray-400 italic">N/A</span>
        ) : record.requisiciones_osis?.length > 0 ? (
          <span className="font-medium text-blue-700">
            {record.requisiciones_osis.map((ro: any) => ro.id_osi).join(", ")}
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
        {record.fecha_solicitud
          ? new Date(record.fecha_solicitud + "T00:00:00").toLocaleDateString()
          : "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          isProcesada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {isProcesada ? "Procesada" : "Pendiente"}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" onClick={handleActionClick}>
        <div className="flex gap-1 items-center">
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
          {locked ? (
            <span
              className="h-8 w-8 flex items-center justify-center text-gray-400"
              title="Procesada por Administración: bloqueada para edición"
            >
              <Lock className="h-4 w-4" />
            </span>
          ) : (
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
          )}
          {isAdminView && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={handleToggleEstatus}
              className={`h-7 px-2 text-[11px] flex gap-1 ${
                isProcesada
                  ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                  : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {isProcesada ? (
                <>
                  <Undo2 className="h-3 w-3" />
                  Revertir
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Procesar
                </>
              )}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
