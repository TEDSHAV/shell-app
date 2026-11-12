import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyze_req_osi_cost_gate,
  consume_shared_air,
  resolve_osi_cost_for_req,
  sum_req_direct_cost,
} from "../lib/osi-req-cost-gate";

// Niveles de salud (E1, 2026-11-12): N3 sana … N0 sin utilidad; bajar = ganar menos. Cuando cambie la
// regla (p. ej. E2, gasto administrativo), estos casos se actualizan a propósito.

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
    assert.equal(r.level, 3);
    assert.equal(r.escala, "salud");
    assert.equal(r.remaining_after_req, 300);
    assert.equal(r.needs_approval, false);
  });

  it("un extra chico sale del pote y la utilidad sigue sana (N3)", () => {
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
    assert.equal(r.level, 3);
    assert.equal(r.needs_approval, false);
    assert.equal(r.needs_justification, false);
    assert.equal(r.estatus, "no_aplica");
  });

  it("si el pote no alcanza, el resto sale del colchón ECC-OSI: N0 y pide justificación", () => {
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
    assert.equal(r.level, 0);
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
    assert.equal(r.level, 0);
    assert.equal(r.estatus, "pendiente");
  });

  it("los niveles bajan por proporción de n1/n2 sobre n3 del pote restante", () => {
    const gate = (cost_req: number) =>
      analyze_req_osi_cost_gate({
        ...base,
        cost_osi: 0,
        cost_req,
        remaining_for_req: 300,
        colchon_ecc_osi: 1000,
      }).level;
    assert.equal(gate(100), 3); // ≤ 300 × 10/30: sana
    assert.equal(gate(101), 2); // en alerta
    assert.equal(gate(200), 2); // ≤ 300 × 20/30
    assert.equal(gate(201), 1); // en riesgo (todavía cabe en el pote)
    assert.equal(gate(301), 0); // se comió el pote: sin utilidad
  });

  it("no pide justificación si la OSI ya estaba en ese nivel (no baja)", () => {
    const r = analyze_req_osi_cost_gate({
      ...base,
      cost_osi: 100,
      cost_req: 160,
      remaining_for_req: 20,
      colchon_ecc_osi: 50,
      osi_level: 0,
    });
    assert.equal(r.level, 0);
    assert.equal(r.needs_justification, false);
    assert.equal(r.estatus, "no_aplica");
  });
});

describe("consume_shared_air", () => {
  it("los extras de otras requisiciones comen primero el pote y después el colchón", () => {
    assert.deepEqual(consume_shared_air({ remaining: 50, colchon: 20, extras: [30, 30] }), {
      remaining: 0,
      colchon: 10,
      gadmin: 0,
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

describe("etiquetas del estado del costo", () => {
  it("análisis nuevos usan el nivel tal cual; los viejos se traducen (0 → N3, si no 4 − nivel)", async () => {
    const { etiqueta_estado_costo, nivel_salud_de_analisis } = await import("../lib/osi-nivel-salud");
    assert.equal(nivel_salud_de_analisis({ extra: 10, level: 2, escala: "salud" }), 2);
    assert.equal(nivel_salud_de_analisis({ extra: 10, level: 1 }), 3);
    assert.equal(nivel_salud_de_analisis({ extra: 10, level: 3 }), 1);
    assert.equal(nivel_salud_de_analisis({ extra: 0, level: 3 }), 3);
    // Análisis muy viejo: level 0 con aprobación pendiente → N0.
    assert.equal(nivel_salud_de_analisis({ extra: 290, level: 0, needs_approval: true }), 0);
    assert.equal(etiqueta_estado_costo({ extra: 50, level: 0, escala: "salud", needs_approval: true }), "N0 · Sin utilidad · sujeta a aprobación");
    assert.equal(etiqueta_estado_costo({ extra: 0 }), "N3 · Utilidad sana");
  });
});

describe("gasto administrativo y pérdida (E2)", () => {
  it("el extra consume utilidad → diferencial → gasto administrativo → pérdida", () => {
    const r = analyze_req_osi_cost_gate({
      ...base,
      cost_osi: 100,
      cost_req: 200,
      remaining_for_req: 20,
      colchon_ecc_osi: 10,
      gadmin_ecc: 50,
    });
    assert.equal(r.extra, 100);
    assert.equal(r.from_pool, 20);
    assert.equal(r.from_colchon, 10);
    assert.equal(r.from_gadmin, 50);
    assert.equal(r.perdida, 20);
    assert.equal(r.needs_approval, true);
  });

  it("si cabe en utilidad y diferencial no toca el gasto administrativo", () => {
    const r = analyze_req_osi_cost_gate({ ...base, cost_osi: 100, cost_req: 120, remaining_for_req: 15, colchon_ecc_osi: 10, gadmin_ecc: 50 });
    assert.equal(r.from_gadmin, 0);
    assert.equal(r.perdida, 0);
  });

  it("otras requisiciones también consumen el gasto administrativo compartido", () => {
    assert.deepEqual(consume_shared_air({ remaining: 10, colchon: 5, gadmin: 30, extras: [25] }), {
      remaining: 0,
      colchon: 0,
      gadmin: 20,
    });
  });
});
