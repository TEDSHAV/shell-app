// Types for Nuevos Servicios form (solicitudes_diseno_servicio)

export interface DisenoServicioHeader {
  id: number;
  id_servicio_relacionado: number;
  id_solicitante: number;
  cargo_solicitante: string;
  fecha_solicitud: string | null;
  tipo_solicitud: string; // 'creacion' | 'modificacion'
  id_estatus: number;
  nombre_sugerido: string;
  objetivo_proposito: string;
  tipo_servicio: string; // 'Capacitación (CAP)' | 'Servicio Técnico (ST)'
  id_departamento_ejecutante: number | null; // 3 = Capacitación, 4 = Servicios Técnicos
  fecha_aprobacion: string | null;
  id_usuario_aprobador: number | null;
  observaciones_cierre: string | null;
  // Joined fields
  solicitante_nombre?: string;
  solicitante_departamento?: string;
  estatus_nombre?: string;
  servicio_nombre?: string;
  aprobador_nombre?: string;
}

// Bloque I: Recursos, Requisitos y Antecedentes
export interface BloqueRecursosRequisitos {
  objetivo?: string;
  proposito?: string;
  objetivo_especifico?: string;
  tipo_naturaleza_servicio?: "cap" | "st";
  personal_requerido: string;
  equipos_herramientas: string;
  software: string;
  infraestructura: string;
  requisitos_legales: string;
  requisitos_cliente: string;
  criterios_aceptacion: string;
  antecedentes: {
    existe: boolean;
    especificacion: string;
  };
}

// Bloque: Higiene, Seguridad y Ambiente
export interface BloqueHigieneSeguridadAmbiente {
  ambiental: {
    generacion_residuos: boolean;
    consumo_energia: boolean;
    emisiones_vertidos: boolean;
    significancia: string;
  };
  peligros: {
    biologicos: boolean;
    mecanicos: boolean;
    ergonomicos: boolean;
    electricos: boolean;
    quimicos: boolean;
    otros: string;
    descripcion: string;
  };
}

// Bloque II: Factibilidad y Planificación
export interface CostoItem {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  total: number;
}

export interface BloquePlanificacionFactibilidad {
  recurso_asignado: string;
  equipos_asignados: string;
  software_material_asignado: string;
  estructura_costos: CostoItem[];
  costo_total: number;
  viabilidad_tecnica: "favorable" | "no_favorable" | "";
  viabilidad_economica: "favorable" | "no_favorable" | "";
  tiempo_estimado: string;
  fecha_estimada_finalizacion: string;
  aprobacion: {
    nombre: string;
    cargo: string;
    fecha: string;
    aprobado: boolean;
  };
}

// Bloque III: Controles del Diseño
export interface ControlDisenoEntry {
  descripcion: string;
  responsable: string;
  fecha: string;
  resultado: "conforme" | "no_conforme" | "";
}

export interface BloqueControlesDiseno {
  revision: ControlDisenoEntry;
  verificacion: ControlDisenoEntry;
  validacion: ControlDisenoEntry;
}

// Sub-types for Oferta Técnica (Servicios Técnicos)
export interface OfertaTecnicaDuracion {
  dias_campo: string;
  dias_informe: string;
  total_estimado?: string;
}

export interface OfertaTecnicaEntregable {
  id: string;
  titulo: string;
  descripcion?: string;
  formato?: string;
}

export interface OfertaTecnicaData {
  codigo_presupuesto?: string;
  fecha_oferta?: string;
  fecha_actualizacion?: string;
  revision?: string;
  ciudad_lugar?: string;
  cliente_receptor?: string;
  titulo_servicio: string;
  proposito: string;
  alcance_ubicacion?: string;
  alcance_incluye: string[];
  alcance_no_incluye: string[];
  objetivos_especificos: string[];
  normas_metodologia: string[];
  instrumentos_equipos: string[];
  recurso_humano: string[];
  duracion: OfertaTecnicaDuracion;
  entregables: OfertaTecnicaEntregable[];
  terminos_condiciones: string[];
}

