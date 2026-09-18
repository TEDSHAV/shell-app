"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlanModal } from "./plan-modal";
import { OrigenBadge } from "./origen-badge";
import { TareaViewPanel } from "./tarea-view-panel";
import { TareaEditForm } from "./tarea-edit-form";
import { default_new_origen } from "../lib/origen-policy";
import { save_plan_tarea, delete_plan_tarea } from "../actions/tarea-actions";
import type {
  EntregableTipo,
  PlanApp,
  PlanModulo,
  PlanTarea,
  PlanTrimestre,
  PlanUsuarioOption,
} from "../lib/types";

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
  const initial_app =
    preset_app_id ??
    all_modulos.find((m) => m.id === (tarea?.modulo_id ?? preset_modulo_id))
      ?.app_id ??
    apps[0]?.id ??
    0;
  const [mode, set_mode] = useState<"ver" | "editar">(
    tarea && !view_only ? "ver" : tarea && view_only ? "ver" : "editar",
  );
  const [app_id, set_app_id] = useState(String(initial_app || ""));
  const [modulo_id, set_modulo_id] = useState(
    String(tarea?.modulo_id ?? preset_modulo_id ?? ""),
  );
  const [nuevo_modulo, set_nuevo_modulo] = useState("");
  const [titulo, set_titulo] = useState(tarea?.titulo ?? "");
  const [origen, set_origen] = useState(
    tarea?.origen ?? default_new_origen(),
  );
  const [objetivo_id] = useState(
    tarea?.objetivo_id ?? preset_objetivo_id ?? null,
  );
  const [avance, set_avance] = useState(
    tarea?.avance ?? (tarea?.completada ? 100 : 0),
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
  const [asignado_ids, set_asignado_ids] = useState<number[]>(
    tarea?.asignados?.map((person) => person.usuario_id) ??
      (tarea?.asignado_id ? [tarea.asignado_id] : []),
  );
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);
  const viewing = Boolean(tarea) && mode === "ver";
  const app = apps.find((item) => item.id === Number(app_id));
  const modulo = all_modulos.find((item) => item.id === Number(modulo_id));

  async function on_submit() {
    set_saving(true);
    set_error(null);
    const selected_modulo = Number(modulo_id);
    const selected_app = Number(app_id);
    const result = await save_plan_tarea({
      id: tarea?.id,
      app_id: selected_app > 0 ? selected_app : undefined,
      modulo_id: selected_modulo > 0 ? selected_modulo : undefined,
      modulo_nombre_nuevo: selected_modulo > 0 ? null : nuevo_modulo,
      titulo,
      origen,
      avance: no_solicitada ? 0 : avance,
      no_solicitada,
      entregable_tipo,
      entregable_ruta: ruta,
      entregable_comentario: comentario,
      entregable_unidad: unidad,
      entregable_version: version,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || fecha_inicio || null,
      trimestre: fecha_inicio ? null : trimestre || null,
      asignado_ids,
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

  return (
    <PlanModal
      open={open}
      variant="sheet"
      title={
        viewing
          ? tarea?.titulo ?? "Tarea"
          : tarea
            ? "Editar tarea"
            : "Nueva tarea"
      }
      subtitle={
        viewing
          ? `${app?.nombre ?? "App"} · ${modulo?.nombre ?? "Módulo"}`
          : tarea
            ? `${app?.nombre ?? "App"} · ${modulo?.nombre ?? "Módulo"}`
            : "Completa los datos para incluirla en el plan"
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
              <Button
                type="button"
                className="bg-slate-900 px-5 text-white hover:bg-slate-800"
                onClick={() => set_mode("editar")}
              >
                Editar tarea
              </Button>
            )}
          </>
        ) : (
          <>
            {tarea && !view_only ? (
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
              className="bg-slate-900 px-5 text-white hover:bg-slate-800"
              disabled={saving}
              onClick={() => void on_submit()}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        )
      }
    >
      {viewing && tarea ? (
        <TareaViewPanel tarea={tarea} app={app} modulo={modulo} />
      ) : (
        <TareaEditForm
          apps={apps}
          all_modulos={all_modulos}
          app_id={app_id}
          modulo_id={modulo_id}
          nuevo_modulo={nuevo_modulo}
          titulo={titulo}
          origen={origen}
          avance={avance}
          no_solicitada={no_solicitada}
          entregable_tipo={entregable_tipo}
          unidad={unidad}
          version={version}
          ruta={ruta}
          comentario={comentario}
          fecha_inicio={fecha_inicio}
          fecha_fin={fecha_fin}
          trimestre={trimestre}
          asignado_ids={asignado_ids}
          usuarios={usuarios}
          error={error}
          on_app={set_app_id}
          on_modulo={set_modulo_id}
          on_nuevo_modulo={set_nuevo_modulo}
          on_titulo={set_titulo}
          on_origen={set_origen}
          on_avance={set_avance}
          on_no_solicitada={set_no_solicitada}
          on_entregable={set_entregable_tipo}
          on_unidad={set_unidad}
          on_version={set_version}
          on_ruta={set_ruta}
          on_comentario={set_comentario}
          on_inicio={set_fecha_inicio}
          on_fin={set_fecha_fin}
          on_trimestre={set_trimestre}
          on_asignados={set_asignado_ids}
        />
      )}
    </PlanModal>
  );
}
