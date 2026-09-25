"use client";

import { useState, Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequisicionItem, OSIFixedItem } from "@/types/requisiciones";
import { setRequisicionEstatus, updateItemVerificacion, updateFixedItemVerificacion, saveVerificacionProgress, getExchangeRate, updateFacilitadorBankingDetails, acknowledgeRequisicionReceipt, approveRequisicionByCoordinador, rejectRequisicionByCoordinador, approveRequisicionByLider, rejectRequisicionByLider, updateRequisicionByApprover, confirmInternaCostos, updateRequisicionDepartamento, updateRequisicionItemsByGestion, markAllItemsVerificadas } from "@/actions/requisiciones";
import { CheckCircle2, XCircle, Undo2, Clock, AlertTriangle, CalendarClock, Copy, Check, Download, Save, Printer, PackageCheck, Plus, Trash2, DollarSign } from "lucide-react";
import MotivoModal from "../../../components/MotivoModal";
import ApproverDiff from "./ApproverDiff";
import { formatDate } from "@/lib/utils";
import { deptInList, isLiderGatePending, skipsCoordinadorGate } from "@/lib/requisiciones-gerencia";
import { apply_item_money_updates, interna_needs_lider, requisicion_items_total } from "@/lib/requisiciones-totals";
import { RequisicionItemMoneyInputs, RequisicionPriceHeaders } from "../../../components/RequisicionItemMoneyInputs";