// Sub-types for Ficha Técnica (Capacitación)
export interface FichaTecnicaData {
  nombre: string;
  subtitulo: string | null;
  carga_horaria_std: number | null;
  para_quien: string | null;
  modalidad: string | null;
  objetivo_general: string | null;
  objetivo_especifico: string | null;
  contenido_curso: string | null;
  nota_aprobatoria: number | null;
  emite_carnet: boolean | null;
  created_at: string | null;
  cursoId: number | null;
  categoria?: string | null;
}

// Notas / Observaciones colaborativas
export interface DisenoServicioNota {
  id: number;
  solicitud_id: number;
  nota: string;
  created_at: string;
  created_by?: string | null;
  autor_nombre?: string | null;
  autor_departamento?: string | null;
}

// Bloque IV: Salidas del Diseño
export interface SalidaChecklistItem {
  item: string;
  aplica: "aplica" | "no_aplica" | "";
  especifique: string;
}

export interface BloqueSalidasDiseno {
  checklist: SalidaChecklistItem[];
  checklist_cap: SalidaChecklistItem[];
  declaracion_cumplimiento: boolean | null;
  observaciones: string;
  oferta_tecnica?: OfertaTecnicaData | null;
  ficha_tecnica?: FichaTecnicaData | null;
}

// Composite full data
export interface DisenoServicioFullData extends DisenoServicioHeader {
  bloque_recursos_requisitos: BloqueRecursosRequisitos | null;
  bloque_higiene_seguridad_ambiente: BloqueHigieneSeguridadAmbiente | null;
  bloque_planificacion_factibilidad: BloquePlanificacionFactibilidad | null;
  bloque_controles_diseno: BloqueControlesDiseno | null;
  bloque_salidas_diseno: BloqueSalidasDiseno | null;
}

// Lightweight for list view
export interface DisenoServicioListItem {
  id: number;
  nombre_sugerido: string;
  tipo_solicitud: string;
  tipo_servicio: string;
  tipo_naturaleza?: "cap" | "st";
  id_departamento_ejecutante: number | null; // 3 = Capacitación, 4 = Servicios Técnicos
  id_estatus: number;
  estatus_nombre: string;
  solicitante_nombre: string;
  solicitante_departamento: string;
  fecha_solicitud: string | null;
  notas_count?: number;
}

// Checklist definitions per service type
export const CAP_CHECKLIST_ITEMS = [
  "Ficha de Curso",
  "Presentación y/o Material Didáctico",
  "Manual del Curso",
  "Instrumentos de Evaluación",
  "Material POP",
  "Identificación de Requisitos Legales y Normativos Aplicables",
  "Definición de Competencias Requeridas del Facilitador",
  "Registros y Formularios Necesarios para la Ejecución del Servicio",
];

export const ST_CHECKLIST_ITEMS = [
  "Oferta Técnica",
  "Procedimiento o Instructivo para la Ejecución del Servicio",
  "Formularios para la Recolección de Datos en Campo",
  "Criterios Técnicos de Evaluación o Análisis",
  "Definición de Equipos, Instrumentos o Software Necesarios",
  "Identificación de Requisitos Legales o Normativos Aplicables",
  "Definición de Competencias Requeridas del Personal Técnico",
  "Registros y Formularios Necesarios para la Ejecución del Servicio",
];

// Default empty blocks
export const EMPTY_BLOQUE_RECURSOS: BloqueRecursosRequisitos = {
  objetivo: "",
  proposito: "",
  objetivo_especifico: "",
  tipo_naturaleza_servicio: undefined,
  personal_requerido: "",
  equipos_herramientas: "",
  software: "",
  infraestructura: "",
  requisitos_legales: "",
  requisitos_cliente: "",
  criterios_aceptacion: "",
  antecedentes: { existe: false, especificacion: "" },
};

