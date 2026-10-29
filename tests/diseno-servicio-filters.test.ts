import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCapacitacion,
  isServiciosTecnicos,
  isFinalizado,
  extractLocalDate,
  calculateDonePercentage,
  matchesDisenoFilters,
  computeDepartmentCounts,
  computeDepartmentMetrics,
  filterDisenoRecords,
  type DisenoServicioFilters,
} from "../lib/diseno-servicio-filters";
import type { DisenoServicioListItem } from "../types/diseno-servicio";

const MOCK_RECORDS: DisenoServicioListItem[] = [
  {
    id: 1,
    nombre_sugerido: "Curso de Espacios Confinados",
    tipo_solicitud: "creacion",
    tipo_servicio: "Capacitación (CAP)",
    tipo_naturaleza: "cap",
    id_departamento_ejecutante: 3,
    id_estatus: 38, // Aprobada/Lista (finished)
    estatus_nombre: "Aprobada/Respondida/Lista",
    solicitante_nombre: "Juan Perez",
    solicitante_departamento: "Operaciones",
    fecha_solicitud: "2026-10-15",
    osi_count: 2,
    osi_numeros: ["3501", "3502"],
  },
  {
    id: 2,
    nombre_sugerido: "Seguridad Eléctrica Avanzada",
    tipo_solicitud: "modificacion",
    tipo_servicio: "Capacitación (CAP)",
    tipo_naturaleza: "cap",
    id_departamento_ejecutante: 3,
    id_estatus: 35, // Solicitada/Pendiente
    estatus_nombre: "Solicitada/Pendiente",
    solicitante_nombre: "Maria Rodriguez",
    solicitante_departamento: "Seguridad Industrial",
    fecha_solicitud: "2026-10-20",
    osi_count: 0,
    osi_numeros: [],
  },
  {
    id: 3,
    nombre_sugerido: "Matriz IPER para Planta Sur",
    tipo_solicitud: "creacion",
    tipo_servicio: "Servicio Técnico (ST)",
    tipo_naturaleza: "st",
    id_departamento_ejecutante: 4,
    id_estatus: 38, // Aprobada/Lista (finished)
    estatus_nombre: "Aprobada/Respondida/Lista",
    solicitante_nombre: "Juan Perez",
    solicitante_departamento: "Operaciones",
    fecha_solicitud: "2026-10-22",
    osi_count: 1,
    osi_numeros: ["3600"],
  },
  {
    id: 4,
    nombre_sugerido: "Muestreo Ambiental de Emisiones",
    tipo_solicitud: "creacion",
    tipo_servicio: "Servicio Técnico (ST)",
    tipo_naturaleza: "st",
    id_departamento_ejecutante: 4,
    id_estatus: 36, // En Proceso
    estatus_nombre: "En Proceso",
    solicitante_nombre: "Carlos Gomez",
    solicitante_departamento: "Calidad",
    fecha_solicitud: "2026-10-25T14:30:00Z",
    osi_count: 0,
    osi_numeros: [],
  },
  {
    id: 5,
    nombre_sugerido: "Primeros Auxilios Básicos",
    tipo_solicitud: "creacion",
    tipo_servicio: "Capacitación (CAP)",
    tipo_naturaleza: "cap",
    id_departamento_ejecutante: 3,
    id_estatus: 36, // En Proceso
    estatus_nombre: "En Proceso",
    solicitante_nombre: "Carlos Gomez",
    solicitante_departamento: "Calidad",
    fecha_solicitud: null,
    osi_count: 0,
    osi_numeros: [],
  },
];

const EMPTY_FILTERS: DisenoServicioFilters = {
  search: "",
  solicitante: "",
  departamento: "",
  estatus: "",
  osiLink: "",
  dateFrom: "",
  dateTo: "",
};

describe("DisenoServicio: Department Classification", () => {
  it("correctly identifies Capacitacion vs Servicios Tecnicos records", () => {
    assert.equal(isCapacitacion(MOCK_RECORDS[0]), true);
    assert.equal(isServiciosTecnicos(MOCK_RECORDS[0]), false);

    assert.equal(isCapacitacion(MOCK_RECORDS[2]), false);
    assert.equal(isServiciosTecnicos(MOCK_RECORDS[2]), true);

    // Missing tipo_naturaleza fallback to department ID
    assert.equal(
      isCapacitacion({ tipo_naturaleza: undefined, id_departamento_ejecutante: 3 }),
      true,
    );
    assert.equal(
      isCapacitacion({ tipo_naturaleza: undefined, id_departamento_ejecutante: 4 }),
      false,
    );
    assert.equal(
      isServiciosTecnicos({ tipo_naturaleza: undefined, id_departamento_ejecutante: 4 }),
      true,
    );
  });
});

