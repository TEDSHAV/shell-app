"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OSIFullData, RequisicionFormData } from "@/types/requisiciones";
import { save_req_with_lineas_action } from "@/actions/req-lineas";
import {
  preview_req_osi_gate_action,
  type ReqGatePreview,
} from "@/actions/req-alta-gate";
import { osi_fixed_line_total } from "@/lib/requisicion-osi-clone";
import {
  ambito_from_tipo_servicio,
  ambito_pedido_req,
  cajon_from_clase,
  clase_from_destino,
  type ClasePedido,
  type DestinoPedido,
  type ServicioKind,
} from "../../lib/req-destino";
import { apply_fixed_to_form, empty_alta_form } from "../../lib/req-alta-form";
import { build_osi_fixed_item } from "../../lib/req-osi-precarga";
import {
  empty_linea_draft,
  linea_total,
  type ReqLineaDraft,
} from "../../lib/req-lineas-types";
import {
  seed_alta_restock,
  sesiones_de_osi,
  type ReqAltaRestock,
} from "../../lib/req-alta-restock";
import { isCapacitacionDept } from "@/lib/requisiciones-gerencia";
import {
  pasos_visibles_alta,
  type PasoAlta,
} from "../../lib/req-alta-pasos";
import { ReqAltaPasoComoSeUsa, ReqAltaPasoParaQuien } from "./req-alta-paso-destino";
import { ReqAltaEstatusFinal } from "./req-alta-revision";
import { ReqAltaStepper } from "./req-alta-stepper";
import { ReqAltaPasoCreacion } from "./req-alta-paso-creacion";

type ReqAltaAsistenteProps = {
  osis: OSIFullData[];
  userData: { nombre_apellido?: string; departamento?: number | null } | null;
  userDept: string;
  userGerencia: string;
  osiSessions: Array<{
    id: number;
    id_osi: number;
    nro_sesion: number;
    fecha: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
  }>;
  restock?: ReqAltaRestock | null;
  /** Deep-link desde inventario: abrir análisis de stock. */
  abastecer?: boolean;
};

