export interface VisitantesConfig {
  titulo_formulario: string;
  subtitulo_formulario: string;
  sede_nombre: string;
  titulo_descargo: string;
  texto_descargo: string;
  checkbox_descargo_label: string;
  mensaje_exito_titulo: string;
  mensaje_exito_cuerpo: string;
}

export const DEFAULT_VISITANTES_CONFIG: VisitantesConfig = {
  titulo_formulario: "Registro de Visitantes",
  subtitulo_formulario:
    "Bienvenido(a) a SHA de Venezuela, C.A. Por favor complete sus datos para registrar su ingreso en nuestras instalaciones.",
  sede_nombre: "Sede Principal — SHA de Venezuela, C.A.",
  titulo_descargo:
    "Normas de Visita, Seguridad y Descargo de Responsabilidad",
  texto_descargo: `Al ingresar a las instalaciones de SHA DE VENEZUELA, C.A., el visitante declara haber leído, comprendido y aceptado las siguientes condiciones:

1. SEGURIDAD Y SALUD EN EL TRABAJO (SST): El visitante se compromete a cumplir todas las normas de seguridad industrial, higiene y ambiente vigentes en la empresa, permanecer únicamente en las áreas autorizadas acompañado por el personal responsable asignado, y acatar las instrucciones de evacuación o emergencia indicadas por el personal de SHA de Venezuela.

2. CONFIDENCIALIDAD Y PROTECCIÓN DE INFORMACIÓN: El visitante se obliga a mantener estricta confidencialidad sobre cualquier información técnica, comercial, operativa o de clientes a la que pudiera tener acceso visual o auditivo durante su permanencia. Queda prohibida la toma de fotografías, grabaciones de audio o video y reproducción de documentos sin autorización expresa.

3. USO DE INSTALACIONES Y EXONERACIÓN: SHA de Venezuela, C.A. no se hace responsable por la pérdida, daño o extravío de objetos personales o equipos ingresados por el visitante que no hayan sido debidamente declarados en recepción.

4. VERACIDAD Y AUDITORÍA DE DATOS: El visitante certifica que los datos de identidad suministrados son veraces y autoriza su registro digital y físico con fines exclusivos de control de acceso, seguridad física y auditoría del Sistema Integrado de Gestión.`,
  checkbox_descargo_label:
    "He leído y acepto las normas de seguridad, confidencialidad y el descargo de responsabilidad de SHA de Venezuela, C.A.",
  mensaje_exito_titulo: "¡Ingreso registrado exitosamente!",
  mensaje_exito_cuerpo:
    "Su visita ha quedado registrada en nuestro sistema de recepción. Por favor aguarde unos instantes; la persona responsable de atenderle será notificada.",
};

export const MOTIVOS_VISITA_SUGERIDOS = [
  "Reunión comercial / Negocios",
  "Entrega o retiro de certificados / documentos",
  "Capacitación / Curso",
  "Servicios Técnicos / Equipos",
  "Proveedor / Suministros / Mensajería",
  "Entrevista / Recursos Humanos",
  "Auditoría / Calidad",
  "Visita institucional / Otro",
] as const;
