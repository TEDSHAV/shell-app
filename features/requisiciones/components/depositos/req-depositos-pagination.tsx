"use client";

import { Button } from "@/components/ui/button";

export const INV_PAGE_SIZE_OPTIONS = [10, 30, 50] as const;

export function ReqDepositosPagination({
  page,
  page_size,
  total,
  on_page,
  on_page_size,
}: {
  page: number;
  page_size: number;
  total: number;
  on_page: (page: number) => void;
  on_page_size: (size: number) => void;
}) {
  const total_pages = Math.max(1, Math.ceil(total / page_size));
  const safe_page = Math.min(page, total_pages);
  const from = total === 0 ? 0 : (safe_page - 1) * page_size + 1;
  const to = Math.min(safe_page * page_size, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
      <p>
        {from}–{to} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1">
          <span>Por página</span>
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2"
            value={page_size}
            onChange={(event) => on_page_size(Number(event.target.value))}
          >
            {INV_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safe_page <= 1}
          onClick={() => on_page(safe_page - 1)}
        >
          Anterior
        </Button>
        <span className="tabular-nums">
          {safe_page} / {total_pages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safe_page >= total_pages}
          onClick={() => on_page(safe_page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
