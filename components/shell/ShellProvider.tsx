"use client";

import { useState } from "react";
import { Navbar } from "@/components/shell/Navbar";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileSidebarContext } from "@/components/shell/MobileSidebarContext";
import { ShellAuthBridge } from "@/components/shell/ShellAuthBridge";
import { ShellURLSync } from "@/components/shell/ShellURLSync";
import { ShellProviderProps } from "@/types";

export function ShellProvider({ 
  children, 
  sidebar, 
  userEmail,
  userRolesByApp,
  globalRole
}: ShellProviderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <MobileSidebarContext.Provider
      value={{
        isOpen: isMobileMenuOpen,
        onClose: () => setIsMobileMenuOpen(false),
      }}
    >
      <ShellAuthBridge />
      <ShellURLSync />
      <div className="flex flex-col h-screen overflow-hidden">
        <Navbar
          userEmail={userEmail}
          onMobileMenuToggle={() => setIsMobileMenuOpen((v) => !v)}
          isMobileMenuOpen={isMobileMenuOpen}
          userRolesByApp={userRolesByApp}
          globalRole={globalRole}
        />
        <div className="flex flex-1 min-h-0">
          <Sidebar>{sidebar}</Sidebar>
          <div className="flex flex-col flex-1 min-w-0">
            <main className="flex-1 min-h-0 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </MobileSidebarContext.Provider>
  );
}