export default function RequisicionView({
  record,
  osiData,
  osiLookup,
  isAdminView = false,
  isCoordinador = false,
  coordinadorDepts = [],
  isLider = false,
  liderDepts = [],
  banks = [],
  limiteLiderUsd = 100,
  canEditDepartamento = false,
  canEditTramite = false,
  deptCatalog = [],
}: {
  record: any,
  osiData: any,
  osiLookup?: Map<number, string>,
  isAdminView?: boolean,
  isCoordinador?: boolean,
  /** Departments covered by the viewer's authprisma coordinador role. */
  coordinadorDepts?: string[],
  isLider?: boolean,
  /** All departments inside the gerencia(s) the current user leads. */
  liderDepts?: string[],
  banks?: { id: number; nombre: string }[],
  limiteLiderUsd?: number,
  /** Administración operativa con requisiciones:gestion:edit. */
  canEditDepartamento?: boolean,
  /** gestion:edit o process: agregar/editar ítems en trámite. */
  canEditTramite?: boolean,
  deptCatalog?: { nombre: string; gerencia: string }[],
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<RequisicionItem[]>(record.additional_items || []);
  const [localFixedItems, setLocalFixedItems] = useState<OSIFixedItem[]>(record.osi_fixed_items || []);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // Exchange rate: if the requisicion was already processed and has a stored
  // rate snapshot (tasa_cambio), use it as the initial value and mark it as
  // read-only. Otherwise, start empty and let the live-fetch effect populate it.
  const hasStoredRate = record.tasa_cambio != null && !isNaN(Number(record.tasa_cambio));
  const [exchangeRateInput, setExchangeRateInput] = useState<string>(
    hasStoredRate ? String(record.tasa_cambio) : ""
  );
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // Editable facilitador banking fields (admin only)
  const [editBanco, setEditBanco] = useState<string>(record.banco || "");
  const [editNroCuenta, setEditNroCuenta] = useState<string>(record.nro_cuenta || "");
  const [editTelefono, setEditTelefono] = useState<string>(record.telefono_facilitador || "");
  const [editCedula, setEditCedula] = useState<string>(record.cedula_facilitador || "");
  const [editRif, setEditRif] = useState<string>(record.rif_facilitador || "");
  const [isSavingBanking, setIsSavingBanking] = useState(false);
  const isGeneralMode = record.tipo_solicitud === "Interno";
  // Use the DB-resolved gerencia (departamentos.gerencia) when available, falling
  // back to the stored gerencia_solicitante for legacy records.
  const displayGerencia = record.gerencia_display || record.gerencia_solicitante;
  // Capacitacion-specific behavior is driven by the stored department (preferred)
  // and falls back to gerencia_solicitante for legacy records.
  const isCapacitacionForRate = !isGeneralMode && (
    (record.departamento || "").trim().toLowerCase().includes("capacitacion") ||
    (!(record.departamento) && (record.gerencia_solicitante || "").trim().toLowerCase() === "capacitacion")
  );
  // --- Lider approval state (internas only) ---
  const liderEstatus = record.lider_estatus as "pendiente" | "aprobada" | "rechazada" | null | undefined;
  const coordinadorEstatus = record.coordinador_estatus as "pendiente" | "aprobada" | "rechazada" | null | undefined;
  const isLiderPendiente = isGeneralMode && isLiderGatePending(record);
  const isLiderAprobada = isGeneralMode && liderEstatus === "aprobada";
  const isLiderRechazada = isGeneralMode && liderEstatus === "rechazada";
  // The lider can approve/reject internas whose departamento belongs to one of the
  // gerencias they lead (legacy records without departamento allow any lider; the
  // server action re-checks either way).
  const liderDeptMatches = isLider && deptInList(record.departamento, liderDepts);
  const canLiderAct = isLiderPendiente && liderDeptMatches;
  const showInternaMontos = isGeneralMode && (isAdminView || liderDeptMatches);

  // --- Coordinador approval state (internas only) ---
  const isCoordinadorPendiente = isGeneralMode && coordinadorEstatus === "pendiente";
  const isCoordinadorAprobada = isGeneralMode && coordinadorEstatus === "aprobada";
  const isCoordinadorRechazada = isGeneralMode && coordinadorEstatus === "rechazada";
  // A coordinador can only approve/reject internas of the departments they coordinate.
  // Fallback: if record.departamento is null (legacy record), allow any coordinador.
  const coordinadorDeptMatches = isCoordinador && deptInList(record.departamento, coordinadorDepts);
  const canCoordinadorAct =
    isCoordinadorPendiente &&
    coordinadorDeptMatches &&
    !record._isOwn &&
    !skipsCoordinadorGate(record);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [coordinadorRejectOpen, setCoordinadorRejectOpen] = useState(false);
  const [liderRejectOpen, setLiderRejectOpen] = useState(false);

  // --- Approver inline-edit state ---
  // The approver (coordinador for internas, then lider for internas) can
  // edit the requisicion's content while the approval is pending OR after they've
  // already approved (they may realize they need to change something before
  // Administración processes it) — but NOT after a rejection or after admin has
  // processed it. The original_snapshot is preserved so the solicitor sees a diff.
  const adminProcessed = record.estatus_admin === "procesada" || record.estatus_admin === "rechazada";
  const canLiderEditPostApproval = isLiderAprobada && !adminProcessed && liderDeptMatches && !isAdminView;
  const canCoordinadorEditPostApproval = isCoordinadorAprobada && !adminProcessed && coordinadorDeptMatches && !isAdminView;
  const canApproverEdit =
    canLiderAct || canCoordinadorAct
    || canLiderEditPostApproval
    || canCoordinadorEditPostApproval;
  const coordDoneForAdmin = !coordinadorEstatus || coordinadorEstatus === "aprobada";
  const canEstimateEdit = isAdminView && isGeneralMode && coordDoneForAdmin && !adminProcessed;
  const canAdminGestionEdit =
    isAdminView && canEditTramite && !adminProcessed && (!isGeneralMode || coordDoneForAdmin);
  const canEditItems = canApproverEdit || canEstimateEdit || canAdminGestionEdit;
  const costsConfirmed = !!record.costos_confirmados_at;
  // Mostrar confirmar si Admin puede estimar y aún no hay sello válido de líder
  // sobre una estimación real (recupera casos donde el líder selló sin montos).
  const canConfirmCostos =
    canEstimateEdit && (!costsConfirmed || liderEstatus !== "aprobada");
  const prematureLiderSeal =
    isGeneralMode && liderEstatus === "aprobada" && !costsConfirmed;
  const [editedItems, setEditedItems] = useState<any[]>(record.additional_items || []);
  const [editedObservaciones, setEditedObservaciones] = useState<string>(record.observaciones_compras || "");
  const [editedPrioridad, setEditedPrioridad] = useState<string>(record.prioridad || "");
  const [editedFecha, setEditedFecha] = useState<string>(record.fecha_solicitud || "");
  const [editedSolicitante, setEditedSolicitante] = useState<string>(record.solicitante || "");
  const [isSavingApproverEdit, setIsSavingApproverEdit] = useState(false);
  const [editedDepartamento, setEditedDepartamento] = useState<string>(
    record.departamento || "",
  );
  const [isSavingDepartamento, setIsSavingDepartamento] = useState(false);

  useEffect(() => {
    setEditedDepartamento(record.departamento || "");
  }, [record.departamento]);

  // Tras solicitar / cambiar sello de líder, alinear ítems locales con el servidor
  // para no quedar en "cambios sin guardar" falsos que ocultan el estado de espera.
  useEffect(() => {
    setEditedItems(record.additional_items || []);
    setLocalItems(record.additional_items || []);
  }, [record.id, record.costos_confirmados_at, record.lider_estatus]);

  const departamentoOptions = (() => {
    const rows = [...deptCatalog];
    const current = (record.departamento || "").trim();
    if (
      current &&
      !rows.some((row) => row.nombre.trim().toLowerCase() === current.toLowerCase())
    ) {
      rows.unshift({
        nombre: current,
        gerencia: record.gerencia_solicitante || "",
      });
    }
    return rows;
  })();

  const handleSaveDepartamento = async () => {
    if (!canEditDepartamento) return;
    const next = editedDepartamento.trim();
    if (!next) {
      alert("Seleccione un departamento.");
      return;
    }
    if (next === (record.departamento || "").trim()) return;
    setIsSavingDepartamento(true);
    try {
      await updateRequisicionDepartamento(record.id, next);
      router.refresh();
    } catch (e) {
      console.error("Error updating departamento:", e);
      alert(
        e instanceof Error
          ? e.message
          : "No se pudo actualizar el departamento.",
      );
    } finally {
      setIsSavingDepartamento(false);
    }
  };

  const handleAddApproverItem = () => {
    setEditedItems(prev => [...prev, {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      cant: 1,
      unidad: "und",
      descripcion: "",
      costo_unitario: 0,
      total: 0,
      verificacion: "pendiente" as const,
    }]);
  };

  const handleRemoveApproverItem = (itemId: string) => {
    setEditedItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleApproverItemChange = (itemId: string, field: string, value: any) => {
    setEditedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return apply_item_money_updates(item, { [field]: value } as Partial<typeof item>);
    }));
  };

  const handleSaveGestionItems = async (): Promise<boolean> => {
    if (!canAdminGestionEdit && !canEstimateEdit) return true;
    setIsSavingApproverEdit(true);
    try {
      await updateRequisicionItemsByGestion(record.id, editedItems);
      setLocalItems(editedItems);
      return true;
    } catch (e) {
      console.error("Error saving gestion items:", e);
      alert(e instanceof Error ? e.message : "Error al guardar los ítems");
      return false;
    } finally {
      setIsSavingApproverEdit(false);
    }
  };

  const handleSaveApproverEdits = async (): Promise<boolean> => {
    if (!canApproverEdit) {
      if (canAdminGestionEdit || canEstimateEdit) {
        return handleSaveGestionItems();
      }
      return true;
    }
    setIsSavingApproverEdit(true);
    try {
      await updateRequisicionByApprover(record.id, {
        additional_items: editedItems,
        observaciones_compras: editedObservaciones,
        prioridad: editedPrioridad,
        fecha_solicitud: editedFecha,
        solicitante: editedSolicitante,
      });
      return true;
    } catch (e) {
      console.error("Error saving approver edits:", e);
      alert(e instanceof Error ? e.message : "Error al guardar los cambios del aprobador");
      return false;
    } finally {
      setIsSavingApproverEdit(false);
    }
  };

  const getSelectedItemIdsForBatch = () => {
    if (needsItemSelection) {
      return workingItems
        .filter((item) => item.verificacion === "listo")
        .map((item) => String(item.id));
    }
    return workingItems.map((item) => String(item.id));
  };

  /** Confirma el lote (montos + umbral líder). Usado por «Solicitar aprobación» y al procesar sin líder. */
  const confirmBatchCostos = async () => {
    const selectedIds = getSelectedItemIdsForBatch();
    if (needsItemSelection && selectedIds.length === 0) {
      throw new Error(
        "Hay varios ítems. Marque en la columna Procesar cuáles incluirá en este lote.",
      );
    }
    return confirmInternaCostos(record.id, editedItems, {
      selected_item_ids: selectedIds,
    });
  };

  const handleSolicitarAprobacion = async () => {
    setIsUpdating(true);
    try {
      const result = await confirmBatchCostos();
      // Evita falso "sin guardar" tras el sello (mismatched JSON / refresh).
      setLocalItems(editedItems);
      const scope =
        result.totalItems > 1
          ? ` (${result.selectedCount} de ${result.totalItems} ítems)`
          : "";
      if (result.needsLider) {
        alert(
          `Solicitud enviada al líder · $${result.total.toFixed(2)}${scope} (límite $${result.limite}).`,
        );
      } else {
        alert(
          `Total $${result.total.toFixed(2)}${scope} no supera el límite. Ya puede procesar.`,
        );
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo solicitar la aprobación");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    // Skip the live fetch if we already have a stored rate snapshot — the
    // historical rate is what matters for processed requisiciones.
    if (!isCapacitacionForRate || hasStoredRate) return;
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
  const isParcial = estatus === "parcial";
  const isPendiente = estatus === "pendiente";
  const isOpenForAdmin = isPendiente || isParcial;
  const isResolved = isProcesada || isRechazada;
  const isAcuseRecibido = record.acuse_recibido === true;
  const canAcknowledge = isProcesada && !isAcuseRecibido && !isAdminView;
  const linkedOSIs: { id_osi: number }[] = record.requisiciones_osis || [];
  const showOSIHeader = !isGeneralMode || linkedOSIs.length > 0;
  
  const totalFixed = osiFixedItems.reduce((sum, fi) =>
    sum + (fi.dias_traslado || 0) * (fi.costo_traslado || 0) +
    (fi.impresion_total || 0) +
    (fi.honorarios_total || 0) +
    (fi.informe_final_total || 0), 0);
  const workingItems = (canEditItems) ? editedItems : additionalItems;
  const totalAdditional = requisicion_items_total(workingItems);
  const totalGeneral = totalFixed + totalAdditional;

  // Item selection counts (same marks for confirm estimation + process)
  const fixedVerifiedCount = osiFixedItems.reduce((sum, fi) =>
    sum +
    (fi.verificacion_traslado === "listo" ? 1 : 0) +
    (fi.verificacion_impresion === "listo" ? 1 : 0) +
    (fi.verificacion_honorarios === "listo" ? 1 : 0) +
    (fi.verificacion_informe_final === "listo" ? 1 : 0), 0);
  const fixedTotalCount = osiFixedItems.length * 4;
  const additionalVerifiedCount = workingItems.filter(item => item.verificacion === "listo").length;
  const verifiedCount = fixedVerifiedCount + additionalVerifiedCount;
  const totalCount = fixedTotalCount + workingItems.length;
  const isSingleItemProcess = totalCount === 1;
  const needsItemSelection = totalCount > 1;
  const effectiveVerifiedCount = isSingleItemProcess
    ? Math.max(verifiedCount, 1)
    : verifiedCount;
  const progressPct = totalCount > 0 ? (effectiveVerifiedCount / totalCount) * 100 : 0;
  const processButtonLabel = needsItemSelection
    ? effectiveVerifiedCount === 0
      ? "Procesar (marque ítems)"
      : effectiveVerifiedCount < totalCount
        ? `Procesar ${effectiveVerifiedCount} de ${totalCount} seleccionados`
        : `Procesar todos (${totalCount})`
    : "Procesar";

  const selectedWorkingItems = workingItems.filter(
    (item) => item.verificacion === "listo",
  );
  const selectedAdditionalTotal = requisicion_items_total(selectedWorkingItems);
  const gateTotalForConfirm =
    workingItems.length > 1 && selectedWorkingItems.length > 0
      ? selectedAdditionalTotal
      : workingItems.length > 1
        ? 0
        : totalAdditional;
  const batchTotalForGate =
    gateTotalForConfirm > 0 ? gateTotalForConfirm : totalAdditional;
  const limiteUsd = Number(limiteLiderUsd) || 100;
  const estimatedNeedsLider =
    isGeneralMode && interna_needs_lider(batchTotalForGate, limiteUsd);

  const itemsDirty =
    (canAdminGestionEdit || canEstimateEdit) &&
    JSON.stringify(editedItems) !== JSON.stringify(record.additional_items || []);

  const selectionMissing =
    needsItemSelection && selectedWorkingItems.length === 0;
  const processBlockedByCoord =
    isGeneralMode && coordinadorEstatus === "pendiente";
  // Ya se solicitó y el líder aún no sella (independiente de dirty local).
  const awaitingLider =
    isGeneralMode && costsConfirmed && liderEstatus === "pendiente";
  const liderApprovedForBatch =
    isGeneralMode && costsConfirmed && liderEstatus === "aprobada";
  // «Solicitar» solo si aún no está en espera; si hay dirty en espera, permitir reenviar.
  const showSolicitarAprobacion =
    canConfirmCostos &&
    estimatedNeedsLider &&
    !liderApprovedForBatch &&
    (!awaitingLider || itemsDirty);
  // Procesar: nunca junto con Solicitar. Bajo el límite → directo. Sobre el límite → solo tras sello.
  const showProcesar =
    isOpenForAdmin &&
    !processBlockedByCoord &&
    !showSolicitarAprobacion &&
    !awaitingLider &&
    (!isGeneralMode || !estimatedNeedsLider || liderApprovedForBatch);
  const processDisabled =
    isUpdating ||
    selectionMissing ||
    processBlockedByCoord ||
    awaitingLider ||
    (isGeneralMode && estimatedNeedsLider && !liderApprovedForBatch);
  const flowHint = processBlockedByCoord
    ? "Espere el sello del coordinador."
    : selectionMissing
      ? "Marque en Procesar los ítems de este lote."
      : awaitingLider && itemsDirty
        ? "Solicitud ya enviada al líder. Si cambió montos, pulse «Actualizar solicitud»."
        : awaitingLider
          ? null // el banner dedicado lo explica
          : prematureLiderSeal
            ? "Había un sello de líder sin montos. Ajuste costos y solicite aprobación de nuevo."
            : showSolicitarAprobacion
              ? `Lote $${batchTotalForGate.toFixed(2)} > $${limiteUsd.toFixed(0)} · solicite aprobación del líder.`
              : showProcesar && isGeneralMode && !estimatedNeedsLider
                ? `Lote $${batchTotalForGate.toFixed(2)} ≤ $${limiteUsd.toFixed(0)} · sin aprobación de líder.`
                : null;
  const solicitarLabel = awaitingLider && itemsDirty
    ? "Actualizar solicitud"
    : needsItemSelection && selectedWorkingItems.length > 0
      ? `Solicitar aprobación · ${selectedWorkingItems.length} de ${workingItems.length}`
      : "Solicitar aprobación";

  // Total of only selected items — used for copy-all VES calculation
  const verifiedFixedTotal = osiFixedItems.reduce((sum, fi) =>
    sum +
    (fi.verificacion_traslado === "listo" ? (fi.dias_traslado || 0) * (fi.costo_traslado || 0) : 0) +
    (fi.verificacion_impresion === "listo" ? (fi.impresion_total || 0) : 0) +
    (fi.verificacion_honorarios === "listo" ? (fi.honorarios_total || 0) : 0) +
    (fi.verificacion_informe_final === "listo" ? (fi.informe_final_total || 0) : 0), 0);
  const verifiedAdditionalTotal = selectedAdditionalTotal;
  const verifiedTotal = verifiedFixedTotal + verifiedAdditionalTotal;

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

  const hasFacilitador = Boolean(record.cod_facilitador || record.facilitador);
  const saveBankingDetails = async () => {
    if (!hasFacilitador) return;
    await updateFacilitadorBankingDetails(record.id, {
      banco: editBanco,
      nro_cuenta: editNroCuenta,
      telefono_facilitador: editTelefono,
      cedula_facilitador: editCedula,
      rif_facilitador: editRif,
    });
  };

  // Standalone save for the facilitador banking details section (admin only).
  const handleSaveBankingDetails = async () => {
    setIsSavingBanking(true);
    try {
      await saveBankingDetails();
      alert("Datos del facilitador guardados correctamente.");
      router.refresh();
    } catch (error) {
      console.error("Error saving banking details:", error);
      alert(error instanceof Error ? error.message : "Error al guardar los datos del facilitador.");
    } finally {
      setIsSavingBanking(false);
    }
  };

  const handleSetEstatus = async (target: "pendiente" | "parcial" | "procesada" | "rechazada") => {
    // Rejection is handled via the MotivoModal (which captures a reason).
    if (target === "rechazada") {
      setRejectModalOpen(true);
      return;
    }
    if (target === "procesada") {
      if (needsItemSelection && verifiedCount === 0) {
        alert(
          "Hay varios ítems. Marque con ✓ cuáles desea procesar ahora. El resto quedará pendiente (Parcial).",
        );
        return;
      }
      const isPartial = needsItemSelection && verifiedCount < totalCount;
      const nextStatus: "parcial" | "procesada" = isPartial ? "parcial" : "procesada";
      const msg = isPartial
        ? `Se procesarán ${verifiedCount} de ${totalCount} ítems marcados. Los no marcados quedan pendientes (estatus Parcial). ¿Continuar?`
        : isSingleItemProcess
          ? "¿Procesar esta requisición (único ítem)?"
          : "¿Marcar esta requisición como Procesada? El solicitante ya no podrá editarla.";
      if (!confirm(msg)) return;
      setIsUpdating(true);
      try {
        try { await saveBankingDetails(); } catch (e) { console.error("Banking details save failed (non-blocking):", e); }
        // Internas ≤ límite: confirmar lote al vuelo (sin botón aparte).
        if (
          isGeneralMode &&
          (!costsConfirmed || itemsDirty) &&
          !estimatedNeedsLider
        ) {
          await confirmBatchCostos();
        }
        if (isSingleItemProcess && verifiedCount === 0) {
          await markAllItemsVerificadas(record.id);
        }
        await setRequisicionEstatus(
          record.id,
          nextStatus,
          undefined,
          parseFloat(exchangeRateInput) || null,
        );
        router.refresh();
      } catch (error) {
        console.error("Error updating estatus:", error);
        alert(error instanceof Error ? error.message : "Error al actualizar el estatus");
      } finally {
        setIsUpdating(false);
      }
      return;
    }
    const messages: Record<string, string> = {
      pendiente: "¿Revertir esta requisición a Pendiente?",
    };
    if (!confirm(messages[target] || "¿Continuar?")) return;
    setIsUpdating(true);
    try {
      await setRequisicionEstatus(record.id, target);
      router.refresh();
    } catch (error) {
      console.error("Error updating estatus:", error);
      alert(error instanceof Error ? error.message : "Error al actualizar el estatus");
    } finally {
      setIsUpdating(false);
    }
  };

  // Admin reject with a required reason (captured by MotivoModal).
  const handleRejectWithMotivo = async (motivo: string) => {
    setIsUpdating(true);
    try {
      await setRequisicionEstatus(record.id, "rechazada", motivo);
      router.refresh();
    } catch (error) {
      console.error("Error rejecting requisicion:", error);
      alert(error instanceof Error ? error.message : "Error al rechazar la requisición");
    } finally {
      setIsUpdating(false);
    }
  };

  // Coordinador (or lider fallback) approve/reject for pending EXTERNAS.
  const handleCoordinadorApprove = async () => {
    if (!confirm("¿Aprobar esta requisición externa? Se notificará a Administración.")) return;
    setIsUpdating(true);
    try {
      // Save any pending approver edits before approving.
      if (canApproverEdit) {
        const saved = await handleSaveApproverEdits();
        if (!saved) return;
      }
      await approveRequisicionByCoordinador(record.id);
      router.refresh();
    } catch (error) {
      console.error("Error approving requisicion:", error);
      alert(error instanceof Error ? error.message : "Error al aprobar la requisición");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCoordinadorReject = async (motivo: string) => {
    setIsUpdating(true);
    try {
      await rejectRequisicionByCoordinador(record.id, motivo);
      router.refresh();
    } catch (error) {
      console.error("Error rejecting requisicion:", error);
      alert(error instanceof Error ? error.message : "Error al rechazar la requisición");
    } finally {
      setIsUpdating(false);
    }
  };

  // Lider approve/reject for pending INTERNAS.
  const handleLiderApprove = async () => {
    if (!confirm("¿Aprobar esta requisición interna? Se notificará a Administración.")) return;
    setIsUpdating(true);
    try {
      // Save any pending approver edits before approving.
      if (canApproverEdit) {
        const saved = await handleSaveApproverEdits();
        if (!saved) return;
      }
      await approveRequisicionByLider(record.id);
      router.refresh();
    } catch (error) {
      console.error("Error approving requisicion (lider):", error);
      alert(error instanceof Error ? error.message : "Error al aprobar la requisición");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLiderReject = async (motivo: string) => {
    setIsUpdating(true);
    try {
      await rejectRequisicionByLider(record.id, motivo);
      router.refresh();
    } catch (error) {
      console.error("Error rejecting requisicion (lider):", error);
      alert(error instanceof Error ? error.message : "Error al rechazar la requisición");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveProgress = async () => {
    setIsUpdating(true);
    try {
      // Save banking details as a best-effort side effect — a banking failure
      // should NOT block the verification progress save.
      try { await saveBankingDetails(); } catch (e) { console.error("Banking details save failed (non-blocking):", e); }
      const result = await saveVerificacionProgress(record.id);
      alert(`Notificación enviada al solicitante: ${result.verifiedCount} de ${result.totalCount} items verificados.`);
      router.refresh();
    } catch (error) {
      console.error("Error saving verification progress:", error);
      alert("Error al guardar el avance");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcknowledgeReceipt = async () => {
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

  const handlePrintPdf = async () => {
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
          osiData={osiData}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Error printing PDF:", e);
          window.open(url, "_blank");
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
    } catch (error) {
      console.error("Error generating PDF for print:", error);
      alert("Error al generar el PDF para impresión");
    } finally {
      setIsGeneratingPdf(false);
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
          osiData={osiData}
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
    setEditedItems(prev => prev.map(item =>
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
      setEditedItems(prev => prev.map(item =>
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
      <div className="mb-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isGeneratingPdf}
          onClick={handlePrintPdf}
          className="h-8 px-3 text-xs flex gap-1"
        >
          <Printer className="h-3.5 w-3.5" />
          {isGeneratingPdf ? "Generando..." : "Imprimir"}
        </Button>
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
                {formatDate(new Date(executionDate + "T00:00:00"))}
              </span>
            )}
          </div>
        );
      })()}

      {/* Approver diff — shown to the creator when the approver modified the requisicion */}
      {record.aprobador_edito === true && !isAdminView && !canApproverEdit && (
        <ApproverDiff
          originalSnapshot={record.original_snapshot}
          currentRecord={record}
          approverName={record.aprobador_edito_por_nombre}
          approverAt={record.aprobador_edito_at}
        />
      )}

      {/* Approver edit bar — shown when the current user can edit as approver */}
      {canApproverEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-300 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-blue-700 flex-shrink-0" />
          <span className="text-xs text-blue-800 font-medium">
            {canLiderAct || canCoordinadorAct
              ? "Puede modificar el contenido de esta requisición antes de aprobar. El solicitante verá los cambios."
              : "Puede modificar el contenido de esta requisición antes de que Administración la procese. El solicitante verá los cambios."}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSavingApproverEdit || isUpdating}
            onClick={handleSaveApproverEdits}
            className="ml-auto h-8 px-3 text-xs flex gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <Save className="h-3.5 w-3.5" />
            {isSavingApproverEdit ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      )}

      {/* Lider status bar (internas only) */}
      {isGeneralMode && liderEstatus && (
        <div className={`mb-4 flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg shadow-sm border ${
          awaitingLider
            ? "bg-violet-50 border-violet-300"
            : isLiderAprobada
              ? "bg-white border-gray-200"
              : isLiderRechazada
                ? "bg-red-50 border-red-200"
                : "bg-white border-gray-200"
        }`}>
          <span className="text-sm font-medium text-gray-600">Lider:</span>
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
            isLiderAprobada ? 'bg-blue-100 text-blue-800'
            : isLiderRechazada ? 'bg-red-100 text-red-800'
            : awaitingLider ? 'bg-violet-200 text-violet-900'
            : 'bg-amber-100 text-amber-800'
          }`}>
            {isLiderAprobada
              ? "Aprobada"
              : isLiderRechazada
                ? "Rechazada"
                : awaitingLider
                  ? "En espera de sello"
                  : "Pendiente"}
          </span>
          {awaitingLider && (
            <span className="text-sm font-semibold text-violet-900">
              Solicitud enviada · esperando aprobación del líder
              {record.costos_confirmados_at
                ? ` · ${new Date(record.costos_confirmados_at).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}`
                : ""}
            </span>
          )}
          {isLiderRechazada && record.motivo_rechazo_lider && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              Motivo: {record.motivo_rechazo_lider}
            </span>
          )}
          {(liderDeptMatches || awaitingLider) && (
            <span className="text-sm font-semibold text-gray-800">
              Lote ${batchTotalForGate.toFixed(2)}
              <span className="ml-2 text-xs font-medium text-gray-500">
                límite ${limiteUsd.toFixed(2)}
              </span>
            </span>
          )}
          {canLiderAct && (
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={handleLiderApprove}
                className="h-8 px-3 text-xs flex gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprobar (Lider)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => setLiderRejectOpen(true)}
                className="h-8 px-3 text-xs flex gap-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Rechazar (Lider)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Banner claro: ya se solicitó, no hace falta volver a pulsar */}
      {isAdminView && awaitingLider && isOpenForAdmin && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-violet-100 border border-violet-300 rounded-lg">
          <Clock className="h-5 w-5 text-violet-700 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-violet-950">
              En espera de aprobación del líder
            </p>
            <p className="text-xs text-violet-900/90 mt-0.5">
              La solicitud ya fue enviada
              {batchTotalForGate > 0 ? ` (lote $${batchTotalForGate.toFixed(2)})` : ""}.
              Cuando el líder selle, podrá procesar. No es necesario solicitar de nuevo
              {itemsDirty ? " salvo que cambie los montos" : ""}.
            </p>
          </div>
        </div>
      )}

      {/* Coordinador status bar (internas only) */}
      {isGeneralMode && coordinadorEstatus && (
        <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <span className="text-sm font-medium text-gray-600">Coordinador:</span>
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
            isCoordinadorAprobada ? 'bg-blue-100 text-blue-800'
            : isCoordinadorRechazada ? 'bg-red-100 text-red-800'
            : 'bg-amber-100 text-amber-800'
          }`}>
            {isCoordinadorAprobada ? "Aprobada" : isCoordinadorRechazada ? "Rechazada" : "Pendiente"}
          </span>
          {isCoordinadorRechazada && record.motivo_rechazo_coordinador && (
            <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              Motivo: {record.motivo_rechazo_coordinador}
            </span>
          )}
          {canCoordinadorAct && (
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={handleCoordinadorApprove}
                className="h-8 px-3 text-xs flex gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprobar (Coordinador)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => setCoordinadorRejectOpen(true)}
                className="h-8 px-3 text-xs flex gap-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Rechazar (Coordinador)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Admin rejection reason display */}
      {isRechazada && record.motivo_rechazo && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <span className="font-bold">Motivo del rechazo: </span>
          {record.motivo_rechazo}
        </div>
      )}

      {/* Admin action bar */}
      {isAdminView && (
        <div className="mb-4 flex flex-col gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Estatus:</span>
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
            isProcesada ? 'bg-emerald-100 text-emerald-800'
              : isParcial ? 'bg-sky-100 text-sky-800'
              : isRechazada ? 'bg-red-100 text-red-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {isProcesada ? "Procesada" : isParcial ? "Parcial" : isRechazada ? "Rechazada" : "Pendiente"}
          </span>
          {(isResolved || isParcial) && record.procesada_por_nombre && (
            <span className="text-xs text-gray-500">
              {isProcesada ? "Procesada" : isParcial ? "Avance" : "Rechazada"} por <span className="font-medium text-gray-700">{record.procesada_por_nombre}</span>
              {record.procesada_at && ` el ${new Date(record.procesada_at).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}`}
            </span>
          )}
          {isProcesada && (
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
              isAcuseRecibido ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
            }`}>
              {isAcuseRecibido ? "Recibido" : "Pendiente recepción"}
            </span>
          )}
          {awaitingLider && (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-violet-100 text-violet-800">
              Esperando líder
            </span>
          )}
          {isOpenForAdmin && isGeneralMode && !estimatedNeedsLider && !processBlockedByCoord && !selectionMissing && (
            <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Sin aprobación · ≤ ${limiteUsd.toFixed(0)}
            </span>
          )}
          <div className="ml-auto flex gap-2 flex-wrap items-center">
            {isOpenForAdmin && (
              <>
                {showSolicitarAprobacion ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUpdating || selectionMissing}
                    onClick={() => void handleSolicitarAprobacion()}
                    title={
                      selectionMissing
                        ? "Marque al menos un ítem en la columna Procesar"
                        : `Total del lote $${batchTotalForGate.toFixed(2)}`
                    }
                    className="h-8 px-3 text-xs flex gap-1 border-violet-300 text-violet-800 hover:bg-violet-50"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    {solicitarLabel}
                  </Button>
                ) : null}
                {isAdminView && isGeneralMode && !coordDoneForAdmin && !adminProcessed ? (
                  <span className="text-[11px] text-amber-700 self-center">
                    Disponible tras sello del coordinador
                  </span>
                ) : null}
                {showProcesar ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={processDisabled}
                    onClick={() => handleSetEstatus("procesada")}
                    title={flowHint || undefined}
                    className="h-8 px-3 text-xs flex gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {processButtonLabel}
                  </Button>
                ) : null}
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
          {isOpenForAdmin && flowHint ? (
            <p className="text-[11px] text-slate-600">{flowHint}</p>
          ) : null}
          {isOpenForAdmin && itemsDirty ? (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-200">
              <span className="text-[11px] text-amber-700">Hay cambios en ítems sin guardar.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdating || isSavingApproverEdit}
                onClick={() => void handleSaveGestionItems().then((ok) => { if (ok) router.refresh(); })}
                className="h-7 px-2.5 text-[11px] flex gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Save className="h-3 w-3" />
                {isSavingApproverEdit ? "Guardando…" : "Guardar ítems"}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Selection guide — compact */}
      {isAdminView && needsItemSelection && isOpenForAdmin && (
        <div className="mb-4 px-4 py-2.5 bg-sky-50 border border-sky-200 rounded-lg">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm font-semibold text-sky-900">
              Lote: {verifiedCount} de {totalCount} marcados
            </span>
            {needsItemSelection && verifiedCount > 0 && verifiedCount < totalCount ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUpdating}
                onClick={handleSaveProgress}
                className="h-7 px-2 text-[11px] text-sky-800 hover:bg-sky-100"
              >
                Avisar al solicitante
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-sky-800/80 mt-1">
            Marque la columna Procesar. El umbral del líder (${limiteUsd.toFixed(0)}) y el cierre aplican solo a lo marcado; el resto queda Parcial.
          </p>
          <div className="mt-2 w-full h-1.5 bg-white/80 rounded-full overflow-hidden border border-sky-100">
            <div
              className={`h-full rounded-full transition-all ${
                verifiedCount === totalCount ? "bg-emerald-500" : verifiedCount > 0 ? "bg-sky-500" : "bg-gray-200"
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
              {canApproverEdit ? (
                <input
                  type="date"
                  value={editedFecha}
                  onChange={(e) => setEditedFecha(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                record.fecha_solicitud ? formatDate(new Date(record.fecha_solicitud + "T00:00:00")) : "-"
              )}
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
            <div className="col-span-3 p-3 border-r border-gray-300 flex items-center uppercase font-medium">
              {displayGerencia || "-"}
            </div>
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Departamento:</span>
            </div>
            <div className="col-span-3 min-w-0 p-3 flex items-center gap-1.5 uppercase font-medium">
              {canEditDepartamento ? (
                <>
                  <Select
                    value={editedDepartamento}
                    onValueChange={setEditedDepartamento}
                    disabled={isSavingDepartamento}
                  >
                    <SelectTrigger className="h-8 min-w-0 flex-1 text-sm font-medium uppercase">
                      <SelectValue placeholder="Seleccione departamento…" />
                    </SelectTrigger>
                    <SelectContent>
                      {departamentoOptions.map((row) => (
                        <SelectItem key={row.nombre} value={row.nombre}>
                          {row.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    title="Guardar departamento"
                    aria-label="Guardar departamento"
                    disabled={
                      isSavingDepartamento ||
                      !editedDepartamento.trim() ||
                      editedDepartamento.trim() ===
                        (record.departamento || "").trim()
                    }
                    onClick={() => void handleSaveDepartamento()}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                record.departamento || "-"
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Nombre del solicitante:</span>
            </div>
            <div className="col-span-9 p-3 flex items-center font-bold uppercase">
              {canApproverEdit ? (
                <input
                  type="text"
                  value={editedSolicitante}
                  onChange={(e) => setEditedSolicitante(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                record.solicitante || "-"
              )}
            </div>
          </div>

          {/* Selected session (Capacitación Externa with a multi-session OSI) */}
          {!isGeneralMode && record.id_sesion && (() => {
            const sesiones = (osiData?.desglose_recursos_sesiones as any[] | null | undefined) || [];
            const sesion = sesiones.find((s) => s.id_sesion === record.id_sesion);
            if (!sesion) return null;
            return (
              <div className="grid grid-cols-12 border-b border-gray-300">
                <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
                  Sesión:
                </div>
                <div className="col-span-9 p-3 flex items-center font-medium text-sm">
                  {`Sesión #${sesion.nro_sesion ?? sesion.id_sesion}${sesion.fecha ? ` — ${sesion.fecha}` : ""}`}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Prioridad:
            </div>
            <div className="col-span-9 p-3 flex items-center">
              {canApproverEdit ? (
                <select
                  value={editedPrioridad}
                  onChange={(e) => setEditedPrioridad(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">Sin prioridad</option>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              ) : (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  record.prioridad === 'Alta' ? 'bg-red-100 text-red-800' :
                  record.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {record.prioridad || "-"}
                </span>
              )}
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
                <th className="p-2 border-r border-gray-300 w-20">CANT</th>
                <th className="p-2 border-r border-gray-300">DESCRIPCIÓN</th>
                {showInternaMontos ? (
                  <RequisicionPriceHeaders />
                ) : !isGeneralMode ? (
                  <>
                    <th className="p-2 border-r border-gray-300 w-32">PRECIO U.</th>
                    {((isCapacitacion && osiFixedItems.length > 1) || linkedOSIs.length > 1) && (
                      <th className="p-2 border-r border-gray-300 w-28">OSI</th>
                    )}
                    <th className="p-2 w-32">TOTAL</th>
                  </>
                ) : null}
                {isGeneralMode && isAdminView && linkedOSIs.length > 1 && (
                  <th className="p-2 border-r border-gray-300 w-28">OSI</th>
                )}
                {isGeneralMode && canEditItems ? (
                  <th className="p-2 w-24">Acciones</th>
                ) : isGeneralMode && !isAdminView ? (
                  <th className="p-2 w-24">Estado</th>
                ) : null}
                {isAdminView && needsItemSelection ? (
                  <th className="p-2 w-24 border-l border-gray-300" title="Marque el lote a estimar/procesar">
                    Procesar
                  </th>
                ) : null}
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
                    <span className="uppercase text-[10px] font-medium">DÍAS DE TRASL. COSTO $</span>
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
                {isAdminView && needsItemSelection && (
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
                {isAdminView && needsItemSelection && (
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
                    <span className="font-medium uppercase">HONORARIOS $</span>
                    <span className="mx-2 font-bold">${(fi.honorarios_costo_hora || 0).toFixed(2)}</span>
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
                {isAdminView && needsItemSelection && (
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
                {isAdminView && needsItemSelection && (
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
                {isAdminView && needsItemSelection && <td className="p-2 border-l border-gray-300"></td>}
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
                    {isAdminView && needsItemSelection && (
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
                  {isAdminView && needsItemSelection && <td className="p-2 border-l border-gray-300"></td>}
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
                          {isAdminView && needsItemSelection && (
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
              {!isCapacitacion && !canEditItems && additionalItems.map((item, index) => (
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
                  {(!isGeneralMode || showInternaMontos) && (
                    <>
                      <td className="p-2 text-center font-bold border-r border-gray-300">
                        ${item.costo_unitario?.toFixed(2) || "0.00"}
                      </td>
                      <td className="p-2 text-center font-bold border-r border-gray-300 bg-amber-50/40">
                        ${item.total?.toFixed(2) || "0.00"}
                      </td>
                    </>
                  )}
                  {linkedOSIs.length > 1 && (
                    <td className="p-2 text-center border-r border-gray-300 font-bold text-blue-700 text-[10px]">
                      {item.id_osi != null ? (osiLookup?.get(item.id_osi) || `#${item.id_osi}`) : "Sin asignar"}
                    </td>
                  )}
                  {isGeneralMode && !isAdminView ? (
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.verificacion === "listo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.verificacion === "listo" ? "Tramitado" : "Pendiente"}
                      </span>
                    </td>
                  ) : null}
                  {isAdminView && needsItemSelection && (
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

              {/* Additional Items — editable mode (aprobador / Admin gestion:edit) */}
              {!isCapacitacion && canEditItems && editedItems.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-300 bg-blue-50/30">
                  <td className="p-2 text-center border-r border-gray-300 font-bold">{index + 1}</td>
                  <td className="p-2 border-r border-gray-300 text-center">
                    <input
                      type="text"
                      value={item.unidad || "und"}
                      onChange={(e) => handleApproverItemChange(item.id, "unidad", e.target.value)}
                      className="w-16 px-1 py-0.5 text-xs text-center border border-gray-300 rounded uppercase font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="p-2 text-center border-r border-gray-300">
                    <NumberInput
                      value={item.cant || 1}
                      onValueChange={(n) => handleApproverItemChange(item.id, "cant", n)}
                      allowDecimal={false}
                      min={1}
                      step={1}
                      className="w-full px-1 py-0.5 text-xs text-center border border-gray-300 rounded font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="p-2 border-r border-gray-300">
                    <input
                      type="text"
                      value={item.descripcion || ""}
                      onChange={(e) => handleApproverItemChange(item.id, "descripcion", e.target.value)}
                      className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded uppercase focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder="Descripción..."
                    />
                  </td>
                  {(!isGeneralMode || canEstimateEdit || canAdminGestionEdit) ? (
                    <RequisicionItemMoneyInputs
                      costo_unitario={item.costo_unitario || 0}
                      total={item.total || 0}
                      onChange={(field, n) => handleApproverItemChange(item.id, field, n)}
                    />
                  ) : showInternaMontos ? (
                    <>
                      <td className="p-2 text-center font-bold border-r border-gray-300">
                        ${item.costo_unitario?.toFixed(2) || "0.00"}
                      </td>
                      <td className="p-2 text-center font-bold border-r border-gray-300 bg-amber-50/40">
                        ${item.total?.toFixed(2) || "0.00"}
                      </td>
                    </>
                  ) : null}
                  {isGeneralMode ? (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveApproverItem(item.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-1"
                        title="Eliminar item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  ) : (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveApproverItem(item.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-0.5"
                        title="Eliminar item"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  )}
                  {isAdminView && needsItemSelection && (
                    <td className="p-2 text-center border-l border-gray-300">
                      <input
                        type="checkbox"
                        checked={item.verificacion === "listo"}
                        disabled={togglingItemId === item.id || !isOpenForAdmin}
                        onChange={() =>
                          handleToggleItem(item.id, item.verificacion || "pendiente")
                        }
                        className="h-4 w-4 cursor-pointer accent-emerald-600"
                        title={formatVerificadoTitle(
                          item.verificacion === "listo",
                          item.verificado_por,
                          item.verificado_en,
                        )}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {/* Add item button */}
              {!isCapacitacion && canEditItems && (
                <tr className="border-b border-gray-300 bg-blue-50/20">
                  <td colSpan={isGeneralMode ? (isAdminView && needsItemSelection ? 8 : 7) : 7} className="p-2">
                    <button
                      type="button"
                      onClick={handleAddApproverItem}
                      className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar item
                    </button>
                  </td>
                </tr>
              )}

              {(!isGeneralMode || showInternaMontos) && (
              <tr className="bg-gray-100 border-b border-gray-300">
                <td colSpan={(isCapacitacion && osiFixedItems.length > 1) || (!isCapacitacion && linkedOSIs.length > 1) ? 6 : 5} className="p-2 text-right font-bold uppercase text-sm">Total General:</td>
                <td className="p-2 text-center font-bold text-sm bg-yellow-50">
                  ${totalGeneral.toFixed(2)}
                </td>
                {isGeneralMode && (
                  <td className="p-2 bg-gray-100"></td>
                )}
                {isAdminView && needsItemSelection && (
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
            {canApproverEdit ? (
              <textarea
                value={editedObservaciones}
                onChange={(e) => setEditedObservaciones(e.target.value)}
                className="w-full min-h-[80px] px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 normal-case"
                placeholder="Observaciones..."
              />
            ) : (
              record.observaciones_compras || "SIN OBSERVACIONES"
            )}
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
                className="ml-1 p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 bg-transparent border-none transition-colors cursor-pointer"
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
                className="flex items-center gap-1 text-[10px] font-normal text-gray-500 hover:text-blue-700 hover:bg-blue-50 bg-transparent border-none normal-case px-1.5 py-0.5 rounded transition-colors cursor-pointer"
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
              {isAdminView ? (
                <input
                  type="text"
                  value={editCedula}
                  onChange={(e) => setEditCedula(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                <>
                  {record.cedula_facilitador || "-"}
                  {record.cedula_facilitador && <CopyIcon field="cedula" value={record.cedula_facilitador} />}
                </>
              )}
            </div>
            <div className="col-span-3 p-2 flex items-center justify-between font-bold uppercase">
              {isAdminView ? (
                <input
                  type="text"
                  value={editRif}
                  onChange={(e) => setEditRif(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                <>
                  {record.rif_facilitador || "-"}
                  {record.rif_facilitador && <CopyIcon field="rif" value={record.rif_facilitador} />}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 text-xs h-10 border-b border-gray-300">
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Banco
            </div>
            <div className="col-span-2 p-2 border-r border-gray-300 flex items-center justify-between font-bold uppercase">
              {isAdminView ? (
                <select
                  value={editBanco}
                  onChange={(e) => setEditBanco(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">Seleccionar banco...</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.nombre}>{bank.nombre}</option>
                  ))}
                </select>
              ) : (
                <>
                  {record.banco || "-"}
                  {record.banco && <CopyIcon field="banco" value={record.banco} />}
                </>
              )}
            </div>
            <div className="col-span-2 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Nro Cuenta.
            </div>
            <div className="col-span-4 p-2 border-r border-gray-300 flex items-center justify-between font-bold break-all">
              {isAdminView ? (
                <input
                  type="text"
                  value={editNroCuenta}
                  onChange={(e) => setEditNroCuenta(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                <>
                  {record.nro_cuenta || "-"}
                  {record.nro_cuenta && <CopyIcon field="cuenta" value={record.nro_cuenta} />}
                </>
              )}
            </div>
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Tel.
            </div>
            <div className="col-span-2 p-2 flex items-center justify-between font-bold">
              {isAdminView ? (
                <input
                  type="text"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              ) : (
                <>
                  {record.telefono_facilitador || "-"}
                  {record.telefono_facilitador && <CopyIcon field="telefono" value={record.telefono_facilitador} />}
                </>
              )}
            </div>
          </div>

          {/* Save banking details button (admin only) */}
          {isAdminView && hasFacilitador && (
            <div className="flex justify-end p-2 border-b border-gray-300">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingBanking}
                onClick={handleSaveBankingDetails}
                className="h-7 px-3 text-xs flex gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Save className="h-3.5 w-3.5" />
                Guardar Datos Facilitador
              </Button>
            </div>
          )}

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
                disabled={isLoadingRate || hasStoredRate}
                readOnly={hasStoredRate}
                className={`w-full px-2 py-1 text-xs border border-gray-300 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                  hasStoredRate ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""
                }`}
              />
              {hasStoredRate && (
                <span className="text-[9px] text-gray-400 whitespace-nowrap" title={`Guardada el ${record.tasa_cambio_at ? new Date(record.tasa_cambio_at).toLocaleString("es-VE") : ""}`}>
                  (guardada)
                </span>
              )}
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
        <div className="mt-4 flex flex-col gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Acciones:</span>
          <div className="ml-auto flex gap-2 flex-wrap items-center">
            {isOpenForAdmin && (
              <>
                {showSolicitarAprobacion ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUpdating || selectionMissing}
                    onClick={() => void handleSolicitarAprobacion()}
                    className="h-8 px-3 text-xs flex gap-1 border-violet-300 text-violet-800 hover:bg-violet-50"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    {solicitarLabel}
                  </Button>
                ) : null}
                {showProcesar ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={processDisabled}
                    onClick={() => handleSetEstatus("procesada")}
                    title={flowHint || undefined}
                    className="h-8 px-3 text-xs flex gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {processButtonLabel}
                  </Button>
                ) : null}
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
          {isOpenForAdmin && flowHint ? (
            <p className="text-[11px] text-slate-600">{flowHint}</p>
          ) : null}
          {isOpenForAdmin && itemsDirty ? (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-200">
              <span className="text-[11px] text-amber-700">Hay cambios en ítems sin guardar.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdating || isSavingApproverEdit}
                onClick={() => void handleSaveGestionItems().then((ok) => { if (ok) router.refresh(); })}
                className="h-7 px-2.5 text-[11px] flex gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Save className="h-3 w-3" />
                {isSavingApproverEdit ? "Guardando…" : "Guardar ítems"}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Creator acknowledge receipt bar */}
      {canAcknowledge && (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <PackageCheck className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Esta requisición ha sido procesada por Administración.
          </span>
          <div className="ml-auto">
            <Button
              type="button"
              size="sm"
              disabled={isUpdating}
              onClick={handleAcknowledgeReceipt}
              className="h-8 px-3 text-xs flex gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PackageCheck className="h-3.5 w-3.5" />
              Confirmar Recepción
            </Button>
          </div>
        </div>
      )}
      {isProcesada && isAcuseRecibido && (
        <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
          <PackageCheck className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">
            Recepción confirmada{record.acuse_recibido_at ? ` el ${new Date(record.acuse_recibido_at).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}` : ""}
          </span>
        </div>
      )}

      {/* Admin reject modal (requires a reason) */}
      <MotivoModal
        open={rejectModalOpen}
        title="Rechazar Requisición"
        description="El solicitante será notificado con el motivo del rechazo."
        confirmLabel="Rechazar"
        onConfirm={handleRejectWithMotivo}
        onClose={() => setRejectModalOpen(false)}
      />

      {/* Coordinador reject modal (externas, requires a reason) */}
      <MotivoModal
        open={coordinadorRejectOpen}
        title="Rechazar Requisición Externa"
        description="El solicitante será notificado y la requisición quedará bloqueada."
        confirmLabel="Rechazar"
        onConfirm={handleCoordinadorReject}
        onClose={() => setCoordinadorRejectOpen(false)}
      />

      {/* Lider reject modal (internas, requires a reason) */}
      <MotivoModal
        open={liderRejectOpen}
        title="Rechazar Requisición Interna"
        description="El solicitante será notificado y la requisición quedará bloqueada."
        confirmLabel="Rechazar"
        onConfirm={handleLiderReject}
        onClose={() => setLiderRejectOpen(false)}
      />
    </div>
  );
}
