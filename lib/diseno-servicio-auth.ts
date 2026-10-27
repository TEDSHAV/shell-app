const ESTATUS_COMPLETADO = 38;
const DEPT_CAPACITACION = 3;
const DEPT_SERVICIOS_TECNICOS = 4;

export function isCapacitacionService(solicitud: any): boolean {
  if (!solicitud) return false;
  return (
    solicitud.id_departamento_ejecutante === DEPT_CAPACITACION ||
    (solicitud.bloque_recursos_requisitos as any)?.tipo_naturaleza_servicio === "cap" ||
    solicitud.tipo_servicio?.toLowerCase().includes("cap")
  );
}

// Determines if a user can edit an already finished/completed solicitud (id_estatus === 38)
// Rule: Only TED, admins/superadmins, or the coordinador/lider of the EXECUTING department.
// Coordinators or leaders from other departments CANNOT edit.
export function canUserEditFinishedDiseno(userData: any, solicitud: any): boolean {
  if (!userData || !solicitud) return false;

  // TED and admins/superadmins can edit either department's designs
  if (userData.isAdmin || userData.isTed) return true;

  const isCap = isCapacitacionService(solicitud);

  if (isCap) {
    // Only Capacitación coordinator or leader can edit completed Capacitación designs
    return Boolean(userData.isCapCoordinador || userData.isCapLider);
  } else {
    // Only Servicios Técnicos coordinator or leader can edit completed ST designs
    return Boolean(userData.isStCoordinador || userData.isStLider);
  }
}

// Determines if a user can edit a given solicitud (both in-progress and completed)
// Rule:
// - TED and Admins: can edit either department at any time.
// - In-progress: only staff, coordinador, or lider of the EXECUTING department.
// - Completed: strictly coordinador or lider of the EXECUTING department.
export function canUserEditDiseno(userData: any, solicitud: any): boolean {
  if (!userData || !solicitud) return false;

  const isCompleted = solicitud.id_estatus === ESTATUS_COMPLETADO;
  if (isCompleted) {
    return canUserEditFinishedDiseno(userData, solicitud);
  }

  // TED and admins/superadmins can edit either department
  if (userData.isAdmin || userData.isTed) return true;

  const isCap = isCapacitacionService(solicitud);

  if (isCap) {
    // Members of Capacitación or its coordinator/leader
    return Boolean(
      userData.isCapacitacion ||
      userData.isCapCoordinador ||
      userData.isCapLider
    );
  } else {
    // Members of Servicios Técnicos or its coordinator/leader
    return Boolean(
      userData.isServiciosTecnicos ||
      userData.isStCoordinador ||
      userData.isStLider
    );
  }
}
