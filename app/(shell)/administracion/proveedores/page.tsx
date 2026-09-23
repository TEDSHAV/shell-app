import { createClient } from "@/lib/supabase/server";
import {
  fetchProveedores,
  fetchCatalogoEstados,
} from "@/actions/proveedores";
import ProveedoresClient from "./ProveedoresClient";

export const metadata = {
  title: "Gestión de Proveedores | SHA Administración",
  description: "Registro de proveedores, control de impacto operativo, datos bancarios y trazabilidad",
};

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userName = user?.email || "Usuario";

  let displayName = userName;
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id_auth", user.id)
      .single();
    if (usuario?.nombre_apellido) {
      displayName = usuario.nombre_apellido;
    }
  }

  const [proveedores, estados] = await Promise.all([
    fetchProveedores(),
    fetchCatalogoEstados(),
  ]);

  return (
    <ProveedoresClient
      userName={displayName}
      initialProveedores={proveedores}
      estados={estados}
    />
  );
}
