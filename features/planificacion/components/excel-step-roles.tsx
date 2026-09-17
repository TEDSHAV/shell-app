"use client";

import {
  fold_label,
  unique_excel_modulos,
  type ExcelModuloRole,
  type ExcelPlanRow,
} from "../lib/excel-plan";
import { ExcelRoleTable } from "./excel-role-table";

export function ExcelStepRoles({
  selected_rows,
  existing_modulos,
  roles,
  on_change,
}: {
  selected_rows: ExcelPlanRow[];
  existing_modulos: string[];
  roles: Record<string, ExcelModuloRole>;
  on_change: (label: string, role: ExcelModuloRole) => void;
}) {
  const groups = unique_excel_modulos(selected_rows);
  const parent_options = [
    ...existing_modulos,
    ...groups
      .filter(
        (group) =>
          (roles[fold_label(group.label)]?.as ?? "modulo") === "modulo",
      )
      .map((group) => group.label),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          ¿La columna Módulo es un módulo o el título de la tarea?
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Si marcas título y no eliges módulo, se carga como tarea de la app
          General.
        </p>
      </div>
      <ExcelRoleTable
        groups={groups}
        roles={roles}
        parent_options={parent_options}
        existing_modulos={existing_modulos}
        on_change={on_change}
      />
    </div>
  );
}
