"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlanModal } from "./plan-modal";
import { PlanSection } from "./plan-form-ui";
import { OrigenBadge } from "./origen-badge";
import { TareaViewPanel } from "./tarea-view-panel";
import { TareaEditForm } from "./tarea-edit-form";
import { TareaEntregableFields } from "./tarea-entregable-fields";
import { default_new_origen } from "../lib/origen-policy";
import {
  complete_plan_tarea,
  save_plan_tarea,
  delete_plan_tarea,
} from "../actions/tarea-actions";
import {
  checks_in_descripcion,
  hydrate_descripcion,
} from "../lib/tarea-descripcion";
import { stamp_check_times } from "../lib/tarea-checklist";
import type {
  EntregableTipo,
  PlanApp,
  PlanModulo,
  PlanTarea,
  PlanTrimestre,
  PlanUsuarioOption,
} from "../lib/types";

function seed_app_ids(
  apps: PlanApp[],
  all_modulos: PlanModulo[],
  preset_app_id: number | null,
  preset_modulo_id: number | null,
  tarea: PlanTarea | null,
): number[] {
  const modulo = all_modulos.find(
    (item) => item.id === (tarea?.modulo_id ?? preset_modulo_id),
  );
  if (modulo) {
    const ids = modulo.app_ids.length > 0 ? modulo.app_ids : [modulo.app_id];
    if (ids.length > 0) return ids;
  }
  if (preset_app_id && preset_app_id > 0) return [preset_app_id];
  return apps[0]?.id ? [apps[0].id] : [];
}

