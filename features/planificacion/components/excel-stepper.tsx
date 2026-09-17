"use client";

const STEPS = [
  { n: 1, label: "Archivo" },
  { n: 2, label: "Qué cargar" },
  { n: 3, label: "Módulos" },
  { n: 4, label: "Listo" },
] as const;

export function ExcelStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((item) => {
        const active = item.n === step;
        const done = item.n < step;
        return (
          <li key={item.n} className="min-w-0">
            <div
              className={`h-1 rounded-full ${
                done || active ? "bg-gray-900" : "bg-gray-200"
              }`}
            />
            <p
              className={`mt-2 truncate text-xs font-medium sm:text-sm ${
                active
                  ? "text-gray-900"
                  : done
                    ? "text-gray-700"
                    : "text-gray-400"
              }`}
            >
              <span className="tabular-nums">{item.n}.</span> {item.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
