// TEMPORAL — mientras no haya una vía para que un asistente lea usuarios/rol
// de otros usuarios de su sede (bloqueado hoy por RLS; se descartó tocar
// policies o usar la service_role key), se usa esta lista fija con los
// médicos REALES ya existentes en la BD (uuids reales de `usuarios`, rol
// "doctor") para poder mostrar sus columnas en el calendario aunque todavía
// no tengan citas. Reemplazar por una consulta real en cuanto haya otra
// solución de acceso a datos.
export interface DoctorMock {
  id: string;
  nombre: string;
  apellido: string;
  sede_id: number;
  especialidad: string | null;
}

export const DOCTORES_MOCK: DoctorMock[] = [
  { id: "15f87576-2dc0-43ca-9721-f1f8094071fe", nombre: "Marco Antonio Luis", apellido: "Torres Vega", sede_id: 1, especialidad: null },
  { id: "d08acb92-95a5-4b5b-abfb-699cef501ab2", nombre: "Miguel Ángel", apellido: "Díaz Morales", sede_id: 1, especialidad: null },
  { id: "e9ce48a2-a6a2-4439-80be-0c8f238615b8", nombre: "Carlos Alberto", apellido: "Rodríguez Pérez", sede_id: 1, especialidad: null },
  { id: "b0a60bb6-4d95-43f0-aeed-17ca48f54ba7", nombre: "Carlos Alberto José María", apellido: "Mendoza Cordero", sede_id: 2, especialidad: null },
  { id: "c6782160-a277-4576-9fa7-272ba059cc72", nombre: "Santiago David", apellido: "Castro Ruiz", sede_id: 2, especialidad: null },
  { id: "f6eacfbe-57d9-4820-9c54-6d953c66bd86", nombre: "José María Alejandro", apellido: "Romero Flores", sede_id: 2, especialidad: null },
];

export function doctoresMockDeSede(sedeId: string | number, excludeUserId?: string) {
  return DOCTORES_MOCK.filter((d) => String(d.sede_id) === String(sedeId) && d.id !== excludeUserId).map((d) => ({
    id: d.id,
    nombre: d.nombre,
    apellido: d.apellido,
    especialidad: d.especialidad,
  }));
}
