"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { useMobileSidebar } from "./MobileSidebarContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SidebarCollapseContext = createContext<{
  isCollapsed: boolean;
  toggleCollapse: () => void;
}>({
  isCollapsed: false,
  toggleCollapse: () => {},
});

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext);
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { isOpen, onClose } = useMobileSidebar();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  return (
    <SidebarCollapseContext.Provider value={{ isCollapsed, toggleCollapse }}>
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}

        <aside
          className={cn(
            "fixed top-14 left-0 bottom-0 z-30 flex flex-col",
            "border-r border-slate-200",
            "bg-white",
            "transition-transform duration-200 ease-in-out",
            "transition-width duration-200 ease-in-out",
            "lg:translate-x-0 lg:static lg:top-0",
            isOpen ? "translate-x-0" : "-translate-x-full",
            isCollapsed ? "w-16" : "w-60",
          )}
        >
          {children}

          <div className="p-3 border-t border-slate-200">
            <button
              onClick={toggleCollapse}
              className="w-full flex items-center justify-center p-2 rounded-md hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
            {!isCollapsed && (
              <p className="text-[10px] text-slate-400 text-center mt-2">
                &copy; {new Date().getFullYear()} SHA de Venezuela, C.A
              </p>
            )}
          </div>
        </aside>
      </>
    </SidebarCollapseContext.Provider>
  );
}
