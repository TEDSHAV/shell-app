import {
  fetchProveedores,
  fetchCatalogoEstados,
} from "../actions/proveedores";
import ProveedoresClient from "./ProveedoresClient";

export const metadata = {
  title: "Gestión de Proveedores | SHA Administración",
  description: "Registro de proveedores, control de impacto operativo, datos bancarios y trazabilidad",
};

export default async function ProveedoresPage() {
  const [proveedores, estados] = await Promise.all([
    fetchProveedores(),
    fetchCatalogoEstados(),
  ]);

  return (
    <ProveedoresClient
      initialProveedores={proveedores}
      estados={estados}
    />
  );
}