export function ReqAltaAsistente({
  osis,
  userData,
  userDept,
  userGerencia,
  osiSessions,
  restock = null,
  abastecer = false,
}: ReqAltaAsistenteProps) {
  const seed = restock
    ? seed_alta_restock({
        restock,
        departamento: userDept,
        gerencia: userGerencia,
        solicitante: userData?.nombre_apellido || "",
      })
    : null;
  const router = useRouter();
  const [paso, setPaso] = useState<PasoAlta>(seed?.paso ?? "destino");
  const [destino, setDestino] = useState<DestinoPedido | null>(
    seed?.destino ?? null,
  );
  const [servicio, setServicio] = useState<ServicioKind | null>(
    seed?.servicio ?? null,
  );
  const [lineas, setLineas] = useState<ReqLineaDraft[]>(seed?.lineas ?? []);
  const [hermana, setHermana] = useState<ReqLineaDraft[]>([]);
  const [emitHermana, setEmitHermana] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [createdHermanaId, setCreatedHermanaId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState<ReqGatePreview | null>(null);
  const [form, setForm] = useState<RequisicionFormData>(
    () =>
      seed?.form ??
      empty_alta_form({
        departamento: userDept,
        gerencia: userGerencia,
        solicitante: userData?.nombre_apellido || "",
        clase: "departamento",
      }),
  );

  const clase: ClasePedido | null = clase_from_destino(destino, servicio);
  const osi = form.selectedOSIs[0] || null;
  const ambito = clase
    ? ambito_pedido_req({
        clase,
        departamento: form.departamento || userDept,
        tipo_servicio: osi?.tipo_servicio || form.tipo_servicio,
        servicio_nombre: osi?.servicio,
      })
    : "departamentos";
  const cajon = clase ? cajon_from_clase(clase) : "interno";
  const pasos = useMemo(
    () => pasos_visibles_alta(destino, servicio),
    [destino, servicio],
  );

  useEffect(() => {
    if (clase !== "servicio_directo" || !osi) {
      setGate(null);
      return;
    }
    const fixed = (form.osi_fixed_items || []).reduce(
      (sum, row) => sum + osi_fixed_line_total(row),
      0,
    );
    const extras = lineas
      .filter((row) => row.origen !== "osi_recurso")
      .reduce((sum, row) => sum + linea_total(row), 0);
    void preview_req_osi_gate_action(osi.id_osi, extras + fixed).then(setGate);
  }, [clase, osi, form.osi_fixed_items, lineas]);

  const pick_osi = (next: OSIFullData) => {
    const sesiones = sesiones_de_osi(next, osiSessions);
    const sesion = sesiones.length === 1 ? sesiones[0] : null;
    const fixed = build_osi_fixed_item(next, sesion);
    setForm((prev) =>
      apply_fixed_to_form(
        {
          ...prev,
          selectedOSIs: [next],
          osi_fixed_items: [fixed],
          id_sesion: sesion?.id_sesion ?? null,
          selectedSesion: sesion,
          tipo_servicio:
            ambito_from_tipo_servicio(next.tipo_servicio, next.servicio) ===
            "tecnico"
              ? "Servicio Técnico"
              : "Capacitación",
        },
        fixed,
      ),
    );
  };

  const pick_sesion = (id: number) => {
    const host = form.selectedOSIs[0];
    if (!host) return;
    const sesion = sesiones_de_osi(host, osiSessions).find(
      (row) => row.id_sesion === id,
    );
    if (!sesion) return;
    const fixed = build_osi_fixed_item(host, sesion);
    setForm((prev) =>
      apply_fixed_to_form(
        {
          ...prev,
          id_sesion: id,
          selectedSesion: sesion,
          osi_fixed_items: [fixed],
        },
        fixed,
      ),
    );
  };

  const ir_creacion = () => {
    if (!clase) return;
    if (form.clase_pedido !== clase) {
      setForm(
        empty_alta_form({
          departamento: form.departamento || userDept,
          gerencia: form.gerencia_solicitante || userGerencia,
          solicitante: form.solicitante,
          clase,
        }),
      );
      setLineas(
        clase === "servicio_directo" ? [] : [empty_linea_draft(cajon_from_clase(clase))],
      );
      setHermana([]);
      setEmitHermana(false);
    } else if (lineas.length === 0 && clase !== "servicio_directo") {
      setLineas([empty_linea_draft(cajon_from_clase(clase))]);
    }
    setPaso("creacion");
  };

  const crear = async () => {
    if (!clase) return;
    if (clase === "servicio_directo" && form.selectedOSIs.length === 0) {
      alert("Seleccione una OSI.");
      return;
    }
    if (
      clase === "servicio_directo" &&
      emitHermana &&
      hermana.filter((row) => row.nombre_item.trim()).length === 0
    ) {
      alert("Marcó reposición: añada al menos un ítem de depósito, o desmarque.");
      return;
    }
    setBusy(true);
    try {
      const cap =
        clase === "servicio_directo" &&
        isCapacitacionDept(form.departamento);
      const saved = await save_req_with_lineas_action({
        form: {
          ...form,
          clase_pedido: clase,
          osi_fixed_items: cap ? form.osi_fixed_items : [],
        },
        lineas,
        cajon,
        hermana:
          clase === "servicio_directo" && emitHermana
            ? {
                form: {
                  ...form,
                  is_general: false,
                  tipo_solicitud: "Externo",
                  clase_pedido: "servicio_inventario",
                  osi_fixed_items: [],
                  selectedOSIs: [],
                },
                lineas: hermana,
              }
            : null,
      });
      setCreatedId(saved.id);
      setCreatedHermanaId(saved.hermana_id);
      setPaso("listo");
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo crear.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <ReqAltaStepper pasos={pasos} actual={paso} on_go={setPaso} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {paso === "destino" ? (
        <div className="space-y-5">
          <ReqAltaPasoParaQuien destino={destino} on_destino={setDestino} />
          <Button
            type="button"
            disabled={!destino}
            onClick={() =>
              destino === "departamento" ? ir_creacion() : setPaso("uso")
            }
          >
            Continuar
          </Button>
        </div>
      ) : null}

      {paso === "uso" ? (
        <div className="space-y-5">
          <ReqAltaPasoComoSeUsa servicio={servicio} on_servicio={setServicio} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setPaso("destino")}>
              Atrás
            </Button>
            <Button type="button" disabled={!servicio} onClick={ir_creacion}>
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {paso === "creacion" && clase ? (
        <div className="space-y-5">
          <ReqAltaPasoCreacion
            clase={clase}
            ambito={ambito}
            cajon={cajon}
            form={form}
            on_form={setForm}
            id_departamento={Number(userData?.departamento) || null}
            deposito_stock={restock?.deposito ?? "departamento"}
            abastecer_inicial={abastecer || Boolean(restock)}
            osis={osis}
            osi_sessions={osiSessions}
            osi={osi}
            id_sesion={form.id_sesion}
            on_pick_osi={pick_osi}
            on_sesion={pick_sesion}
            lineas={lineas}
            on_lineas={setLineas}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaso(destino === "servicio" ? "uso" : "destino")}
            >
              Atrás
            </Button>
            <Button type="button" onClick={() => setPaso("confirmar")}>
              Continuar a revisar
            </Button>
          </div>
        </div>
      ) : null}

      {paso === "confirmar" && clase ? (
        <div className="space-y-5">
          <ReqAltaEstatusFinal
            clase={clase}
            form={form}
            lineas={lineas}
            cajon={cajon}
            ambito={ambito}
            id_departamento={Number(userData?.departamento) || null}
            gate={gate}
            emit_hermana={emitHermana}
            on_emit_hermana={setEmitHermana}
            hermana={hermana}
            on_hermana={setHermana}
            ambito_hermana={
              ambito === "departamentos" || ambito === "general"
                ? ambito_from_tipo_servicio(osi?.tipo_servicio, osi?.servicio) ??
                  "capacitacion"
                : ambito
            }
            on_justificacion={(value) =>
              setForm((prev) => ({
                ...prev,
                aumento_costos_justificacion: value,
              }))
            }
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setPaso("creacion")}>
              Atrás
            </Button>
            <Button type="button" disabled={busy} onClick={() => void crear()}>
              {emitHermana && clase === "servicio_directo"
                ? "Crear ambas requisiciones"
                : "Crear requisición"}
            </Button>
          </div>
        </div>
      ) : null}

      {paso === "listo" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h2 className="text-lg font-semibold text-gray-900">
            Requisición creada
          </h2>
          {createdId ? (
            <p className="text-sm text-gray-600">
              Quedó registrada con el id interno #{createdId}
              {createdHermanaId
                ? ` y la reposición #${createdHermanaId}`
                : ""}
              . Ya puede seguirla en Mis requisiciones.
            </p>
          ) : null}
          <Button type="button" onClick={() => router.push("/requisiciones")}>
            Ir a mis requisiciones
          </Button>
        </div>
      ) : null}
      </div>
    </div>
  );
}
