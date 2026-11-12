import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyze_req_osi_cost_gate,
  consume_shared_air,
  resolve_osi_cost_for_req,
  sum_req_direct_cost,
} from "../lib/osi-req-cost-gate";

// Caracterización de la lógica actual (antes de invertir los niveles, E1, y de sumar el gasto
// administrativo a la aprobación, E2). Cuando cambie la regla, estos casos se actualizan a propósito.

const base = { consumed_osi: 0, utilidad_ecc: 1000 };

describe("analyze_req_osi_cost_gate", () => {
  it("sin extra (la requisición no supera la OSI) no aplica", () => {
    const r = analyze_req_osi_cost_gate({
      ...base,
      cost_osi: 100,
      cost_req: 90,
      remaining_for_req: 300,
      colchon_ecc_osi: 50,
    });
    assert.equal(r.extra, 0);
    assert.equal(r.estatus, "no_aplica");
    assert.equal(r.level, 0);
    assert.equal(r.remaining_after_req, 300);
    assert.equal(r.needs_approval, false);
  });

  it("un extra chico sale del pote de utilidad y no pide nada", () => {
    const r = analyze_req_osi_cost_gate({
      ...base,
      cost_osi: 100,
      cost_req: 130,
      remaining_for_req: 300,
      colchon_ecc_osi: 50,
    });
    assert.equal(r.extra, 30);
    assert.equal(r.from_pool, 30);
    assert.equal(r.from_colchon, 0);
    assert.equal(r.remaining_after_req, 270);
    assert.equal(r.level, 1);
    assert.equal(r.needs_approval, false);
    assert.equal(r.needs_justification, false);
    assert.equal(r.estatus, "no_aplica");
  });

  it("si el pote no alcanza, el resto sale del colchón ECC-OSI y pide justificación", () => {
    const r = analyze_req_osi_cost_gate({
      ...base,
      cost_osi: 100,
      cost_req: 160,
      remaining_for_req: 20,
      colchon_ecc_osi: 50,
    });
    assert.equal(r.extra, 60);
    assert.equal(r.from_pool, 20);
    assert.equal(r.from_colchon, 40);
    assert.equal(r.remaining_after_req, 0);
    assert.equal(r.level, 3);
    assert.equal(r.needs_approval, false);
    assert.equal(r.needs_justification, true);
    assert.equal(r.estatus, "justifica");
  });

  it("si supera pote + colchón, requiere aprobación", () => {
    const r = analyze_req_osi_cost_gate({
      ...base,
      cost_osi: 100,
      cost_req: 160,
      remaining_for_req: 20,
      colchon_ecc_osi: 10,
    });
    assert.equal(r.extra, 60);
    assert.equal(r.from_pool, 20);
    assert.equal(r.from_colchon, 10);
    assert.equal(r.needs_approval, true);
    assert.equal(r.needs_justification, false);
    assert.equal(r.estatus, "pendiente");
  });

  it("los niveles se cortan por proporción de n1/n2 sobre n3 del pote restante", () => {
    const gate = (cost_req: number) =>
      analyze_req_osi_cost_gate({
        ...base,
        cost_osi: 0,
        cost_req,
        remaining_for_req: 300,
        colchon_ecc_osi: 1000,
      }).level;
    assert.equal(gate(100), 1); // ≤ 300 × 10/30
    assert.equal(gate(101), 2);
    assert.equal(gate(200), 2); // ≤ 300 × 20/30
    assert.equal(gate(201), 3);
  });

  it("no pide justificación si la OSI ya estaba en ese nivel", () => {
    const r = analyze_req_osi_cost_gate({
      ...base,
      cost_osi: 100,
      cost_req: 160,
      remaining_for_req: 20,
      colchon_ecc_osi: 50,
      osi_level: 3,
    });
    assert.equal(r.level, 3);
    assert.equal(r.needs_justification, false);
    assert.equal(r.estatus, "no_aplica");
  });
});

describe("consume_shared_air", () => {
  it("los extras de otras requisiciones comen primero el pote y después el colchón", () => {
    assert.deepEqual(consume_shared_air({ remaining: 50, colchon: 20, extras: [30, 30] }), {
      remaining: 0,
      colchon: 10,
    });
  });
});

describe("sum_req_direct_cost", () => {
  it("suma traslado por días, impresión, honorarios, informe y adicionales", () => {
    const total = sum_req_direct_cost({
      osi_fixed_items: [
        { dias_traslado: 2, costo_traslado: 10, impresion_total: 5, honorarios_total: 20, informe_final_total: 1 },
      ],
      additional_items: [{ total: 4 }],
    });
    assert.equal(total, 50);
  });
});

describe("resolve_osi_cost_for_req", () => {
  it("usa el desglose de la sesión cuando viene id_sesion", () => {
    const cost = resolve_osi_cost_for_req({
      view_totals: { costo_traslado: 999 },
      desglose: [{ id_sesion: 7, costo_traslado: 10, impresion_total: 5 }],
      id_sesion: 7,
    });
    assert.equal(cost, 15);
  });

  it("sin desglose usa los totales de la vista", () => {
    assert.equal(resolve_osi_cost_for_req({ view_totals: { costo_traslado: 12, honorarios_total: 8 } }), 20);
  });
});
