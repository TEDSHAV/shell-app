export interface ClienteCredential {
  id: number;
  empresa_id: number;
  username: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  id_ciudad?: number | null;
  id_sede?: number[] | null;
}

export interface EmpresaLogo {
  id: number;
  empresa_id: number;
  logo_url: string;
  storage_path: string;
  uploaded_at: string | null;
}

export interface City {
  id: number;
  nombre_ciudad: string;
  id_estado: number;
}

export interface Sede {
  id: number;
  nombre_sede: string;
  id_empresa: number;
  id_estado: number | null;
  esta_activo: boolean;
}
