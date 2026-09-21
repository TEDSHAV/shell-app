"use client";

export function PermissionLine({
  slug,
  descripcion,
}: {
  slug: string;
  descripcion: string | null;
}) {
  return (
    <span className="min-w-0 leading-snug">
      <span className="block text-sm text-slate-700">
        {descripcion || slug}
      </span>
      <span className="font-mono text-[10px] text-slate-400">{slug}</span>
    </span>
  );
}
