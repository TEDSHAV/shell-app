import { Input } from "@/components/ui/input";
import {
  PlanField,
  PlanSection,
  PLAN_INPUT_CLASS,
  PLAN_SELECT_CLASS,
} from "./plan-form-ui";
import { GrowingTextarea } from "./growing-textarea";
import { PlanAppPicker } from "./plan-app-picker";
import { PlanModuloPicker } from "./plan-modulo-picker";
import { TedPersonPicker } from "./ted-person-picker";
import { PLAN_TRIMESTRES } from "../schemas";
import { ORIGIN_LABELS } from "../lib/display";
import { origenes_for_editor } from "../lib/origen-policy";
import type {
  PlanApp,
  PlanModulo,
  PlanOrigen,
  PlanTrimestre,
  PlanUsuarioOption,
} from "../lib/types";

const AVANCE_PRESETS = [0, 25, 50, 75, 100];

export function TareaEditForm({
  apps,
  all_modulos,
  app_ids,
  modulo_ids,
  nuevo_modulo,
  titulo,
  descripcion,
  origen,
  avance,
  no_solicitada,
  when_mode,
  fecha_inicio,
  fecha_fin,
  trimestre,
  asignado_ids,
  usuarios,
  show_progress,
  error,
  on_apps,
  on_modulos,
  on_nuevo_modulo,
  on_titulo,
  on_descripcion,
  on_origen,
  on_avance,
  on_no_solicitada,
  on_when_mode,
  on_inicio,
  on_fin,
  on_trimestre,
  on_asignados,
}: {
  apps: PlanApp[];
  all_modulos: PlanModulo[];
  app_ids: number[];
  modulo_ids: number[];
  nuevo_modulo: string;
  titulo: string;
  descripcion: string;
  origen: PlanOrigen;
  avance: number;
  no_solicitada: boolean;
  when_mode: "fechas" | "trimestre";
  fecha_inicio: string;
  fecha_fin: string;
  trimestre: PlanTrimestre | "";
  asignado_ids: number[];
  usuarios: PlanUsuarioOption[];
  show_progress: boolean;
  error: string | null;
  on_apps: (value: number[]) => void;
  on_modulos: (value: number[]) => void;
  on_nuevo_modulo: (value: string) => void;
  on_titulo: (value: string) => void;
  on_descripcion: (value: string) => void;
  on_origen: (value: PlanOrigen) => void;
  on_avance: (value: number) => void;
  on_no_solicitada: (value: boolean) => void;
  on_when_mode: (value: "fechas" | "trimestre") => void;
  on_inicio: (value: string) => void;
  on_fin: (value: string) => void;
  on_trimestre: (value: PlanTrimestre | "") => void;
  on_asignados: (value: number[]) => void;
}) {
  const shown = no_solicitada ? 0 : avance;

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
        <PlanField label="Descripción" htmlFor="tar-descripcion">
          <GrowingTextarea
            id="tar-descripcion"
            placeholder="Contexto, alcance o pedido original"
            value={descripcion}
            onChange={on_descripcion}
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
          hint="Mismos colores de app. Puedes marcar varios; si creas uno nuevo se vincula a todas las apps elegidas."
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
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
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
        ) : (
          <PlanField label="Trimestre" htmlFor="tar-tri">
            <div className="grid grid-cols-4 gap-2">
              {PLAN_TRIMESTRES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => on_trimestre(item)}
                  className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                    trimestre === item
                      ? "border-violet-300 bg-violet-50 text-violet-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
                  }`}
                >
                  {item}
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

      {show_progress ? (
        <PlanSection title="Avance">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Porcentaje
            </p>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {shown}%
            </p>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={no_solicitada}
            value={shown}
            onChange={(e) => on_avance(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-600 disabled:opacity-40"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {AVANCE_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={no_solicitada}
                onClick={() => on_avance(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  shown === value
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                } disabled:opacity-40`}
              >
                {value}%
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-slate-400">
            Para darla por lista usa «Marcar como lista» y registra el entregable ahí.
          </p>
        </PlanSection>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
