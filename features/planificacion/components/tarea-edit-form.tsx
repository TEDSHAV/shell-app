import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PlanField,
  PlanSection,
  PLAN_INPUT_CLASS,
  PLAN_SELECT_CLASS,
} from "./plan-form-ui";
import { TedPersonPicker } from "./ted-person-picker";
import { PrismaRouteSelect } from "./prisma-route-select";
import { PLAN_TRIMESTRES } from "../schemas";
import { ORIGIN_LABELS } from "../lib/display";
import { origenes_for_editor } from "../lib/origen-policy";
import { PLAN_RELEASE_UNITS } from "../lib/release-units";
import type {
  EntregableTipo,
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
  app_id,
  modulo_id,
  nuevo_modulo,
  titulo,
  descripcion,
  origen,
  avance,
  no_solicitada,
  entregable_tipo,
  unidad,
  version,
  ruta,
  comentario,
  fecha_inicio,
  fecha_fin,
  trimestre,
  asignado_ids,
  usuarios,
  error,
  on_app,
  on_modulo,
  on_nuevo_modulo,
  on_titulo,
  on_descripcion,
  on_origen,
  on_avance,
  on_no_solicitada,
  on_entregable,
  on_unidad,
  on_version,
  on_ruta,
  on_comentario,
  on_inicio,
  on_fin,
  on_trimestre,
  on_asignados,
}: {
  apps: PlanApp[];
  all_modulos: PlanModulo[];
  app_id: string;
  modulo_id: string;
  nuevo_modulo: string;
  titulo: string;
  descripcion: string;
  origen: PlanOrigen;
  avance: number;
  no_solicitada: boolean;
  entregable_tipo: EntregableTipo;
  unidad: string;
  version: string;
  ruta: string;
  comentario: string;
  fecha_inicio: string;
  fecha_fin: string;
  trimestre: PlanTrimestre | "";
  asignado_ids: number[];
  usuarios: PlanUsuarioOption[];
  error: string | null;
  on_app: (value: string) => void;
  on_modulo: (value: string) => void;
  on_nuevo_modulo: (value: string) => void;
  on_titulo: (value: string) => void;
  on_descripcion: (value: string) => void;
  on_origen: (value: PlanOrigen) => void;
  on_avance: (value: number) => void;
  on_no_solicitada: (value: boolean) => void;
  on_entregable: (value: EntregableTipo) => void;
  on_unidad: (value: string) => void;
  on_version: (value: string) => void;
  on_ruta: (value: string) => void;
  on_comentario: (value: string) => void;
  on_inicio: (value: string) => void;
  on_fin: (value: string) => void;
  on_trimestre: (value: PlanTrimestre | "") => void;
  on_asignados: (value: number[]) => void;
}) {
  const shown = no_solicitada ? 0 : avance;

  return (
    <div className="space-y-4">
      <PlanSection title="Qué es">
        <PlanField label="Título" htmlFor="tar-titulo">
          <Input
            id="tar-titulo"
            className={PLAN_INPUT_CLASS}
            value={titulo}
            onChange={(e) => on_titulo(e.target.value)}
          />
        </PlanField>
        <PlanField label="Descripción" htmlFor="tar-descripcion">
          <Textarea
            id="tar-descripcion"
            rows={4}
            className={PLAN_INPUT_CLASS}
            placeholder="Contexto, alcance o pedido original"
            value={descripcion}
            onChange={(e) => on_descripcion(e.target.value)}
          />
        </PlanField>
        <div className="grid gap-3 sm:grid-cols-2">
          <PlanField label="App" htmlFor="tar-app">
            <select
              id="tar-app"
              className={PLAN_SELECT_CLASS}
              value={app_id}
              onChange={(e) => {
                on_app(e.target.value);
                on_modulo("");
              }}
            >
              {apps.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </PlanField>
          <PlanField label="Módulo" htmlFor="tar-mod">
            <select
              id="tar-mod"
              className={PLAN_SELECT_CLASS}
              value={modulo_id}
              onChange={(e) => on_modulo(e.target.value)}
            >
              <option value="">Crear módulo nuevo…</option>
              {all_modulos
                .filter((m) => {
                  const ids = m.app_ids?.length ? m.app_ids : [m.app_id];
                  return ids.includes(Number(app_id));
                })
                .filter(
                  (m, index, list) =>
                    list.findIndex((item) => item.id === m.id) === index,
                )
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                    {m.app_ids.length > 1 ? " (varias apps)" : ""}
                  </option>
                ))}
            </select>
          </PlanField>
        </div>
        {!modulo_id ? (
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
      </PlanSection>

      <PlanSection title="Avance y fechas">
        <div>
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
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={no_solicitada}
              onChange={(e) => on_no_solicitada(e.target.checked)}
            />
            No solicitada (no cuenta en el %)
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <PlanField label="Fecha inicio" htmlFor="tar-ini">
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
          <PlanField
            label="Fecha fin"
            htmlFor="tar-fin"
            hint="Sin fecha puedes marcar un trimestre."
          >
            <Input
              id="tar-fin"
              type="date"
              className={PLAN_INPUT_CLASS}
              value={fecha_fin}
              onChange={(e) => on_fin(e.target.value)}
            />
          </PlanField>
        </div>
        {!fecha_inicio ? (
          <PlanField label="Trimestre" htmlFor="tar-tri">
            <select
              id="tar-tri"
              className={PLAN_SELECT_CLASS}
              value={trimestre}
              onChange={(e) =>
                on_trimestre(e.target.value as PlanTrimestre | "")
              }
            >
              <option value="">Sin colocar</option>
              {PLAN_TRIMESTRES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </PlanField>
        ) : null}
      </PlanSection>

      <PlanSection title="Equipo TED">
        <TedPersonPicker
          usuarios={usuarios}
          multiple
          values={asignado_ids}
          on_change_many={on_asignados}
          allow_none
          none_label="Sin asignar"
        />
      </PlanSection>

      <PlanSection title="Entregable">
        <PlanField label="Tipo" htmlFor="tar-ent">
          <select
            id="tar-ent"
            className={PLAN_SELECT_CLASS}
            value={entregable_tipo}
            onChange={(e) => on_entregable(e.target.value as EntregableTipo)}
          >
            <option value="ninguno">Sin entregable</option>
            <option value="vista">Vista Prisma (ruta)</option>
            <option value="comentario">Comentario</option>
            <option value="version">Versión de release</option>
          </select>
        </PlanField>
        {entregable_tipo === "vista" ? (
          <PlanField label="Ruta" htmlFor="tar-ruta">
            <PrismaRouteSelect
              id="tar-ruta"
              value={ruta}
              on_change={on_ruta}
            />
          </PlanField>
        ) : null}
        {entregable_tipo === "version" ? (
          <div className="grid grid-cols-2 gap-3">
            <PlanField label="Unidad" htmlFor="tar-uni">
              <select
                id="tar-uni"
                className={PLAN_SELECT_CLASS}
                value={unidad}
                onChange={(e) => on_unidad(e.target.value)}
              >
                {PLAN_RELEASE_UNITS.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </PlanField>
            <PlanField label="Versión" htmlFor="tar-ver">
              <Input
                id="tar-ver"
                className={PLAN_INPUT_CLASS}
                placeholder="facturacion-v0.4.0"
                value={version}
                onChange={(e) => on_version(e.target.value)}
              />
            </PlanField>
          </div>
        ) : null}
        {entregable_tipo === "comentario" ? (
          <PlanField label="Comentario de entrega" htmlFor="tar-com">
            <Textarea
              id="tar-com"
              className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50"
              value={comentario}
              onChange={(e) => on_comentario(e.target.value)}
            />
          </PlanField>
        ) : null}
      </PlanSection>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