export const EMPTY_BLOQUE_HIGIENE: BloqueHigieneSeguridadAmbiente = {
  ambiental: {
    generacion_residuos: false,
    consumo_energia: false,
    emisiones_vertidos: false,
    significancia: "",
  },
  peligros: {
    biologicos: false,
    mecanicos: false,
    ergonomicos: false,
    electricos: false,
    quimicos: false,
    otros: "",
    descripcion: "",
  },
};

export const EMPTY_BLOQUE_PLANIFICACION: BloquePlanificacionFactibilidad = {
  recurso_asignado: "",
  equipos_asignados: "",
  software_material_asignado: "",
  estructura_costos: [],
  costo_total: 0,
  viabilidad_tecnica: "",
  viabilidad_economica: "",
  tiempo_estimado: "",
  fecha_estimada_finalizacion: "",
  aprobacion: { nombre: "", cargo: "", fecha: "", aprobado: false },
};

export const EMPTY_BLOQUE_CONTROLES: BloqueControlesDiseno = {
  revision: { descripcion: "", responsable: "", fecha: "", resultado: "" },
  verificacion: { descripcion: "", responsable: "", fecha: "", resultado: "" },
  validacion: { descripcion: "", responsable: "", fecha: "", resultado: "" },
};

export const EMPTY_BLOQUE_SALIDAS: BloqueSalidasDiseno = {
  checklist: [],
  checklist_cap: [],
  declaracion_cumplimiento: null,
  observaciones: "",
  oferta_tecnica: null,
  ficha_tecnica: null,
};

export const DEFAULT_TERMINOS_CONDICIONES: string[] = [
  "Todo servicio iniciará con una reunión para la planificación y apertura del proyecto.",
  "El solicitante debe garantizar las condiciones normales de operación, el acompañamiento y la seguridad de nuestros especialistas asignados a la ejecución del servicio.",
  "Los tiempos de inducción de seguridad superiores a cuatro (04) horas que se realicen en días y horas diferentes al inicio del proyecto deben ser notificados durante la reunión inicial de planificación.",
  "El cliente dispone de una garantía del servicio con una validez máxima de 30 días calendario para realizar la revisión y aprobación del/los documentos generados.",
  "Una vez obtenida la confirmación para la impresión y emisión definitiva, SHA DE VENEZUELA, C.A. tendrá un plazo de 03 a 05 días hábiles para entregar el producto final en físico y digital.",
  "Toda reprogramación de servicios debe ser notificada con al menos 24 horas de anticipación o podría ocasionar gastos adicionales.",
];

export const EMPTY_OFERTA_TECNICA: OfertaTecnicaData = {
  codigo_presupuesto: "",
  fecha_oferta: new Date().toISOString().split("T")[0],
  fecha_actualizacion: "",
  revision: "Rev. 00",
  ciudad_lugar: "Puerto La Cruz",
  cliente_receptor: "",
  titulo_servicio: "",
  proposito: "",
  alcance_ubicacion: "",
  alcance_incluye: [],
  alcance_no_incluye: [],
  objetivos_especificos: [],
  normas_metodologia: [],
  instrumentos_equipos: [],
  recurso_humano: [],
  duracion: {
    dias_campo: "",
    dias_informe: "",
    total_estimado: "",
  },
  entregables: [],
  terminos_condiciones: [...DEFAULT_TERMINOS_CONDICIONES],
};

