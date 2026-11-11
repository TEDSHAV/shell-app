type OSICommentsBadgeProps = {
  count?: number | null;
  className?: string;
};

/** Burbuja con el número de comentarios vinculados a una OSI. Oculta en 0. */
export default function OSICommentsBadge({ count, className = "" }: OSICommentsBadgeProps) {
  if (!count || count <= 0) return null;
  return (
    <span
      aria-label={`${count} comentarios`}
      className={`pointer-events-none absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white ${className}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
