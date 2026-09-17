"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { current_ve_year } from "../lib/gantt";
import type { PlanApp } from "../lib/types";
import {
  apply_excel_roles,
  excel_commit_rows,
  match_plan_apps,
  unmatched_app_hints,
  apps_for_excel_row,
  fold_label,
  HANG_GENERAL_APP,
  type ExcelModuloRole,
  type ExcelPlanRow,
} from "../lib/excel-plan";
import {
  commit_plan_excel,
  preview_plan_excel,
  type ExcelAppCatalog,
} from "../actions/import-excel";
import { ExcelStepper } from "./excel-stepper";
import { ExcelStepFile } from "./excel-step-file";
import { ExcelStepSelect } from "./excel-step-select";
import { ExcelStepRoles } from "./excel-step-roles";
import { ExcelStepDone } from "./excel-step-done";

export function ExcelImportWizard({ apps }: { apps: PlanApp[] }) {
  const router = useRouter();
  const [step, set_step] = useState<1 | 2 | 3 | 4>(1);
  const [anio, set_anio] = useState(String(current_ve_year()));
  const [file, set_file] = useState<File | null>(null);
  const [rows, set_rows] = useState<ExcelPlanRow[]>([]);
  const [catalog, set_catalog] = useState<ExcelAppCatalog[]>([]);
  const [included, set_included] = useState<Set<number>>(new Set());
  const [roles, set_roles] = useState<Record<string, ExcelModuloRole>>({});
  const [error, set_error] = useState<string | null>(null);
  const [busy, set_busy] = useState(false);
  const [result, set_result] = useState<{
    created_modulos: number;
    created_tareas: number;
    skipped: number;
    failed: string[];
  } | null>(null);

  const selected_rows = useMemo(
    () =>
      rows.filter(
        (row) =>
          included.has(row.row) &&
          !row.error &&
          apps_for_excel_row(row).length > 0,
      ),
    [rows, included],
  );

  const missing_app = useMemo(
    () =>
      [...included].some((row_n) => {
        const item = rows.find((row) => row.row === row_n);
        if (!item || item.error) return false;
        return apps_for_excel_row(item).length === 0;
      }),
    [included, rows],
  );

  async function on_preview() {
    if (!file) {
      set_error("Adjunta un archivo .xlsx.");
      return;
    }
    set_busy(true);
    set_error(null);
    const form = new FormData();
    form.set("file", file);
    const preview = await preview_plan_excel(form);
    set_busy(false);
    if (!preview.ok) {
      set_error(preview.error);
      return;
    }
    const app_list = preview.catalog.length > 0 ? preview.catalog : apps;
    const fallback =
      app_list.find((app) => app.slug === "negocios")?.id ?? app_list[0]?.id ?? 0;
    const next_included = new Set<number>();
    const with_apps = preview.rows.map((row) => {
      if (row.error) return { ...row, app_ids: [] };
      const matched = match_plan_apps(row.excel_app, app_list);
      const unknown = unmatched_app_hints(row.excel_app, app_list);
      const assigned = matched.length > 0
        ? matched
        : row.excel_app.trim()
          ? []
          : fallback
            ? [fallback]
            : [];
      const app_warning =
        unknown.length > 0
          ? `App no reconocida: ${unknown.join(", ")}`
          : null;
      const exists_everywhere =
        assigned.length > 0 &&
        assigned.every((app_id) => {
          const catalog_app = preview.catalog.find((item) => item.id === app_id);
          const mapped = apply_excel_roles(
            [row],
            {},
            catalog_app?.items ?? [],
            catalog_app?.modulos ?? [],
            app_id,
          )[0];
          return mapped?.kind === "duplicate";
        });
      if (!exists_everywhere) next_included.add(row.row);
      return {
        ...row,
        app_ids: assigned,
        warning: [row.warning, app_warning].filter(Boolean).join(" · ") || null,
      };
    });
    set_rows(with_apps);
    set_catalog(preview.catalog);
    set_included(next_included);
    set_step(2);
  }

  function go_roles() {
    if (selected_rows.length === 0) {
      set_error("Marca al menos una tarea y una app.");
      return;
    }
    if (missing_app) {
      set_error("Todas las filas marcadas necesitan una app.");
      return;
    }
    set_error(null);
    const next: Record<string, ExcelModuloRole> = { ...roles };
    for (const row of selected_rows) {
      const key = fold_label(row.excel_modulo);
      if (!next[key]) next[key] = { as: "modulo", parent_modulo: "" };
    }
    set_roles(next);
    set_step(3);
  }

  async function on_commit(role_map: Record<string, ExcelModuloRole> = roles) {
    const payload: ExcelPlanRow[] = [];
    let skipped = 0;
    const mapping_failed: string[] = [];
    const general_id =
      catalog.find((item) => item.slug === "general")?.id ?? 0;
    for (const row of selected_rows) {
      const role = role_map[fold_label(row.excel_modulo)];
      const hang_on_general =
        role?.as === "tarea" &&
        (role.parent_modulo ?? "").trim() === HANG_GENERAL_APP;
      const app_ids = hang_on_general
        ? general_id > 0
          ? [general_id]
          : []
        : apps_for_excel_row(row);
      const existing = catalog.flatMap((item) =>
        app_ids.includes(item.id) ? item.items : [],
      );
      const known_modulos = catalog.flatMap((item) =>
        app_ids.includes(item.id) ? item.modulos : [],
      );
      const mapped = apply_excel_roles(
        [row],
        role_map,
        existing,
        known_modulos,
      )[0];
      if (!mapped || mapped.kind === "error" || !mapped.origen) {
        mapping_failed.push(
          `Fila ${row.row}: ${mapped?.error ?? "sin origen o inválida"}`,
        );
        continue;
      }
      if (mapped.kind === "duplicate") skipped += 1;
      payload.push(mapped);
    }
    if (payload.length === 0) {
      set_error(
        mapping_failed[0] ??
          "No queda ninguna fila para cargar. Revisa duplicados o roles.",
      );
      return;
    }
    set_busy(true);
    set_error(null);
    const saved = await commit_plan_excel({
      anio: Number(anio),
      rows: excel_commit_rows(payload, Number(anio), general_id),
    });
    if (!saved.ok) {
      set_busy(false);
      set_error(saved.error);
      return;
    }
    set_busy(false);
    set_result({
      created_modulos: saved.created_modulos,
      created_tareas: saved.created_tareas,
      skipped,
      failed: [...mapping_failed, ...saved.failed],
    });
    set_step(4);
    router.refresh();
  }

  const existing_modulos = useMemo(
    () => [...new Set(catalog.flatMap((item) => item.modulos))],
    [catalog],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <Link
          href="/ted/planificacion"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a planificación
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Cargar Excel
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Un archivo, varias apps, tú decides qué entra.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-[#f8f9fb] px-6 py-4">
          <ExcelStepper step={step} />
        </div>
        <div className="min-h-[22rem] px-6 py-6">
      {step === 1 ? (
        <ExcelStepFile
          anio={anio}
          file={file}
          on_anio={set_anio}
          on_file={set_file}
        />
      ) : null}

      {step === 2 ? (
        <ExcelStepSelect
          rows={rows}
          catalog={catalog}
          included={included}
          on_toggle={(row, checked) => {
            set_included((prev) => {
              const next = new Set(prev);
              if (checked) next.add(row);
              else next.delete(row);
              return next;
            });
          }}
          on_toggle_all={(checked) => {
            set_included(
              checked
                ? new Set(rows.filter((row) => !row.error).map((row) => row.row))
                : new Set(),
            );
          }}
          on_toggle_rows={(row_ids, checked) => {
            set_included((prev) => {
              const next = new Set(prev);
              for (const id of row_ids) {
                if (checked) next.add(id);
                else next.delete(id);
              }
              return next;
            });
          }}
          on_row_dates={(row, field, value) => {
            set_rows((prev) =>
              prev.map((item) =>
                item.row === row ? { ...item, [field]: value || null } : item,
              ),
            );
          }}
          on_row_apps={(row, app_ids) => {
            set_rows((prev) =>
              prev.map((item) =>
                item.row === row ? { ...item, app_ids } : item,
              ),
            );
          }}
          on_apply_apps={(app_ids) => {
            set_rows((prev) =>
              prev.map((item) =>
                included.has(item.row) && !item.error
                  ? { ...item, app_ids }
                  : item,
              ),
            );
          }}
        />
      ) : null}

      {step === 3 ? (
        <ExcelStepRoles
          selected_rows={selected_rows}
          existing_modulos={existing_modulos}
          roles={roles}
          on_change={(label, role) =>
            set_roles((prev) => ({
              ...prev,
              [fold_label(label)]: role,
            }))
          }
        />
      ) : null}

      {step === 4 && result ? (
        <ExcelStepDone {...result} />
      ) : null}

        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <p className="min-h-5 text-sm text-red-600">{error ?? ""}</p>
          <div className="flex flex-wrap justify-end gap-2">
            {step === 1 ? (
              <Button
                type="button"
                className="bg-gray-900 text-white hover:bg-gray-800"
                disabled={busy}
                onClick={() => void on_preview()}
              >
                Continuar
              </Button>
            ) : null}
            {step === 2 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => set_step(1)}
                >
                  Atrás
                </Button>
                <Button
                  type="button"
                  className="bg-gray-900 text-white hover:bg-gray-800"
                  onClick={go_roles}
                >
                  Continuar · {selected_rows.length} tareas
                </Button>
              </>
            ) : null}
            {step === 3 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => set_step(2)}
                >
                  Atrás
                </Button>
                <Button
                  type="button"
                  className="bg-gray-900 text-white hover:bg-gray-800"
                  disabled={busy}
                  onClick={() => void on_commit()}
                >
                  Crear en las apps
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
