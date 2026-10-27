import { redirect } from "next/navigation";
import { Metadata } from "next";
import {
  canAccessSatisfaccionClientes,
  getSatisfaccionDashboard,
} from "@/actions/satisfaccion-clientes";
import { getUsuarioRecord } from "@/actions/apps";
import { createAdminClient } from "@/lib/supabase/server";
import { SatisfaccionClientesClient } from "@/features/satisfaccion-clientes/components/SatisfaccionClientesClient";

export const metadata: Metadata = {
  title: "Satisfacción de Clientes | PRISMA",
  description: "Indicadores de calidad y satisfacción de clientes de SHA de Venezuela.",
};

export default async function SatisfaccionClientesPage() {
  const allowed = await canAccessSatisfaccionClientes();
  if (!allowed) {
    redirect("/dashboard");
  }

  const [dashboardData, usuarioRecord] = await Promise.all([
    getSatisfaccionDashboard(),
    getUsuarioRecord(),
  ]);

  let userNombre = "Usuario PRISMA";
  if (usuarioRecord?.id) {
    const admin = await createAdminClient();
    const { data: usuario } = await admin
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id", usuarioRecord.id)
      .maybeSingle();
    if (usuario?.nombre_apellido) {
      userNombre = usuario.nombre_apellido;
    }
  }

  return (
    <div className="w-full">
      <SatisfaccionClientesClient
        initialEncuestas={dashboardData.encuestas}
        initialKpis={dashboardData.kpis}
        initialFilterOptions={dashboardData.filterOptions}
        currentUserNombre={userNombre}
      />
    </div>
  );
}
