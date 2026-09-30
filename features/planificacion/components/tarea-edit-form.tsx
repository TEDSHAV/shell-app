import { Input } from "@/components/ui/input";
import {
  PlanField,
  PlanSection,
  PLAN_INPUT_CLASS,
  PLAN_SELECT_CLASS,
} from "./plan-form-ui";
import { TareaDescripcionField } from "./tarea-descripcion-field";
import { PlanAppPicker } from "./plan-app-picker";
import { PlanModuloPicker } from "./plan-modulo-picker";
import { TedPersonPicker } from "./ted-person-picker";
import { PLAN_TRIMESTRES } from "../schemas";
import { ORIGIN_LABELS, TRIMESTRE_MESES } from "../lib/display";
import { origenes_for_editor } from "../lib/origen-policy";
import { format_business_days } from "../lib/task-dates";
import type {
  PlanApp,
  PlanModulo,
  PlanOrigen,
  PlanTrimestre,
  PlanUsuarioOption,
} from "../lib/types";
import type { TareaCheckItem } from "../lib/tarea-checklist";

export function TareaEditForm({
  apps,
  all_modulos,
  app_ids,
  modulo_ids,
  nuevo_modulo,
  titulo,
  descripcion,
  origen,
  no_solicitada,
  when_mode,
  fecha_inicio,
  fecha_fin,
  trimestre,
  asignado_ids,
  sync_avance,
  check_times,
  usuarios,
  error,
  on_apps,
  on_modulos,
  on_nuevo_modulo,
  on_titulo,
  on_descripcion,
  on_origen,
  on_no_solicitada,
  on_when_mode,
  on_inicio,
  on_fin,
  on_trimestre,
  on_asignados,
  on_sync_avance,
}: {
  apps: PlanApp[];
  all_modulos: PlanModulo[];
  app_ids: number[];
  modulo_ids: number[];
  nuevo_modulo: string;
  titulo: string;
  descripcion: string;
  origen: PlanOrigen;
  no_solicitada: boolean;
  when_mode: "fechas" | "trimestre";
  fecha_inicio: string;
  fecha_fin: string;
  trimestre: PlanTrimestre | "";
  asignado_ids: number[];
  sync_avance: boolean;
  check_times?: TareaCheckItem[];
  usuarios: PlanUsuarioOption[];
  error: string | null;
  on_apps: (value: number[]) => void;
  on_modulos: (value: number[]) => void;
  on_nuevo_modulo: (value: string) => void;
  on_titulo: (value: string) => void;
  on_descripcion: (value: string) => void;
  on_origen: (value: PlanOrigen) => void;
  on_no_solicitada: (value: boolean) => void;
  on_when_mode: (value: "fechas" | "trimestre") => void;
  on_inicio: (value: string) => void;
  on_fin: (value: string) => void;
  on_trimestre: (value: PlanTrimestre | "") => void;
  on_asignados: (value: number[]) => void;
  on_sync_avance: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <PlanSection title="La tarea">
        <PlanField label="Título" htmlFor="tar-titulo">
          <Input
            id="tar-titulo"
            className={PLAN_INPUT_CLASS}
            value={titulo}
            onChange={(e) => on_titulo(e.target.value)}
          />
        </PlanField>
        <PlanField
          label="Descripción"
          htmlFor="tar-descripcion"
          hint="Puedes mezclar texto y checkboxes en este mismo campo."
        >
          <TareaDescripcionField
            id="tar-descripcion"
            value={descripcion}
            sync={sync_avance}
            check_times={check_times}
            onChange={on_descripcion}
            on_sync={on_sync_avance}
          />
        </PlanField>
        <PlanField label="Apps" hint="Con icono y color, como en objetivos. Puedes marcar varias.">
          <PlanAppPicker
            apps={apps}
            value={app_ids}
            onChange={on_apps}
            allowEmpty={false}
          />
        </PlanField>
        <PlanField
          label="Módulos"
          hint="Busca y elige uno o varios. Si no hay, elige Nuevo módulo."
        >
          <PlanModuloPicker
            apps={apps}
            modulos={all_modulos}
            app_ids={app_ids}
            value={modulo_ids}
            onChange={on_modulos}
          />
        </PlanField>
        {modulo_ids.length === 0 ? (
          <PlanField label="Nombre del módulo nuevo" htmlFor="tar-mod-new">
            <Input
              id="tar-mod-new"
              className={PLAN_INPUT_CLASS}
              value={nuevo_modulo}
              onChange={(e) => on_nuevo_modulo(e.target.value)}
            />
          </PlanField>
        ) : null}
        <PlanField label="Origen" htmlFor="tar-origen">
          <select
            id="tar-origen"
            className={PLAN_SELECT_CLASS}
            value={origen}
            onChange={(e) => on_origen(e.target.value as PlanOrigen)}
          >
            {origenes_for_editor(origen).map((item) => (
              <option key={item} value={item}>
                {ORIGIN_LABELS[item]}
              </option>
            ))}
          </select>
        </PlanField>
        <PlanField label="Equipo TED">
          <TedPersonPicker
            usuarios={usuarios}
            multiple
            values={asignado_ids}
            on_change_many={on_asignados}
            allow_none
            none_label="Sin asignar"
          />
        </PlanField>
      </PlanSection>

      <PlanSection title="Cuándo">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => on_when_mode("fechas")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              when_mode === "fechas"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Rango de fechas
          </button>
          <button
            type="button"
            onClick={() => on_when_mode("trimestre")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              when_mode === "trimestre"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Trimestre
          </button>
        </div>
        {when_mode === "fechas" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <PlanField label="Inicio" htmlFor="tar-ini">
                <Input
                  id="tar-ini"
                  type="date"
                  className={PLAN_INPUT_CLASS}
                  value={fecha_inicio}
                  onChange={(e) => {
                    on_inicio(e.target.value);
                    if (!fecha_fin || fecha_fin < e.target.value) {
                      on_fin(e.target.value);
                    }
                  }}
                />
              </PlanField>
              <PlanField label="Fin" htmlFor="tar-fin">
                <Input
                  id="tar-fin"
                  type="date"
                  className={PLAN_INPUT_CLASS}
                  value={fecha_fin}
                  onChange={(e) => on_fin(e.target.value)}
                />
              </PlanField>
            </div>
            {format_business_days(fecha_inicio, fecha_fin) ? (
              <p className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800">
                {format_business_days(fecha_inicio, fecha_fin)} de trabajo
                <span className="ml-1 font-normal text-violet-600">
                  (lunes a viernes)
                </span>
              </p>
            ) : null}
          </>
        ) : (
          <PlanField label="Trimestre" htmlFor="tar-tri">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLAN_TRIMESTRES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => on_trimestre(item)}
                  className={`rounded-xl border px-2 py-2.5 text-center transition ${
                    trimestre === item
                      ? "border-violet-300 bg-violet-50 text-violet-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
                  }`}
                >
                  <span className="block text-sm font-semibold">{item}</span>
                  <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-slate-500">
                    {TRIMESTRE_MESES[item]}
                  </span>
                </button>
              ))}
            </div>
          </PlanField>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={no_solicitada}
            onChange={(e) => on_no_solicitada(e.target.checked)}
          />
          No solicitada (no cuenta en el %)
        </label>
      </PlanSection>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
