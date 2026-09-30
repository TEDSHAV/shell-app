import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlanField, PLAN_INPUT_CLASS, PLAN_SELECT_CLASS } from "./plan-form-ui";
import { PrismaRouteSelect } from "./prisma-route-select";
import { PLAN_RELEASE_UNITS } from "../lib/release-units";
import type { EntregableTipo } from "../lib/types";

export function TareaEntregableFields({
  entregable_tipo,
  unidad,
  version,
  ruta,
  comentario,
  on_entregable,
  on_unidad,
  on_version,
  on_ruta,
  on_comentario,
}: {
  entregable_tipo: EntregableTipo;
  unidad: string;
  version: string;
  ruta: string;
  comentario: string;
  on_entregable: (value: EntregableTipo) => void;
  on_unidad: (value: string) => void;
  on_version: (value: string) => void;
  on_ruta: (value: string) => void;
  on_comentario: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <PlanField label="Qué se entrega" htmlFor="tar-ent">
        <select
          id="tar-ent"
          className={PLAN_SELECT_CLASS}
          value={entregable_tipo}
          onChange={(e) => on_entregable(e.target.value as EntregableTipo)}
        >
          <option value="ninguno">Sin evidencia (solo marcar lista)</option>
          <option value="vista">Vista Prisma (ruta)</option>
          <option value="comentario">Comentario</option>
          <option value="version">Versión de release</option>
        </select>
      </PlanField>
      {entregable_tipo === "vista" ? (
        <PlanField label="Ruta" htmlFor="tar-ruta">
          <PrismaRouteSelect id="tar-ruta" value={ruta} on_change={on_ruta} />
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
    </div>
  );
}
