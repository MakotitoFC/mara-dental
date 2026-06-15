/**
 * Servicio de pacientes
 *
 * Cada función devuelve datos mock hoy.
 * Para conectar el backend: reemplaza el cuerpo de cada función
 * con la query de Supabase correspondiente (indicada en el comentario TODO).
 *
 * El contrato de tipos (interfaces) NO cambia — solo cambia la fuente de datos.
 */

import type { Paciente, NotaClinica } from "@/types/paciente";
import {
  PACIENTES_MOCK,
  NOTAS_MOCK,
} from "@/lib/mock-pacientes";

// ─── Pacientes ────────────────────────────────────────────────────────────────

/** Devuelve todos los pacientes. */
export async function getPacientes(): Promise<Paciente[]> {
  // TODO(backend):
  // const { data } = await supabase
  //   .from("pacientes")
  //   .select("*, citas(fecha, estado)")
  //   .order("nombre");
  // return data ?? [];
  return PACIENTES_MOCK;
}

/** Devuelve un paciente por id. */
export async function getPaciente(id: string): Promise<Paciente | undefined> {
  // TODO(backend):
  // const { data } = await supabase
  //   .from("pacientes")
  //   .select("*, citas(fecha, estado)")
  //   .eq("id", id)
  //   .single();
  // return data ?? undefined;
  return PACIENTES_MOCK.find((p) => p.id === id);
}

/** Crea un nuevo paciente. Devuelve el registro creado. */
export async function createPaciente(
  payload: Omit<Paciente, "id" | "ultima_visita" | "proxima_cita">
): Promise<Paciente> {
  // TODO(backend):
  // const { data } = await supabase
  //   .from("pacientes")
  //   .insert({ ...payload })
  //   .select()
  //   .single();
  // return data;
  const nuevo: Paciente = {
    ...payload,
    id: "p" + Math.random().toString(36).slice(2, 9),
  };
  PACIENTES_MOCK.unshift(nuevo);
  return nuevo;
}

// ─── Notas clínicas (tabla: consultas) ───────────────────────────────────────

/** Devuelve las notas clínicas de un paciente, ordenadas por fecha desc. */
export async function getNotasPaciente(pacienteId: string): Promise<NotaClinica[]> {
  // TODO(backend):
  // const { data } = await supabase
  //   .from("consultas")
  //   .select("*, personal(nombre)")
  //   .eq("historia_clinica.paciente_id", pacienteId)   // join vía historia_clinica
  //   .order("fecha_consulta", { ascending: false });
  // return (data ?? []).map(row => ({
  //   id:            row.id,
  //   paciente_id:   pacienteId,
  //   doctor_nombre: row.personal?.nombre ?? "—",
  //   fecha:         row.fecha_consulta,
  //   motivo:        row.motivo,
  //   tipo:          row.examen_fisico?.tipo ?? "consulta",
  //   observaciones: row.observaciones,
  //   tratamiento:   row.examen_fisico?.tratamiento,
  //   medicacion:    row.examen_fisico?.medicacion,
  // }));
  return NOTAS_MOCK
    .filter((n) => n.paciente_id === pacienteId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Crea una nueva nota clínica (consulta). */
export async function createNota(
  payload: Omit<NotaClinica, "id">
): Promise<NotaClinica> {
  // TODO(backend):
  // const { data } = await supabase
  //   .from("consultas")
  //   .insert({
  //     historia_clinica_id: /* resolve from paciente_id */,
  //     motivo:              payload.motivo,
  //     observaciones:       payload.observaciones,
  //     fecha_consulta:      payload.fecha,
  //     examen_fisico: {
  //       tipo:        payload.tipo,
  //       tratamiento: payload.tratamiento,
  //       medicacion:  payload.medicacion,
  //     },
  //   })
  //   .select()
  //   .single();
  const nueva: NotaClinica = {
    ...payload,
    id: "n" + Math.random().toString(36).slice(2, 9),
  };
  NOTAS_MOCK.unshift(nueva);
  return nueva;
}
