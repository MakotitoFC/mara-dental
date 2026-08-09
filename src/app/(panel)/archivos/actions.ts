"use server";

import { createClient } from "@/lib/supabase/server";

export interface ArchivoGlobal {
  id: number;
  nombre_archivo: string;
  url: string;
  tipo_archivo: string;
  categoria: string;
  descripcion: string | null;
  fecha_subida: string;
  tam_bytes: number | null;
  anotaciones?: any[];
  displayUrl?: string;
  paciente_id: number | null;
  paciente_nombre: string;
  personal?: { nombre: string; apellido: string; url_firma_digital?: string | null; especialidad?: { especialidad: string } | null } | null;
}

const SELECT_BASE = `
  id, nombre_archivo, url, tipo_archivo_id, categoria, descripcion, fecha_subida, tam_bytes, anotaciones,
  personal!subido_por ( nombre, apellido, url_firma_digital, especialidad ( especialidad ) ),
  tipo_archivo ( id, tipo_archivo )
`;

function extractPaciente(row: any): { id: number; nombre: string } | null {
  const hc = row.diagnostico?.nota_clinica?.historia_clinica ?? row.consultas?.nota_clinica?.historia_clinica;
  const p = hc?.pacientes;
  if (!p) return null;
  return { id: p.id, nombre: `${p.nombre} ${p.apellido}`.trim() };
}

/** Todos los archivos clínicos de la clínica, con el paciente al que pertenece cada uno — para la vista global de Archivos. */
export async function getArchivosGlobalAction(pacienteId?: number): Promise<ArchivoGlobal[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [viaDiagnostico, viaConsulta] = await Promise.all([
    supabase.from("archivos_clinicos").select(`${SELECT_BASE},
      diagnostico!inner ( nota_clinica!inner ( historia_clinica!inner ( paciente_id, pacientes ( id, nombre, apellido ) ) ) )
    `),
    supabase.from("archivos_clinicos").select(`${SELECT_BASE},
      consultas!inner ( nota_clinica!inner ( historia_clinica!inner ( paciente_id, pacientes ( id, nombre, apellido ) ) ) )
    `),
  ]);

  const porId = new Map<number, any>();
  for (const row of [...(viaDiagnostico.data || []), ...(viaConsulta.data || [])]) {
    if (!porId.has(row.id)) porId.set(row.id, row);
  }

  let archivos = Array.from(porId.values()).map((a: any) => {
    const pac = extractPaciente(a);
    const tipoRaw = a.tipo_archivo;
    const tipo_archivo = tipoRaw && typeof tipoRaw === "object"
      ? (tipoRaw.tipo_archivo || tipoRaw.Tipo_archivo || "desconocido")
      : (typeof tipoRaw === "string" ? tipoRaw : "desconocido");
    return {
      id: a.id,
      nombre_archivo: a.nombre_archivo,
      url: a.url,
      tipo_archivo,
      categoria: a.categoria,
      descripcion: a.descripcion,
      fecha_subida: a.fecha_subida,
      tam_bytes: a.tam_bytes,
      anotaciones: a.anotaciones,
      personal: a.personal,
      paciente_id: pac?.id ?? null,
      paciente_nombre: pac?.nombre ?? "—",
    };
  });

  if (pacienteId) archivos = archivos.filter((a) => a.paciente_id === pacienteId);

  archivos.sort((a, b) => new Date(b.fecha_subida).getTime() - new Date(a.fecha_subida).getTime());

  return Promise.all(
    archivos.map(async (a) => {
      if (a.url && !a.url.startsWith("http")) {
        const { data: signed } = await supabase.storage.from("archivos_clinicos").createSignedUrl(a.url, 60 * 60);
        return { ...a, displayUrl: signed?.signedUrl || a.url };
      }
      return { ...a, displayUrl: a.url };
    }),
  );
}
