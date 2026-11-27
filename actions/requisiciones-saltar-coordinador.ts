"use server";

import { revalidatePath } from "next/cache";
import { notifyLiderOfPendingInterna } from "@/actions/requisicion-notifications";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import {
  motivo_no_saltar_coordinador,
  parche_salto_coordinador,
} from "@/features/requisiciones/lib/req-saltar-coordinador";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Omite el sello del coordinador y deja la interna pendiente del líder. */
export async function saltarAprobacionCoordinador(id: number) {
  const access = await getRequisicionAccess();
  if (!access.can_process) {
    throw new Error("No tiene permiso para saltar la aprobación del coordinador.");
  }

  const supabase = await createClient();
  const user_id = (await supabase.auth.getUser()).data.user?.id;
  if (!user_id) throw new Error("Sesión no válida.");

  const admin = await createAdminClient();
  const { data: existing, error: fetch_error } = await admin
    .from("requisiciones")
    .select(
      "id, tipo_solicitud, clase_pedido, id_osi, coordinador_estatus, lider_estatus, estatus_admin, suspendida_at, solicitante, departamento",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetch_error || !existing) throw new Error("Requisición no encontrada.");

  const motivo = motivo_no_saltar_coordinador(existing);
  if (motivo) throw new Error(motivo);

  const { error } = await admin
    .from("requisiciones")
    .update(parche_salto_coordinador(user_id, new Date().toISOString()))
    .eq("id", id)
    .eq("coordinador_estatus", "pendiente");

  if (error) throw error;

  await notifyLiderOfPendingInterna(
    id,
    existing.solicitante || "",
    existing.departamento || "",
  );

  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}