describe("DisenoServicio: isFinalizado status check", () => {
  it("accurately identifies finished/completed status", () => {
    assert.equal(isFinalizado({ id_estatus: 38, estatus_nombre: "Aprobada/Respondida/Lista" }), true);
    assert.equal(isFinalizado({ id_estatus: 35, estatus_nombre: "Solicitada/Pendiente" }), false);
    assert.equal(isFinalizado({ id_estatus: 36, estatus_nombre: "En Proceso" }), false);
    assert.equal(isFinalizado({ id_estatus: 99, estatus_nombre: "Finalizada" }), true);
  });
});

describe("DisenoServicio: Date Extraction", () => {
  it("extracts YYYY-MM-DD from various date formats without timezone corruption", () => {
    assert.equal(extractLocalDate("2026-10-24"), "2026-10-24");
    assert.equal(extractLocalDate("2026-10-24T14:20:00Z"), "2026-10-24");
    assert.equal(extractLocalDate("2026-10-24 10:00:00"), "2026-10-24");
    assert.equal(extractLocalDate(null), "");
    assert.equal(extractLocalDate(undefined), "");
  });
});

describe("DisenoServicio: Percentage Calculation", () => {
  it("calculates accurate integer percentage of completion (done vs requested)", () => {
    assert.equal(calculateDonePercentage(1, 3), 33);
    assert.equal(calculateDonePercentage(1, 2), 50);
    assert.equal(calculateDonePercentage(2, 5), 40);
    assert.equal(calculateDonePercentage(0, 5), 0);
    assert.equal(calculateDonePercentage(5, 5), 100);
    assert.equal(calculateDonePercentage(0, 0), 0);
  });
});

describe("DisenoServicio: Filter Matching", () => {
  it("matches search with ID (# prefix and raw number)", () => {
    assert.equal(matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, search: "#1" }), true);
    assert.equal(matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, search: "1" }), true);
    assert.equal(matchesDisenoFilters(MOCK_RECORDS[1], { ...EMPTY_FILTERS, search: "#1" }), false);
  });

  it("matches search with OSI number", () => {
    assert.equal(matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, search: "3501" }), true);
    assert.equal(matchesDisenoFilters(MOCK_RECORDS[1], { ...EMPTY_FILTERS, search: "3501" }), false);
  });

  it("filters by osiLink", () => {
    assert.equal(matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, osiLink: "with_osi" }), true);
    assert.equal(matchesDisenoFilters(MOCK_RECORDS[1], { ...EMPTY_FILTERS, osiLink: "with_osi" }), false);
    assert.equal(matchesDisenoFilters(MOCK_RECORDS[1], { ...EMPTY_FILTERS, osiLink: "without_osi" }), true);
  });

  it("matches search query case-insensitively across name, service type, solicitante, department, status", () => {
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, search: "confinados" }),
      true,
    );
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, search: "juan perez" }),
      true,
    );
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, search: "operaciones" }),
      true,
    );
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, search: "aprobada" }),
      true,
    );
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, search: "no-match-xyz" }),
      false,
    );
  });

  it("filters accurately by solicitante dropdown", () => {
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, solicitante: "Juan Perez" }),
      true,
    );
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[1], { ...EMPTY_FILTERS, solicitante: "Juan Perez" }),
      false,
    );
  });

  it("filters accurately by solicitante departamento dropdown", () => {
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, departamento: "Operaciones" }),
      true,
    );
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[1], { ...EMPTY_FILTERS, departamento: "Operaciones" }),
      false,
    );
  });

  it("filters accurately by status ID", () => {
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], { ...EMPTY_FILTERS, estatus: "38" }),
      true,
    );
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[1], { ...EMPTY_FILTERS, estatus: "38" }),
      false,
    );
  });

  it("filters accurately by date range (inclusive boundaries)", () => {
    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], {
        ...EMPTY_FILTERS,
        dateFrom: "2026-10-15",
        dateTo: "2026-10-15",
      }),
      true,
    );

    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], {
        ...EMPTY_FILTERS,
        dateFrom: "2026-10-10",
        dateTo: "2026-10-20",
      }),
      true,
    );

    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[0], {
        ...EMPTY_FILTERS,
        dateFrom: "2026-10-16",
        dateTo: "2026-10-20",
      }),
      false,
    );

    assert.equal(
      matchesDisenoFilters(MOCK_RECORDS[4], {
        ...EMPTY_FILTERS,
        dateFrom: "2026-10-01",
      }),
      false,
    );
  });
});

