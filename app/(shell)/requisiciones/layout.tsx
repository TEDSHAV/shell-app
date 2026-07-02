// Requisiciones is available in development mode only while under refinement.
const isDev = process.env.NODE_ENV === "development";

export default function RequisicionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDev) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <h2 className="text-xl font-bold text-gray-700">Módulo en desarrollo</h2>
        <p className="text-sm text-gray-500 max-w-md">
          El módulo de Requisiciones está en fase de desarrollo y no está disponible en producción.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
