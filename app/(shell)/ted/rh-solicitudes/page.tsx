import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { isTedMember } from "@/actions/ted";
import { createAdminClient } from "@/lib/supabase/server";
import { RhSolicitudesTedClient } from "./RhSolicitudesTedClient";

export const dynamic = "force-dynamic";

type SolicitudEstado = "pendiente" | "en_proceso" | "completada" | "rechazada";

type RhSolicitudRow = {
  id: number;
  nombre_apellido: string;
  cedula: string | null;
  cargo: string | null;
  departamento: number | null;
  telefono: string | null;
  solicitar_email: boolean;
  solicitar_firma_email: boolean;
  estado: SolicitudEstado;
  notas: string | null;
  solicitado_por: number | null;
  procesado_por: number | null;
  created_at: string;
  updated_at: string;
  solicitado_por_usuario: { nombre_apellido: string } | null;
  procesado_por_usuario: { nombre_apellido: string } | null;
  departamentos: { nombre: string } | null;
};

export default async function TedRhSolicitudesPage() {
  const allowed = await isTedMember();
  if (!allowed) {
    redirect("/dashboard");
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("rh_solicitudes")
    .select(`
      *,
      solicitado_por_usuario:usuarios!rh_solicitudes_solicitado_por_fkey(nombre_apellido),
      procesado_por_usuario:usuarios!rh_solicitudes_procesado_por_fkey(nombre_apellido),
      departamentos!rh_solicitudes_departamento_fkey(nombre)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ted/rh-solicitudes] Fetch error:", error);
  }

  const solicitudes: RhSolicitudRow[] = (data ?? []) as RhSolicitudRow[];

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <div className="mb-8 space-y-3">
        <Link
          href="/ted"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a TED
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Solicitudes de Usuarios (RRHH)
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Solicitudes de creación de usuarios y emails corporativos enviadas desde Recursos Humanos.
            </p>
          </div>
        </div>
      </div>

      <RhSolicitudesTedClient solicitudes={solicitudes} />
    </div>
  );
}
