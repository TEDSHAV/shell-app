export interface DirectoryUser {
  id: number;
  nombre_apellido: string;
  email_corporativo: string | null;
  telefono: string | null;
  cargo: string | null;
  departamento: number | null;
  departamento_nombre: string | null;
  esta_activo: boolean | null;
}

export interface UserUpdatePayload {
  nombre_apellido: string;
  email_corporativo: string | null;
  telefono: string | null;
  cargo: string | null;
  departamento: number | null;
}

export interface Department {
  id: number;
  nombre: string;
  descripcion: string | null;
}
