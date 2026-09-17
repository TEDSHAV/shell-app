import Link from "next/link";

export function ExcelStepDone({
  created_modulos,
  created_tareas,
  skipped,
  failed,
}: {
  created_modulos: number;
  created_tareas: number;
  skipped: number;
  failed: string[];
}) {
  return (
    <div className="space-y-2 text-sm text-gray-700">
      <p>
        Se crearon <strong>{created_modulos}</strong> módulos y{" "}
        <strong>{created_tareas}</strong> tareas.
        {skipped > 0 ? ` Se omitieron ${skipped} duplicados.` : ""}
      </p>
      {failed.length > 0 ? (
        <ul className="list-disc pl-5 text-xs text-red-500">
          {failed.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400">Sin errores de inserción.</p>
      )}
      <Link
        href="/ted/planificacion"
        className="mt-4 inline-flex h-9 items-center rounded-md bg-gray-900 px-4 text-sm font-medium text-white"
      >
        Ir a planificación
      </Link>
    </div>
  );
}
