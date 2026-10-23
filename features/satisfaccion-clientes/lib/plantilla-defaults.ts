export interface PlantillaSatisfaccion {
  titulo_encuesta: string;
  subtitulo_encuesta: string;
  pregunta_1_titulo: string;
  pregunta_1_texto: string;
  pregunta_1_opciones: {
    opt5: string;
    opt4: string;
    opt3: string;
    opt2: string;
    opt1: string;
  };
  pregunta_2_titulo: string;
  pregunta_2_texto: string;
  pregunta_2_opciones: {
    opt5: string;
    opt4: string;
    opt3: string;
    opt2: string;
    opt1: string;
  };
  pregunta_3_titulo: string;
  pregunta_3_texto: string;
  mensaje_whatsapp_plantilla: string;
}

export const DEFAULT_PLANTILLA_SATISFACCION: PlantillaSatisfaccion = {
  titulo_encuesta: "Encuesta de Satisfacción del Cliente",
  subtitulo_encuesta:
    "Estimado cliente de {empresa}, le agradecemos responder estas 3 breves preguntas sobre el servicio recibido.",
  pregunta_1_titulo: "Calidad del Producto o Servicio (Cumplimiento de Requisitos)",
  pregunta_1_texto:
    "¿En qué medida el servicio recibido cumplió con las especificaciones y características acordadas?",
  pregunta_1_opciones: {
    opt5: "Excedió mis expectativas",
    opt4: "Cumplió totalmente",
    opt3: "Cumplió parcialmente",
    opt2: "Regular / Falta mejorar",
    opt1: "No cumplió con lo acordado",
  },
  pregunta_2_titulo: "Atención y Soporte al Cliente",
  pregunta_2_texto:
    "¿Cómo evalúa la disposición, amabilidad y capacidad de respuesta de nuestro equipo/ejecutivo ante sus solicitudes o dudas?",
  pregunta_2_opciones: {
    opt5: "Excelente atención",
    opt4: "Buena atención",
    opt3: "Aceptable",
    opt2: "Deficiente",
    opt1: "Muy mala experiencia",
  },
  pregunta_3_titulo: "Fidelidad (Recompra de Servicios)",
  pregunta_3_texto:
    "Considerando su experiencia global con nosotros, ¿Volverías a comprar nuestros servicios? (0: Nada probable, 10: Altamente probable)",
  mensaje_whatsapp_plantilla:
    "Estimado(a) {contacto},\n\nEn SHA de Venezuela valoramos su opinión sobre nuestro servicio de {servicio}.\n\nLe agradeceríamos tomarse 2 minutos para responder nuestra breve encuesta de satisfacción:\n{enlace}\n\n¡Muchas gracias por su preferencia y confianza!",
};

/**
 * Format a phone number for WhatsApp URL (defaults to Venezuela +58 international format).
 */
export function formatWhatsAppPhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";

  // Already has Venezuela country code 58
  if (digits.startsWith("58") && digits.length >= 11) {
    return digits;
  }
  // Standard Venezuelan local numbers starting with 0 (e.g. 04141234567, 0424, 0412, 0212)
  if (digits.startsWith("0")) {
    return `58${digits.substring(1)}`;
  }
  // 10 digits starting with 4 (e.g. 4141234567)
  if (digits.startsWith("4") && digits.length === 10) {
    return `58${digits}`;
  }
  return digits;
}
