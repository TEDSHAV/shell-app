import { Metadata } from "next";
import { DEFAULT_VISITANTES_CONFIG } from "@/features/visitantes/lib/visitantes-defaults";
import { RegistroVisitanteForm } from "./RegistroVisitanteForm";

export const metadata: Metadata = {
  title: "Registro de Visitantes | SHA de Venezuela",
  description:
    "Formulario oficial de control de acceso y registro de visitantes de SHA de Venezuela, C.A.",
};

const DEFAULT_DEPARTAMENTOS = [
  "Administración",
  "Calidad",
  "Capacitación",
  "Dirección",
  "Marketing",
  "Negocios",
  "Recursos Humanos",
  "Servicios Técnicos",
  "TED",
];

export default function RegistroVisitantePublicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 px-4 py-6 sm:py-10 sm:px-6 lg:px-8 flex flex-col justify-between">
      <main className="w-full">
        <RegistroVisitanteForm
          config={DEFAULT_VISITANTES_CONFIG}
          departamentos={DEFAULT_DEPARTAMENTOS}
        />
      </main>

      <footer className="mt-10 text-center text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} SHA de Venezuela, C.A. • Sistema
          Integrado de Gestión y Control de Acceso
        </p>
      </footer>
    </div>
  );
}
