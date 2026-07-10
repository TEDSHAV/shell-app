"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, MessageSquare, X } from "lucide-react";

import { build_osi_comments_frame_url } from "@/lib/osi-comments-frame-url";
import type { OSIListItem } from "@/types/osi";

type OSICommentsSheetProps = {
  osi: OSIListItem | null;
  open: boolean;
  onClose: () => void;
};

export default function OSICommentsSheet({
  osi,
  open,
  onClose,
}: OSICommentsSheetProps) {
  const [frame_loading, set_frame_loading] = useState(true);

  useEffect(() => {
    if (!open) return;
    set_frame_loading(true);
  }, [open, osi?.id_osi]);

  useEffect(() => {
    if (!open) return;
    const on_key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [open, onClose]);

  if (!osi?.id_osi || !open) return null;

  const frame_src = build_osi_comments_frame_url(osi.id_osi);

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar chat de la OSI"
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-[#00000014] bg-[#ECE5DD] shadow-2xl"
        role="dialog"
        aria-label={`Chat OSI ${osi.nro_osi ?? osi.id_osi}`}
      >
        <header className="flex shrink-0 items-center gap-2 bg-[#008069] px-3 py-2.5 text-white shadow-sm">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <ClipboardList className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium leading-tight">
              {osi.nro_osi || `OSI #${osi.id_osi}`}
            </p>
            <p className="truncate text-[12px] text-white/80">
              {osi.servicio || "Comentarios de la OSI"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/90 transition-colors hover:bg-white/10"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          {frame_loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#ECE5DD]">
              <Loader2 className="h-6 w-6 animate-spin text-[#008069]" />
            </div>
          ) : null}
          <iframe
            key={frame_src}
            title={`Comentarios OSI ${osi.nro_osi ?? osi.id_osi}`}
            src={frame_src}
            className="h-full w-full border-0 bg-[#ECE5DD]"
            onLoad={() => set_frame_loading(false)}
          />
        </div>
      </aside>
    </>
  );
}

type OSICommentsFabProps = {
  onClick: () => void;
  className?: string;
};

export function OSICommentsFab({ onClick, className = "" }: OSICommentsFabProps) {
  return (
    <button
      type="button"
      aria-label="Abrir comentarios de la OSI"
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-[1.03] hover:bg-[#20BD5A] print:hidden ${className}`}
    >
      <MessageSquare className="h-6 w-6" />
    </button>
  );
}
