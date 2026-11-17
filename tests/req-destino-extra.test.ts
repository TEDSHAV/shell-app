import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cajon_from_clase,
  clase_from_destino,
  es_clase_con_osi,
  es_clase_pedido_externa,
  es_req_interna,
  osi_obligatoria,
  trae_recursos_osi,
  usa_flujo_entrega_deposito,
} from "../features/requisiciones/lib/req-destino";

describe("modalidad extra a una OSI", () => {
  it("se resuelve desde destino servicio + extra", () => {
    assert.equal(clase_from_destino("servicio", "extra"), "servicio_extra");
    assert.equal(cajon_from_clase("servicio_extra"), "directo");
  });

  it("exige OSI pero no trae recursos de ella", () => {
    assert.equal(osi_obligatoria("servicio_extra"), true);
    assert.equal(es_clase_con_osi("servicio_extra"), true);
    assert.equal(trae_recursos_osi("servicio_extra"), false);
    assert.equal(trae_recursos_osi("servicio_directo"), true);
  });

  it("es externa y no usa el flujo de depósito", () => {
    assert.equal(es_clase_pedido_externa("servicio_extra"), true);
    assert.equal(es_req_interna({ clase_pedido: "servicio_extra", tipo_solicitud: "Interno" }), false);
    assert.equal(usa_flujo_entrega_deposito({ clase_pedido: "servicio_extra" }), false);
  });
});