describe("DisenoServicio: Filtered Counts & Total Services Count", () => {
  it("computes accurate counts when no filters are set", () => {
    const counts = computeDepartmentCounts(MOCK_RECORDS);
    assert.deepEqual(counts, {
      todos: 5,
      cap: 3,
      st: 2,
    });
  });

  it("updates department counts when filtered (ensuring total services count reflects filters)", () => {
    const filteredJuan = MOCK_RECORDS.filter((r) =>
      matchesDisenoFilters(r, { ...EMPTY_FILTERS, solicitante: "Juan Perez" }),
    );
    const countsJuan = computeDepartmentCounts(filteredJuan);
    assert.deepEqual(countsJuan, {
      todos: 2,
      cap: 1,
      st: 1,
    });
  });

  it("filters records cleanly with active department tab", () => {
    const capOnly = filterDisenoRecords(MOCK_RECORDS, EMPTY_FILTERS, "cap");
    assert.equal(capOnly.length, 3);
    assert.deepEqual(capOnly.map((r) => r.id), [1, 2, 5]);

    const stOnly = filterDisenoRecords(MOCK_RECORDS, EMPTY_FILTERS, "st");
    assert.equal(stOnly.length, 2);
    assert.deepEqual(stOnly.map((r) => r.id), [3, 4]);
  });
});

describe("DisenoServicio: Subtle Metrics (Requested vs Finished & Percentage)", () => {
  it("computes accurate requested vs finished metrics and percentages per department", () => {
    const metrics = computeDepartmentMetrics(MOCK_RECORDS);

    // Capacitacion:
    // - id 1 (finished)
    // - id 2 (pending)
    // - id 5 (in process)
    // Total requested: 3, finished: 1, percentage: 33%
    assert.deepEqual(metrics.cap, {
      solicitados: 3,
      finalizados: 1,
      porcentaje: 33,
    });

    // Servicios Tecnicos:
    // - id 3 (finished)
    // - id 4 (in process)
    // Total requested: 2, finished: 1, percentage: 50%
    assert.deepEqual(metrics.st, {
      solicitados: 2,
      finalizados: 1,
      porcentaje: 50,
    });

    // Todos:
    // Total requested: 5, finished: 2, percentage: 40%
    assert.deepEqual(metrics.todos, {
      solicitados: 5,
      finalizados: 2,
      porcentaje: 40,
    });
  });

  it("computes metrics accurately on filtered records", () => {
    const calidadRecords = MOCK_RECORDS.filter((r) =>
      matchesDisenoFilters(r, { ...EMPTY_FILTERS, departamento: "Calidad" }),
    );
    const metrics = computeDepartmentMetrics(calidadRecords);

    assert.deepEqual(metrics.cap, {
      solicitados: 1,
      finalizados: 0,
      porcentaje: 0,
    });
    assert.deepEqual(metrics.st, {
      solicitados: 1,
      finalizados: 0,
      porcentaje: 0,
    });
  });

  it("completely excludes hidden records from department metrics and counts when hidden in dev", () => {
    // Hide record id 1 (which was the ONLY finished Capacitacion item)
    const hiddenIds = new Set([1]);
    const active = MOCK_RECORDS.filter((r) => !hiddenIds.has(r.id));

    const counts = computeDepartmentCounts(active);
    assert.deepEqual(counts, {
      todos: 4,
      cap: 2,
      st: 2,
    });

    const metrics = computeDepartmentMetrics(active);
    // Capacitacion now has 2 requested, 0 finished (0%)
    assert.deepEqual(metrics.cap, {
      solicitados: 2,
      finalizados: 0,
      porcentaje: 0,
    });

    // Todos now has 4 requested, 1 finished (25%)
    assert.deepEqual(metrics.todos, {
      solicitados: 4,
      finalizados: 1,
      porcentaje: 25,
    });

    // Servicios Tecnicos unaffected
    assert.deepEqual(metrics.st, {
      solicitados: 2,
      finalizados: 1,
      porcentaje: 50,
    });
  });
});
