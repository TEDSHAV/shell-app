import { Metadata } from "next";
import { getEncuestaByToken } from "@/actions/satisfaccion-clientes";
import { SatisfaccionClienteForm } from "./SatisfaccionClienteForm";
import { AlertCircle, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Encuesta de Satisfacción de Clientes | SHA de Venezuela",
  description: "Formulario oficial de evaluación y satisfacción de servicios prestados por SHA de Venezuela.",
};

export default async function SatisfaccionPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getEncuestaByToken(token);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 px-4 py-8 sm:py-12 sm:px-6 lg:px-8 flex flex-col justify-between">
      <main className="w-full">
        {result.ok && result.encuesta ? (
          <SatisfaccionClienteForm encuesta={result.encuesta} />
        ) : result.alreadyResponded ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg sm:p-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Encuesta ya completada</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {result.error || "Esta encuesta ya ha sido respondida previamente. ¡Agradecemos enormemente su tiempo y retroalimentación!"}
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg sm:p-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Enlace no disponible</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {result.error || "El enlace de encuesta ingresado no es válido o ha expirado. Por favor contacte a su ejecutivo de cuentas de SHA de Venezuela."}
            </p>
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SHA de Venezuela, C.A. • Sistema Integrado de Gestión y Calidad</p>
      </footer>
    </div>
  );
}
