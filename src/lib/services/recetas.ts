/**
 * Servicio de recetas
 *
 * Para conectar el backend: reemplaza el cuerpo de cada función
 * con la query de Supabase correspondiente (indicada en el comentario TODO).
 */

import type { Receta } from "@/types/receta";

// Mock inline (RecetaTab genera sus propias recetas de prueba internamente hoy)
const _mock: Receta[] = [];

/** Devuelve las recetas de un paciente, ordenadas por fecha desc. */
export async function getRecetasPaciente(pacienteId: string): Promise<Receta[]> {
  // TODO(backend):
  // const { data } = await supabase
  //   .from("recetas")
  //   .select(`
  //     id, fecha_emision, estado,
  //     paciente_id,
  //     pacientes ( nombre ),
  //     personal  ( nombre ),
  //     diagnosticos ( diagnostico_texto: ... ),
  //     receta_medicamento (
  //       id, medicamento_nombre, dosis, frecuencia, indicaciones
  //     )
  //   `)
  //   .eq("paciente_id", pacienteId)
  //   .order("fecha_emision", { ascending: false });
  //
  // return (data ?? []).map(row => ({
  //   id:                row.id,
  //   paciente_id:       row.paciente_id,
  //   paciente_nombre:   row.pacientes?.nombre ?? "—",
  //   doctor_nombre:     row.personal?.nombre  ?? "—",
  //   fecha:             row.fecha_emision,
  //   diagnostico_texto: row.diagnosticos?.descripcion ?? "",
  //   estado:            row.estado,
  //   medicamentos:      (row.receta_medicamento ?? []).map(m => ({
  //     id:          m.id,
  //     nombre:      m.medicamento_nombre,
  //     dosis:       m.dosis,
  //     frecuencia:  m.frecuencia,
  //     indicaciones: m.indicaciones,
  //   })),
  // }));
  return _mock.filter((r) => r.paciente_id === pacienteId);
}

/** Crea una nueva receta con sus medicamentos. */
export async function createReceta(
  payload: Omit<Receta, "id">
): Promise<Receta> {
  // TODO(backend):
  // 1. Insertar receta:
  //    const { data: receta } = await supabase
  //      .from("recetas")
  //      .insert({
  //        paciente_id:    payload.paciente_id,
  //        personal_id:    /* id del usuario autenticado */,
  //        diagnostico_id: /* id del diagnóstico activo */,
  //        fecha_emision:  payload.fecha,
  //        estado:         payload.estado,
  //      })
  //      .select()
  //      .single();
  //
  // 2. Insertar medicamentos:
  //    await supabase
  //      .from("receta_medicamento")
  //      .insert(
  //        payload.medicamentos.map(m => ({
  //          receta_id:         receta.id,
  //          medicamento_nombre: m.nombre,
  //          dosis:             m.dosis,
  //          frecuencia:        m.frecuencia,
  //          indicaciones:      m.indicaciones,
  //        }))
  //      );
  // return { ...payload, id: receta.id };
  const nueva: Receta = {
    ...payload,
    id: "r" + Math.random().toString(36).slice(2, 9),
  };
  _mock.unshift(nueva);
  return nueva;
}