// Preset 1: Matriz IPER
export const PRESET_IPER: OfertaTecnicaData = {
  codigo_presupuesto: "PRE-IPER-2026",
  fecha_oferta: new Date().toISOString().split("T")[0],
  fecha_actualizacion: "",
  revision: "Rev. 00",
  ciudad_lugar: "Puerto La Cruz",
  cliente_receptor: "",
  titulo_servicio: "MATRIZ DE IDENTIFICACION DE PELIGRO Y EVALUACION DE RIESGO (IPER)",
  proposito:
    "Realizar estudio sistemático y estructurado para identificar los peligros, evaluar los riesgos y determinar medidas de control en puestos y/o áreas de trabajo, actividades y/o procesos productivos, a fin de priorizar las situaciones de riesgos que pudieran afectar la seguridad y la salud de los trabajadores, así como los activos de la organización en función de su criticidad.",
  alcance_ubicacion: "Centro de trabajo e instalaciones indicadas por el cliente.",
  alcance_incluye: [
    "Identificación y evaluación de peligros y riesgos en puestos y áreas de trabajo de los procesos productivos.",
    "Elaboración de matrices de identificación de peligros y evaluación de riesgos por puesto y proceso.",
    "Formulación de medidas de control preventivas, correctivas y de mitigación.",
    "Inspección y levantamiento de información en campo junto a los trabajadores.",
  ],
  alcance_no_incluye: [
    "Ejecución física de adecuaciones o modificaciones de infraestructura o maquinaria.",
    "Suministro de equipos de protección personal (EPP) o dispositivos de seguridad física.",
    "Evaluaciones ambientales cuantitativas especializadas no contempladas a menos que se contraten por separado.",
  ],
  objetivos_especificos: [
    "Realizar la identificación de peligros asociados en los puestos y/o áreas de trabajo, actividades y/o procesos productivos indicados por el cliente.",
    "Determinar el nivel de riesgo asociado en los puestos y/o áreas de trabajo, actividades y/o procesos productivos.",
    "Establecer los mecanismos de control para prevenir y minimizar los riesgos existentes, tendientes a evitar y/o reducir la probabilidad de accidentes de trabajo y enfermedades ocupacionales.",
    "Brindar recomendaciones técnicas para eliminar o disminuir la probabilidad y/o consecuencia de los riesgos evaluados.",
  ],
  normas_metodologia: [
    "Ley Orgánica de Prevención, Condiciones y Medio Ambiente de Trabajo (LOPCYMAT).",
    "Reglamento Parcial de la LOPCYMAT (Gaceta Oficial N° 38.596).",
    "Norma Técnica Programa de Seguridad y Salud en el Trabajo (NT-01-2008).",
    "Norma Venezolana COVENIN 4004:2000 (Sistema de Gestión de Seguridad e Higiene Ocupacional).",
    "Norma Técnica de Identificación de Peligros y Evaluación de Riesgos (NTP 330 / INSST o equivalente).",
  ],
  instrumentos_equipos: [
    "Cámara fotográfica para registro de evidencias en campo.",
    "Formatos de inspección técnica y listas de verificación.",
    "Distanciómetro digital / cinta métrica para verificación de áreas.",
  ],
  recurso_humano: [
    "Especialista en Seguridad y Salud Ocupacional (Ingeniero / Técnico Superior).",
    "Asesor Técnico Senior para revisión y validación metodológica.",
  ],
  duracion: {
    dias_campo: "3 a 5 días hábiles",
    dias_informe: "5 días hábiles",
    total_estimado: "10 días hábiles",
  },
  entregables: [
    {
      id: "ent-1",
      titulo: "Informe Técnico de la Matriz IPER",
      descripcion:
        "Documento descriptivo con la metodología, caracterización de procesos, identificación de peligros, valoración del riesgo y jerarquía de controles propuesta.",
      formato: "Físico y Digital (PDF)",
    },
    {
      id: "ent-2",
      titulo: "Matrices IPER en Hojas de Cálculo",
      descripcion:
        "Matriz interactiva por puesto de trabajo con las valoraciones cualitativas/cuantitativas y plan de acción recomendado.",
      formato: "Digital (Excel y PDF)",
    },
    {
      id: "ent-3",
      titulo: "Resumen Ejecutivo y Presentación de Resultados",
      descripcion:
        "Presentación sintetizada con gráficos de criticidad y conclusiones para la gerencia y el Comité de Seguridad y Salud Laboral.",
      formato: "Digital (PDF)",
    },
  ],
  terminos_condiciones: [...DEFAULT_TERMINOS_CONDICIONES],
};

