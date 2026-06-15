/**
 * Servicio de citas
 *
 * Para conectar el backend: reemplaza el cuerpo de cada función
 * con la query de Supabase correspondiente (indicada en el comentario TODO).
 */

import type { Cita, EstadoCita } from "@/types/agenda";
import { CITAS_MOCK } from "@/lib/mock/citas";

// Estado interno del mock (simula persistencia en sesión)
let _mockCitas: Cita[] | null = null;
function getMock(): Cita[] {
  if (!_mockCitas) _mockCitas = CITAS_MOCK();
  return _mockCitas;
}

/** Devuelve todas las citas. */
export async function getCitas(): Promise<Cita[]> {
  // TODO(backend):
  // const { data } = await supabase
  //   .from("citas")
  //   .select(`
  //     id, fecha, hora_inicio, hora_fin, tipo_consulta, estado, notas,
  //     paciente_id,
  //     pacientes ( nombre, alergias ),
  //     personal  ( nombre )
  //   `)
  //   .order("fecha").order("hora_inicio");
  // return (data ?? []).map(row => ({
  //   id:               row.id,
  //   paciente_id:      row.paciente_id,
  //   paciente_nombre:  row.pacientes?.nombre ?? "—",
  //   alergias:         row.pacientes?.alergias ?? [],
  //   tipo_consulta:    row.tipo_consulta,
  //   doctor_nombre:    row.personal?.nombre ?? "—",
  //   fecha:            row.fecha,
  //   hora_inicio:      row.hora_inicio,
  //   hora_fin:         row.hora_fin,
  //   estado:           row.estado,
  //   notas:            row.notas,
  // }));
  return getMock();
}

/** Crea una nueva cita. */
export async function createCita(
  payload: Omit<Cita, "id">
): Promise<Cita> {
  // TODO(backend):
  // const { data } = await supabase
  //   .from("citas")
  //   .insert({ ...payload })
  //   .select()
  //   .single();
  // return data;
  const nueva: Cita = {
    ...payload,
    id: Math.random().toString(36).slice(2, 9),
  };
  getMock().unshift(nueva);
  return nueva;
}

/** Actualiza el estado de una cita. */
export async function updateCitaEstado(
  id: string,
  estado: EstadoCita
): Promise<void> {
  // TODO(backend):
  // await supabase
  //   .from("citas")
  //   .update({ estado })
  //   .eq("id", id);
  const cita = getMock().find((c) => c.id === id);
  if (cita) cita.estado = estado;
}
