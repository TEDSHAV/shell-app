import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { UserMenuProps } from "@/types";

export const UserMenu = ({ userEmail }: UserMenuProps) => {
  return (
    <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
      <span className="hidden sm:block text-xs text-gray-500 max-w-[140px] truncate">
        {userEmail}
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