// Preset 2: Manejo Seguro de Sustancias Químicas Peligrosas
export const PRESET_QUIMICOS: OfertaTecnicaData = {
  codigo_presupuesto: "PRE-QUIM-2026",
  fecha_oferta: new Date().toISOString().split("T")[0],
  fecha_actualizacion: "",
  revision: "Rev. 00",
  ciudad_lugar: "Puerto La Cruz",
  cliente_receptor: "",
  titulo_servicio:
    "SERVICIO DE EVALUACIÓN Y CONTROL PARA EL MANEJO SEGURO DE SUSTANCIAS QUÍMICAS PELIGROSAS",
  proposito:
    "Identificar, evaluar y establecer las medidas de prevención y control para el almacenamiento, manipulación, transporte interno y disposición de sustancias químicas peligrosas utilizadas en las instalaciones del cliente, garantizando la conformidad regulatoria, la protección del personal y la preservación del ambiente.",
  alcance_ubicacion: "Almacenes, áreas operativas y puntos de uso del cliente.",
  alcance_incluye: [
    "Inventario y caracterización de sustancias químicas presentes en las instalaciones.",
    "Revisión y verificación de Hojas de Datos de Seguridad de Materiales (HDS / FDS).",
    "Inspección de condiciones de almacenamiento, compatibilidad química y sistemas de contención.",
    "Evaluación de equipos de respuesta a emergencias (duchas lavaojos, kits antiderrame, extintores).",
    "Diseño de instructivos operacionales para la manipulación segura.",
  ],
  alcance_no_incluye: [
    "Muestreo y análisis de laboratorio cuantitativo de concentraciones ambientales de vapores o gases.",
    "Suministro de armarios ignífugos, kits antiderrame o sistemas de ventilación mecánica.",
    "Retiro, transporte externo y disposición final de desechos peligrosos.",
  ],
  objetivos_especificos: [
    "Levantar el inventario actualizado de sustancias químicas peligrosas en las áreas operativas del cliente.",
    "Verificar la compatibilidad química en el almacenamiento y el cumplimiento de las matrices de segregación.",
    "Evaluar los riesgos de exposición ocupacional aguda y crónica del personal manipulador.",
    "Formular procedimientos seguros de trabajo y recomendaciones para la atención de contingencias.",
  ],
  normas_metodologia: [
    "Ley Sobre Sustancias, Materiales y Desechos Peligrosos (Gaceta Oficial N° 5.554 Ext.).",
    "Decreto 2.635: Normas para el Control de la Recuperación de Materiales Peligrosos y el Manejo de los Desechos Peligrosos.",
    "Norma Venezolana COVENIN 3059:2002 (Hoja de Datos de Seguridad de Materiales).",
    "Norma Venezolana COVENIN 3060:2002 (Materiales Peligrosos. Clasificación, Símbolos y Dimensiones).",
    "Sistema Globalmente Armonizado de Clasificación y Etiquetado de Productos Químicos (SGA / GHS).",
  ],
  instrumentos_equipos: [
    "Cámara fotográfica para registro de señalización y estado de recipientes.",
    "Formatos de verificación de compatibilidad química y matrices de segregación.",
  ],
  recurso_humano: [
    "Ingeniero Químico o Especialista en Higiene y Toxicología Ocupacional.",
    "Inspector Técnico de Campo en Seguridad Industrial.",
  ],
  duracion: {
    dias_campo: "2 a 4 días hábiles",
    dias_informe: "4 días hábiles",
    total_estimado: "8 días hábiles",
  },
  entregables: [
    {
      id: "ent-1",
      titulo: "Informe Técnico de Manejo Seguro de Sustancias Químicas",
      descripcion:
        "Diagnóstico detallado de las condiciones de almacenamiento, manipulación y recomendaciones de ingeniería y administrativas.",
      formato: "Físico y Digital (PDF)",
    },
    {
      id: "ent-2",
      titulo: "Matriz de Compatibilidad y Segregación Química",
      descripcion:
        "Matriz visual personalizada para cada área de almacenamiento indicando sustancias compatibles e incompatibles.",
      formato: "Digital e Impreso laminado para campo",
    },
  ],
  terminos_condiciones: [...DEFAULT_TERMINOS_CONDICIONES],
};

