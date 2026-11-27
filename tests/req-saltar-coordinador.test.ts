import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  motivo_no_saltar_coordinador,
  parche_salto_coordinador,
} from "../features/requisiciones/lib/req-saltar-coordinador";

const interna_en_coordinador = {
  tipo_solicitud: "Interno",
  clase_pedido: "departamento",
  coordinador_estatus: "pendiente",
  lider_estatus: null,
  estatus_admin: "pendiente",
  suspendida_at: null,
};

describe("salto del coordinador al líder", () => {
  it("permite la interna que espera al coordinador", () => {
    assert.equal(motivo_no_saltar_coordinador(interna_en_coordinador), null);
  });

  it("deja el sello del coordinador vacío y el del líder pendiente", () => {
    assert.deepEqual(parche_salto_coordinador("auth-1", "2026-11-27T00:00:00.000Z"), {
      coordinador_estatus: null,
      coordinador_por: "auth-1",
      coordinador_at: "2026-11-27T00:00:00.000Z",
      lider_estatus: "pendiente",
    });
  });

  it("rechaza externas, cerradas, suspendidas y las que ya vio el líder", () => {
    assert.match(
      motivo_no_saltar_coordinador({
        ...interna_en_coordinador,
        clase_pedido: "servicio_extra",
      }) || "",
      /internas/,
    );
    assert.match(
      motivo_no_saltar_coordinador({
        ...interna_en_coordinador,
        estatus_admin: "procesada",
      }) || "",
      /cerrada/,
    );
    assert.match(
      motivo_no_saltar_coordinador({
        ...interna_en_coordinador,
        suspendida_at: "2026-11-27T00:00:00.000Z",
      }) || "",
      /suspendida/,
    );
    assert.match(
      motivo_no_saltar_coordinador({
        ...interna_en_coordinador,
        lider_estatus: "pendiente",
      }) || "",
      /líder/,
    );
    assert.match(
      motivo_no_saltar_coordinador({
        ...interna_en_coordinador,
        coordinador_estatus: "aprobada",
      }) || "",
      /coordinador/,
    );
  });
});
