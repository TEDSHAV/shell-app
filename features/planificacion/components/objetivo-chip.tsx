export function ObjetivoChip({ titulo }: { titulo: string | null | undefined }) {
  if (!titulo) return null;
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
      Objetivo: {titulo}
    </span>
  );
}