export function createDefaultOfertaTecnicaFromSolicitud(
  solicitud: DisenoServicioHeader,
  bloqueRecursos?: BloqueRecursosRequisitos | null,
  bloquePlanificacion?: BloquePlanificacionFactibilidad | null,
): OfertaTecnicaData {
  const titulo = solicitud.nombre_sugerido || "SERVICIO TÉCNICO";
  const upper = titulo.toUpperCase();

  let basePreset = EMPTY_OFERTA_TECNICA;
  if (upper.includes("IPER") || upper.includes("PELIGRO") || upper.includes("RIESGO")) {
    basePreset = PRESET_IPER;
  } else if (upper.includes("QUIMIC") || upper.includes("SUSTANCIA") || upper.includes("DESECHO")) {
    basePreset = PRESET_QUIMICOS;
  }

  const proposito =
    bloqueRecursos?.proposito ||
    bloqueRecursos?.objetivo ||
    solicitud.objetivo_proposito ||
    basePreset.proposito ||
    "Ejecutar los servicios técnicos especializados requeridos por el cliente con los más altos estándares de calidad, seguridad y rigor metodológico.";

  const objetivos =
    bloqueRecursos?.objetivo_especifico
      ? [bloqueRecursos.objetivo_especifico]
      : basePreset.objetivos_especificos.length > 0
        ? basePreset.objetivos_especificos
        : [
            "Realizar el levantamiento técnico y diagnóstico en las instalaciones del cliente.",
            "Analizar la información conforme al marco regulatorio venezolano y normativas aplicables.",
            "Emitir informe técnico con recomendaciones y plan de acción.",
          ];

  return {
    ...basePreset,
    titulo_servicio: titulo,
    proposito,
    objetivos_especificos: objetivos,
    duracion: {
      ...basePreset.duracion,
      total_estimado:
        bloquePlanificacion?.tiempo_estimado || basePreset.duracion.total_estimado || "Por definir",
    },
    fecha_oferta: solicitud.fecha_solicitud || new Date().toISOString().split("T")[0],
  };
}

export function createDefaultFichaTecnicaFromSolicitud(
  solicitud: DisenoServicioHeader,
  bloqueRecursos?: BloqueRecursosRequisitos | null,
): FichaTecnicaData {
  const nombre = (solicitud.nombre_sugerido || "CURSO").trim().toUpperCase();
  const objetivoGeneral =
    bloqueRecursos?.objetivo ||
    solicitud.objetivo_proposito ||
    "Proporcionar a los participantes los conocimientos teóricos, habilidades y herramientas técnicas necesarias para el desempeño óptimo, seguro y eficiente de sus funciones.";
  const objetivoEspecifico =
    bloqueRecursos?.objetivo_especifico ||
    "• Identificar los conceptos y fundamentos técnicos de la materia.\n• Comprender el marco normativo y legal aplicable.\n• Aplicar las mejores prácticas operativas y de seguridad en el entorno laboral.";

  return {
    nombre,
    subtitulo: null,
    categoria: null,
    carga_horaria_std: 8,
    para_quien: "Personal operativo, supervisores, técnicos y profesionales del área interesados en fortalecer sus competencias.",
    modalidad: "Presencial",
    objetivo_general: objetivoGeneral,
    objetivo_especifico: objetivoEspecifico,
    contenido_curso: "Módulo I: Fundamentos y Conceptos Básicos\nMódulo II: Marco Legal y Normativa Aplicable\nMódulo III: Aplicación Práctica y Casos de Estudio\nMódulo IV: Evaluación y Conclusiones",
    nota_aprobatoria: 14,
    emite_carnet: false,
    created_at: solicitud.fecha_solicitud || new Date().toISOString().split("T")[0],
    cursoId: solicitud.id_servicio_relacionado || null,
  };
}
