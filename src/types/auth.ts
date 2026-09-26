export interface AuthUser {
  name: string;
  email: string;
  rol: string;
  rol_id?: number;
  initials: string;
  especialidad?: string;
  sede?: string;
  sede_id?: number;
}