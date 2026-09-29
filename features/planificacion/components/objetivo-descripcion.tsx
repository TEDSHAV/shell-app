"use client";

import { parse_objetivo_texto } from "../lib/objetivo-texto";
import { cn } from "@/lib/utils";

export function ObjetivoDescripcion({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parse_objetivo_texto(text);
  if (blocks.length === 0) return null;
  return (
    <div className={cn("space-y-2 text-sm leading-relaxed text-slate-600", className)}>
      {blocks.map((block, index) =>
        block.type === "p" ? (
          <p key={`p-${index}`}>{block.text}</p>
        ) : (
          <ul key={`ul-${index}`} className="list-disc space-y-1 pl-5">
            {block.items.map((item, item_index) => (
              <li key={item_index}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
