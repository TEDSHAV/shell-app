import { CheckCircle2, Clock, Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/app/logo.png";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { AppNavigation } from "./AppNavigation";
import { UserMenu } from "./UserMenu";
import { NotificationsBell } from "./NotificationsBell";
import { HelpCenterTrigger } from "@/components/help/help-center-trigger";
import { DevDbBadge } from "@/components/shell/DevDbBadge";
import { NavbarProps } from "@/types";

export const Navbar = ({
  userEmail,
  onMobileMenuToggle,
  isMobileMenuOpen,
  userRolesByApp,
  globalRole,
  userDept,
  attendanceBadge,
}: NavbarProps) => {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 gap-3 sticky top-0 z-[60] shadow-sm">
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 -ml-1 rounded-md hover:bg-slate-100 transition-colors text-slate-600"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <Menu className="h-4 w-4" />
        )}
      </button>

      <Link href="/dashboard" className="flex items-center shrink-0">
        <Image
          src={logo}
          alt="SHA de Venezuela, C.A."
          height={36}
          className="h-9 w-auto object-contain rounded-sm bg-white px-1.5 py-0.5 shadow-sm"
          priority
        />
      </Link>

      <div className="hidden md:block w-px h-5 bg-slate-200 shrink-0" />

      <AppBreadcrumb />

      <div className="ml-auto flex items-center gap-2">
        {attendanceBadge && (
          <div
            title={
              attendanceBadge.a_tiempo
                ? "Asistencia registrada hoy"
                : "Acceso registrado hoy"
            }
            className={
              attendanceBadge.a_tiempo
                ? "hidden sm:inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 h-7 w-7"
                : "hidden sm:inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 h-7 w-7"
            }
          >
            {attendanceBadge.a_tiempo ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            )}
          </div>
        )}
        <DevDbBadge />
        <AppNavigation 
          userRolesByApp={userRolesByApp} 
          globalRole={globalRole} 
          userDept={userDept}
        />
        <HelpCenterTrigger />
        <NotificationsBell />
        {userEmail && <UserMenu userEmail={userEmail} />}
      </div>
    </header>
  );
};
