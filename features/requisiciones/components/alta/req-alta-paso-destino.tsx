"use client";

import { Building2, GraduationCap, Package, Receipt } from "lucide-react";
import type { DestinoPedido, ServicioKind } from "../../lib/req-destino";

function ChoiceCard({
  selected,
  icon: Icon,
  title,
  body,
  on_click,
}: {
  selected: boolean;
  icon: typeof Building2;
  title: string;
  body: string;
  on_click: () => void;
}) {
  return (
    <button
      type="button"
      onClick={on_click}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-blue-600 bg-blue-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-blue-300"
      }`}
    >
      <span
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-gray-600">
          {body}
        </span>
      </span>
    </button>
  );
}

export function ReqAltaPasoParaQuien({
  destino,
  on_destino,
}: {
  destino: DestinoPedido | null;
  on_destino: (value: DestinoPedido) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          ¿Para quién es este pedido?
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Esto decide si hay OSI, si entra a un depósito y quién sella después.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          selected={destino === "departamento"}
          icon={Building2}
          title="Mi departamento"
          body="Útiles, limpieza o lo que el área necesita para trabajar. Sin OSI. Entra al depósito de su departamento."
          on_click={() => on_destino("departamento")}
        />
        <ChoiceCard
          selected={destino === "servicio"}
          icon={GraduationCap}
          title="Dar un servicio"
          body="Curso de capacitación o servicio técnico. En el siguiente paso elige si se gasta en la OSI o solo se repone depósito."
          on_click={() => on_destino("servicio")}
        />
      </div>
    </div>
  );
}

export function ReqAltaPasoComoSeUsa({
  servicio,
  on_servicio,
}: {
  servicio: ServicioKind | null;
  on_servicio: (value: ServicioKind) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          ¿Cómo se usa el gasto?
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Directo e inventario no comparten el mismo número. Un honorario no
          es una caja de agua.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          selected={servicio === "directo"}
          icon={Receipt}
          title="Se gasta en esta OSI"
          body="Honorarios, traslado, impresión o lo que se imputa al curso. Hay que elegir la OSI. El dinero entra al gate."
          on_click={() => on_servicio("directo")}
        />
        <ChoiceCard
          selected={servicio === "inventario"}
          icon={Package}
          title="Solo reponer depósito"
          body="Compra para el almacén de capacitación o ST. Sin OSI. Entra al depósito y el reparto a cursos se confirma después."
          on_click={() => on_servicio("inventario")}
        />
      </div>
    </div>
  );
}
