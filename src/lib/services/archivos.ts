/**
 * Servicio de archivos clínicos
 *
 * Para conectar el backend: reemplaza el cuerpo de cada función
 * con la query de Supabase correspondiente (indicada en el comentario TODO).
 */

import type { Archivo } from "@/types/archivo";
import { ARCHIVOS_MOCK } from "@/lib/mock-archivos";

// Estado interno del mock (simula persistencia en sesión)
const _mock: Archivo[] = [...ARCHIVOS_MOCK];

/** Devuelve todos los archivos (filtrable por paciente). */
export async function getArchivos(pacienteId?: string): Promise<Archivo[]> {
  // TODO(backend):
  // let query = supabase
  //   .from("archivos_clinicos")
  //   .select(`
  //     id, nombre_archivo, tipo_archivo, categoria,
  //     fecha_subida, descripcion, tamaño_bytes, url,
  //     diagnostico_id,
  //     personal ( nombre ),
  //     diagnosticos ( historia_clinica_id,
  //       historias_clinicas ( paciente_id,
  //         pacientes ( nombre )
  //       )
  //     )
  //   `)
  //   .order("fecha_subida", { ascending: false });
  //
  // if (pacienteId) {
  //   query = query.eq("diagnosticos.historias_clinicas.paciente_id", pacienteId);
  // }
  //
  // const { data } = await query;
  // return (data ?? []).map(row => ({
  //   id:               row.id,
  //   paciente_id:      row.diagnosticos?.historias_clinicas?.paciente_id ?? "",
  //   paciente_nombre:  row.diagnosticos?.historias_clinicas?.pacientes?.nombre ?? "—",
  //   tipo:             row.tipo_archivo,
  //   nombre:           row.nombre_archivo,
  //   categoria:        row.categoria,
  //   fecha:            row.fecha_subida,
  //   doctor_nombre:    row.personal?.nombre ?? "—",
  //   descripcion:      row.descripcion,
  //   tamanio_bytes:    row.tamaño_bytes,
  //   url:              row.url,
  //   es_imagen:        ["foto_intraoral","foto_extraoral","radiografia_periapical","radiografia_panoramica","tomografia"].includes(row.tipo_archivo),
  // }));
  if (pacienteId) return _mock.filter((a) => a.paciente_id === pacienteId).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return [..._mock].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Sube un nuevo archivo clínico. */
export async function createArchivo(
  payload: Omit<Archivo, "id" | "preview_url">
): Promise<Archivo> {
  // TODO(backend):
  // 1. Subir el File al Storage de Supabase:
  //    const { data: storageData } = await supabase.storage
  //      .from("archivos-clinicos")
  //      .upload(`${paciente_id}/${filename}`, file);
  //
  // 2. Insertar el registro en archivos_clinicos:
  //    const { data } = await supabase
  //      .from("archivos_clinicos")
  //      .insert({
  //        nombre_archivo: payload.nombre,
  //        tipo_archivo:   payload.tipo,
  //        categoria:      payload.categoria,
  //        fecha_subida:   payload.fecha,
  //        descripcion:    payload.descripcion,
  //        tamaño_bytes:   payload.tamanio_bytes,
  //        url:            storageData?.path,
  //        subido_por:     /* personal_id del usuario autenticado */,
  //        diagnostico_id: /* id del diagnóstico activo del paciente */,
  //      })
  //      .select()
  //      .single();
  // return { ...payload, id: data.id, url: data.url };
  const nuevo: Archivo = {
    ...payload,
    id: "a" + Math.random().toString(36).slice(2, 9),
  };
  _mock.unshift(nuevo);
  return nuevo;
}
