"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { UserMenuProps } from "@/types";

export const UserMenu = ({ userEmail }: UserMenuProps) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignOut = () => {
    setShowConfirm(true);
  };

  const handleConfirmSignOut = () => {
    signOutAction();
  };

  const handleCancelSignOut = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
        <span className="hidden sm:block text-xs text-slate-500 max-w-[140px] truncate">
          {userEmail}
        </span>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors text-slate-500"
          title="Cerrar sesión"
          type="button"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Cerrar sesión?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que quieres cerrar tu sesión?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