export function TareaFormDialog({
  open,
  apps,
  all_modulos,
  preset_app_id,
  preset_modulo_id,
  preset_objetivo_id = null,
  tarea,
  usuarios,
  view_only = false,
  onClose,
  onSaved,
}: {
  open: boolean;
  apps: PlanApp[];
  all_modulos: PlanModulo[];
  preset_app_id: number | null;
  preset_modulo_id: number | null;
  preset_objetivo_id?: number | null;
  tarea: PlanTarea | null;
  usuarios: PlanUsuarioOption[];
  view_only?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, set_mode] = useState<"ver" | "editar" | "completar">(
    tarea ? "ver" : "editar",
  );
  const [app_ids, set_app_ids] = useState(() =>
    seed_app_ids(apps, all_modulos, preset_app_id, preset_modulo_id, tarea),
  );
  const [modulo_ids, set_modulo_ids] = useState<number[]>(
    tarea?.modulo_id
      ? [tarea.modulo_id]
      : preset_modulo_id
        ? [preset_modulo_id]
        : [],
  );
  const [nuevo_modulo, set_nuevo_modulo] = useState("");
  const [titulo, set_titulo] = useState(tarea?.titulo ?? "");
  const [descripcion, set_descripcion] = useState(
    hydrate_descripcion(tarea?.descripcion, tarea?.checklist),
  );
  const [origen, set_origen] = useState(
    tarea?.origen ?? default_new_origen(),
  );
  const [objetivo_id] = useState(
    tarea?.objetivo_id ?? preset_objetivo_id ?? null,
  );
  const [no_solicitada, set_no_solicitada] = useState(
    Boolean(tarea?.no_solicitada),
  );
  const [entregable_tipo, set_entregable_tipo] = useState<EntregableTipo>(
    tarea?.entregable_tipo && tarea.entregable_tipo !== "ninguno"
      ? tarea.entregable_tipo
      : "ninguno",
  );
  const [unidad, set_unidad] = useState(tarea?.entregable_unidad ?? "core");
  const [version, set_version] = useState(tarea?.entregable_version ?? "");
  const [ruta, set_ruta] = useState(tarea?.entregable_ruta ?? "");
  const [comentario, set_comentario] = useState(
    tarea?.entregable_comentario ?? "",
  );
  const [fecha_inicio, set_fecha_inicio] = useState(
    tarea?.fecha_inicio?.slice(0, 10) ?? "",
  );
  const [fecha_fin, set_fecha_fin] = useState(
    tarea?.fecha_fin?.slice(0, 10) ?? "",
  );
  const [trimestre, set_trimestre] = useState<PlanTrimestre | "">(
    tarea?.trimestre ?? "",
  );
  const [when_mode, set_when_mode] = useState<"fechas" | "trimestre">(
    tarea?.fecha_inicio ? "fechas" : tarea?.trimestre ? "trimestre" : "fechas",
  );
  const [asignado_ids, set_asignado_ids] = useState<number[]>(
    tarea?.asignados?.map((person) => person.usuario_id) ??
      (tarea?.asignado_id ? [tarea.asignado_id] : []),
  );
  const [sync_avance, set_sync_avance] = useState(
    Boolean(tarea?.sync_avance_checklist),
  );
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const viewing = Boolean(tarea) && mode === "ver";
  const completing = Boolean(tarea) && mode === "completar";
  const app = apps.find((item) => item.id === app_ids[0]);
  const modulo = all_modulos.find((item) => item.id === modulo_ids[0]);

  function change_apps(ids: number[]) {
    set_app_ids(ids);
    set_modulo_ids((prev) =>
      prev.filter((id) => {
        const item = all_modulos.find((row) => row.id === id);
        if (!item) return false;
        const linked =
          item.app_ids.length > 0 ? item.app_ids : [item.app_id];
        return ids.length === 0 || linked.some((app_id) => ids.includes(app_id));
      }),
    );
  }

  function change_when(next: "fechas" | "trimestre") {
    set_when_mode(next);
    if (next === "fechas") set_trimestre("");
    else {
      set_fecha_inicio("");
      set_fecha_fin("");
    }
  }

  async function on_submit() {
    set_saving(true);
    set_error(null);
    const result = await save_plan_tarea({
      id: tarea?.id,
      app_ids,
      modulo_ids,
      modulo_id: modulo_ids[0],
      modulo_nombre_nuevo: modulo_ids.length > 0 ? null : nuevo_modulo,
      titulo,
      descripcion,
      origen,
      avance: tarea?.avance ?? 0,
      no_solicitada,
      fecha_inicio: when_mode === "fechas" ? fecha_inicio || null : null,
      fecha_fin:
        when_mode === "fechas" ? fecha_fin || fecha_inicio || null : null,
      trimestre: when_mode === "trimestre" ? trimestre || null : null,
      asignado_ids,
      sync_avance_checklist: sync_avance,
      checklist: tarea?.checklist ?? [],
      objetivo_id,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  async function on_complete() {
    if (!tarea) return;
    set_saving(true);
    set_error(null);
    const result = await complete_plan_tarea({
      id: tarea.id,
      entregable_tipo,
      entregable_ruta: ruta,
      entregable_comentario: comentario,
      entregable_unidad: unidad,
      entregable_version: version,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <PlanModal
      open={open}
      variant="sheet"
      title={
        completing
          ? "Marcar como lista"
          : viewing
            ? tarea?.titulo ?? "Tarea"
            : tarea
              ? "Editar tarea"
              : "Nueva tarea"
      }
      subtitle={
        completing
          ? "Registra el entregable ahora. No hace falta al crear la tarea."
          : viewing
            ? `${app?.nombre ?? "App"} · ${modulo?.nombre ?? "Módulo"}`
            : "Título, dónde vive y cuándo. El entregable va al marcarla lista."
      }
      badges={
        viewing && tarea ? <OrigenBadge origen={tarea.origen} /> : undefined
      }
      onClose={onClose}
      footer={
        viewing ? (
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {view_only ? null : (
              <>
                {tarea && !tarea.completada && !tarea.no_solicitada ? (
                  <Button
                    type="button"
                    className="bg-emerald-600 px-5 text-white hover:bg-emerald-500"
                    onClick={() => set_mode("completar")}
                  >
                    Marcar como lista
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="bg-slate-900 px-5 text-white hover:bg-slate-800"
                  onClick={() => set_mode("editar")}
                >
                  Editar
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            {tarea && !view_only && mode === "editar" ? (
              <Button
                type="button"
                variant="outline"
                className="mr-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  void (async () => {
                    const ok = window.confirm(
                      "¿Eliminar esta tarea del cálculo?",
                    );
                    if (!ok) return;
                    const result = await delete_plan_tarea(tarea.id);
                    if (!result.ok) {
                      set_error(result.error);
                      return;
                    }
                    onSaved();
                    onClose();
                  })();
                }}
              >
                Eliminar
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (tarea) set_mode("ver");
                else onClose();
              }}
            >
              {tarea ? "Volver" : "Cancelar"}
            </Button>
            <Button
              type="button"
              className={
                completing
                  ? "bg-emerald-600 px-5 text-white hover:bg-emerald-500"
                  : "bg-slate-900 px-5 text-white hover:bg-slate-800"
              }
              disabled={saving}
              onClick={() =>
                void (completing ? on_complete() : on_submit())
              }
            >
              {saving
                ? "Guardando…"
                : completing
                  ? "Marcar como lista"
                  : "Guardar"}
            </Button>
          </>
        )
      }
    >
      {viewing && tarea ? (
        <TareaViewPanel
          tarea={tarea}
          app={app}
          modulo={modulo}
          can_write={!view_only}
        />
      ) : completing ? (
        <PlanSection title="Entregable">
          <TareaEntregableFields
            entregable_tipo={entregable_tipo}
            unidad={unidad}
            version={version}
            ruta={ruta}
            comentario={comentario}
            on_entregable={set_entregable_tipo}
            on_unidad={set_unidad}
            on_version={set_version}
            on_ruta={set_ruta}
            on_comentario={set_comentario}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </PlanSection>
      ) : (
        <TareaEditForm
          apps={apps}
          all_modulos={all_modulos}
          app_ids={app_ids}
          modulo_ids={modulo_ids}
          nuevo_modulo={nuevo_modulo}
          titulo={titulo}
          descripcion={descripcion}
          origen={origen}
          no_solicitada={no_solicitada}
          when_mode={when_mode}
          fecha_inicio={fecha_inicio}
          fecha_fin={fecha_fin}
          trimestre={trimestre}
          asignado_ids={asignado_ids}
          sync_avance={sync_avance}
          check_times={stamp_check_times(
            tarea?.checklist ?? [],
            checks_in_descripcion(descripcion),
            new Date().toISOString(),
          )}
          usuarios={usuarios}
          error={error}
          on_apps={change_apps}
          on_modulos={set_modulo_ids}
          on_nuevo_modulo={set_nuevo_modulo}
          on_titulo={set_titulo}
          on_descripcion={set_descripcion}
          on_origen={set_origen}
          on_no_solicitada={set_no_solicitada}
          on_when_mode={change_when}
          on_inicio={set_fecha_inicio}
          on_fin={set_fecha_fin}
          on_trimestre={set_trimestre}
          on_asignados={set_asignado_ids}
          on_sync_avance={set_sync_avance}
        />
      )}
    </PlanModal>
  );
}
