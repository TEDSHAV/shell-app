import { Menu, X } from "lucide-react";
import Image from "next/image";
import logo from "@/app/logo.png";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { AppNavigation } from "./AppNavigation";
import { UserMenu } from "./UserMenu";
import { NotificationsBell } from "./NotificationsBell";
import { NavbarProps } from "@/types";

export const Navbar = ({
  userEmail,
  onMobileMenuToggle,
  isMobileMenuOpen,
}: NavbarProps) => {
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 gap-3 sticky top-0 z-40 shadow-sm">
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 -ml-1 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <Menu className="h-4 w-4" />
        )}
      </button>

      <div className="flex items-center shrink-0">
        <Image
          src={logo}
          alt="SHA de Venezuela, C.A."
          height={36}
          className="h-9 w-auto object-contain rounded-sm bg-white px-1.5 py-0.5 shadow-sm"
          priority
        />
      </div>

      <div className="hidden md:block w-px h-5 bg-gray-200 shrink-0" />

      <AppBreadcrumb />

      <div className="ml-auto flex items-center gap-2">
        <AppNavigation />
        <NotificationsBell />
        {userEmail && <UserMenu userEmail={userEmail} />}
      </div>
    </header>
  );
};
