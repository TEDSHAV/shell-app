import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { empty_alta_form, form_de_hermana } from "../features/requisiciones/lib/req-alta-form";

// La reposición de depósito que sale junto a un curso no debe heredar lo del curso (montos ni facilitador).

function form_de_curso() {
  return {
    ...empty_alta_form({
      departamento: "Capacitación",
      gerencia: "Capacitación",
      solicitante: "Ana",
      clase: "servicio_directo",
    }),
    costo_traslado: 40,
    impresion_total: 25,
    honorarios_horas: 8,
    honorarios_costo_hora: 15,
    honorarios_total: 120,
    informe_final_total: 30,
    dias_traslado: 2,
    cod_facilitador: "7",
    facilitador: "Luis Pérez",
    cedula_facilitador: "V-123",
    rif_facilitador: "V-123-4",
    telefono_facilitador: "0412",
    banco: "Banesco",
    nro_cuenta: "0134",
    aumento_costos_justificacion: "Más participantes",
    observaciones: "Llevar proyector",
  };
}

describe("form_de_hermana", () => {
  it("deja en cero los montos heredados del curso", () => {
    const h = form_de_hermana(form_de_curso());
    for (const campo of [
      "costo_traslado",
      "impresion_total",
      "honorarios_horas",
      "honorarios_costo_hora",
      "honorarios_total",
      "informe_final_total",
      "dias_traslado",
    ] as const) {
      assert.equal(h[campo], 0, campo);
    }
    assert.deepEqual(h.osi_fixed_items, []);
  });

  it("conserva la OSI y la sesión para justificar en qué OSI se gastó el inventario", () => {
    const osi = { id_osi: 12, nro_osi: "OSI-12" } as never;
    const curso = { ...form_de_curso(), selectedOSIs: [osi], id_sesion: 3 };
    const h = form_de_hermana(curso);
    assert.equal(h.selectedOSIs[0]?.id_osi, 12);
    assert.equal(h.id_sesion, 3);
  });

  it("no hereda el facilitador ni su cuenta de pago", () => {
    const h = form_de_hermana(form_de_curso());
    for (const campo of [
      "cod_facilitador",
      "facilitador",
      "cedula_facilitador",
      "rif_facilitador",
      "telefono_facilitador",
      "banco",
      "nro_cuenta",
    ] as const) {
      assert.equal(h[campo], "", campo);
    }
  });

  it("es una externa de inventario, sin la justificación del extra del curso", () => {
    const h = form_de_hermana(form_de_curso());
    assert.equal(h.clase_pedido, "servicio_inventario");
    assert.equal(h.tipo_solicitud, "Externo");
    assert.equal(h.is_general, false);
    assert.equal(h.aumento_costos_justificacion, "");
  });

  it("conserva lo que sí es común: departamento, solicitante y observaciones", () => {
    const h = form_de_hermana(form_de_curso());
    assert.equal(h.departamento, "Capacitación");
    assert.equal(h.solicitante, "Ana");
    assert.equal(h.observaciones, "Llevar proyector");
  });

  it("no modifica el formulario del curso", () => {
    const curso = form_de_curso();
    form_de_hermana(curso);
    assert.equal(curso.honorarios_total, 120);
    assert.equal(curso.facilitador, "Luis Pérez");
  });
});
