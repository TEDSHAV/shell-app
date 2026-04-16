"use client";

import { cn } from "@/lib/utils";
import { useMobileSidebar } from "./MobileSidebarContext";

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { isOpen, onClose } = useMobileSidebar();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-14 left-0 bottom-0 z-30 w-60 flex flex-col",
          "border-r border-slate-800",
          "bg-slate-900",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:top-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {children}

        <div className="p-3 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 text-center">
            Shell v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
