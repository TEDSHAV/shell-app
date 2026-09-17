"use client";

import type { ExcelModuloRole } from "../lib/excel-plan";
import { fold_label } from "../lib/excel-plan";
import { SearchSelect } from "./search-select";

export function ExcelRoleTable({
  groups,
  roles,
  parent_options,
  existing_modulos,
  name_prefix = "",
  on_change,
}: {
  groups: Array<{ label: string; count: number }>;
  roles: Record<string, ExcelModuloRole>;
  parent_options: string[];
  existing_modulos: string[];
  name_prefix?: string;
  on_change: (label: string, role: ExcelModuloRole) => void;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-gray-400">No hay etiquetas de módulo.</p>;
  }

  return (
    <div className="rounded-lg border border-gray-100">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-2 py-2">Columna Módulo</th>
            <th className="px-2 py-2">Filas</th>
            <th className="px-2 py-2">Es un módulo</th>
            <th className="px-2 py-2">Es título de tarea</th>
            <th className="px-2 py-2">Colgar en</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const key = fold_label(group.label);
            const role = roles[key] ?? { as: "modulo", parent_modulo: "" };
            const parents = parent_options.filter(
              (name) => fold_label(name) !== key,
            );
            const already = existing_modulos.filter(
              (name) => fold_label(name) !== key,
            );
            const from_excel = parents.filter(
              (name) =>
                !already.some((item) => fold_label(item) === fold_label(name)),
            );
            return (
              <tr key={key} className="border-t border-gray-50 align-top">
                <td className="px-2 py-2 font-medium text-gray-800">
                  {group.label}
                </td>
                <td className="px-2 py-2 text-gray-500">{group.count}</td>
                <td className="px-2 py-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`role-${name_prefix}${key}`}
                      checked={role.as === "modulo"}
                      onChange={() =>
                        on_change(group.label, {
                          as: "modulo",
                          parent_modulo: "",
                        })
                      }
                    />
                    Módulo
                  </label>
                </td>
                <td className="px-2 py-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`role-${name_prefix}${key}`}
                      checked={role.as === "tarea"}
                      onChange={() =>
                        on_change(group.label, {
                          as: "tarea",
                          parent_modulo: role.parent_modulo,
                        })
                      }
                    />
                    Título
                  </label>
                </td>
                <td className="px-2 py-2">
                  {role.as === "tarea" ? (
                    <SearchSelect
                      value={role.parent_modulo}
                      placeholder="App General"
                      onChange={(parent_modulo) =>
                        on_change(group.label, {
                          as: "tarea",
                          parent_modulo,
                        })
                      }
                      options={[
                        {
                          value: "",
                          label: "App General",
                          group: "Por defecto",
                        },
                        ...already.map((name) => ({
                          value: name,
                          label: name,
                          group: "Ya en la app",
                        })),
                        ...from_excel.map((name) => ({
                          value: name,
                          label: name,
                          group: "Del Excel (como módulo)",
                        })),
                      ]}
                    />
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
