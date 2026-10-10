"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { resolveOrCrearHistoriaClinica } from "./historia.helpers";
import { randomUUID } from "crypto";

export async function getPreviewPacienteAction(pacienteId: string) {
  const supabase = await createClient();
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("sexo, grupo_sanguineo, telefono, alergias")
    .eq("id", pacienteId)
    .single();

  if (paciente) {
    let alergiasArr: string[] = [];
    if (Array.isArray(paciente.alergias)) {
      alergiasArr = paciente.alergias;
    } else if (typeof paciente.alergias === "string") {
      try { alergiasArr = JSON.parse(paciente.alergias); } catch { /* ignore */ }
    }
    paciente.alergias = alergiasArr as any;
  }

  return { paciente };
}

export async function getDoctorPacientesAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // 1. Obtener rol y sede del usuario
  const { data: usuarioData } = await supabase
    .from("usuarios")
    .select("rol_id, sede_id, rol ( rol )")
    .eq("id", user.id)
    .single();

  const rolRaw = usuarioData?.rol as any;
  const rolName = (Array.isArray(rolRaw) ? rolRaw[0]?.rol : rolRaw?.rol) || "";
  const isDoctorAdmin = usuarioData?.rol_id === 6 || rolName === "doctor_admin";
  const isAdmin = usuarioData?.rol_id === 2 || usuarioData?.rol_id === 3 || rolName === "admin" || rolName === "superadmin";

  let rawList: any[] | null = null;

  // Si es un doctor regular (no admin ni doctor_admin), intentar la RPC de resumen
  if (!isDoctorAdmin && !isAdmin) {
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc("get_doctor_pacientes_summary", { p_doctor_id: user.id });

      if (!rpcError && rpcData && rpcData.length > 0) {
        rawList = rpcData;
      }
    } catch {
      // Continúa con la consulta directa si la RPC falla
    }
  }

  // Si es doctor_admin, admin, o si la RPC falló / vino vacía:
  if (!rawList) {
    try {
      let query = supabase
        .from("pacientes")
        .select(`
          id,
          nombre,
          apellido,
          dni,
          fecha_nacimiento,
          telefono,
          alergias,
          activo,
          sexo,
          grupo_sanguineo,
          sede_id,
          creado_por,
          citas (
            id,
            fecha
          )
        `);

      if ((isDoctorAdmin || isAdmin) && usuarioData?.sede_id) {
        query = query.eq("sede_id", usuarioData.sede_id);
      }

      let { data: pacs, error: pacsError } = await query;

      // Si la consulta regular con RLS fallase, asegurar acceso mediante adminClient con scope de sede
      if (pacsError || !pacs) {
        const adminClient = getAdminClient();
        let adminQuery = adminClient
          .from("pacientes")
          .select(`
            id,
            nombre,
            apellido,
            dni,
            fecha_nacimiento,
            telefono,
            alergias,
            activo,
            sexo,
            grupo_sanguineo,
            sede_id,
            creado_por,
            citas (
              id,
              fecha
            )
          `);

        if (usuarioData?.sede_id) {
          adminQuery = adminQuery.eq("sede_id", usuarioData.sede_id);
        } else if (!isDoctorAdmin && !isAdmin) {
          adminQuery = adminQuery.eq("creado_por", user.id);
        }

        const adminRes = await adminQuery;
        pacs = adminRes.data;
      }

      if (pacs) {
        rawList = pacs.map((p: any) => {
          const citas = p.citas || [];
          const totalCitas = citas.length;
          let ultimaVisita: string | null = null;
          if (citas.length > 0) {
            const sorted = [...citas].sort((a: any, b: any) => (b.fecha > a.fecha ? 1 : -1));
            ultimaVisita = sorted[0]?.fecha || null;
          }

          return {
            id: p.id,
            nombre: p.nombre,
            apellido: p.apellido,
            dni: p.dni,
            fecha_nacimiento: p.fecha_nacimiento,
            telefono: p.telefono,
            alergias: p.alergias,
            activo: p.activo,
            total_citas: totalCitas,
            ultima_visita: ultimaVisita,
            sexo: p.sexo,
            grupo_sanguineo: p.grupo_sanguineo,
          };
        });

        // Ordenar por última visita descendente y luego por nombre
        rawList.sort((a, b) => {
          if (a.ultima_visita && b.ultima_visita) {
            return b.ultima_visita.localeCompare(a.ultima_visita);
          }
          if (a.ultima_visita) return -1;
          if (b.ultima_visita) return 1;
          return (a.nombre || "").localeCompare(b.nombre || "");
        });
      }
    } catch (err) {
      console.error("Error obteniendo pacientes:", err);
    }
  }

  if (!rawList) return [];

  return rawList.map((p: any) => {
    let alergiasArr: string[] = [];
    if (Array.isArray(p.alergias)) {
      alergiasArr = p.alergias;
    } else if (typeof p.alergias === "string") {
      try { alergiasArr = JSON.parse(p.alergias); } catch { /* ignore */ }
    }

    let estado = "activo";
    if (!p.activo) {
      estado = "inactivo";
    } else if (Number(p.total_citas) === 1) {
      estado = "nuevo";
    }

    return {
      id: String(p.id),
      nombre: `${p.nombre || ""} ${p.apellido || ""}`.trim(),
      dni: p.dni,
      fecha_nacimiento: p.fecha_nacimiento,
      telefono: p.telefono,
      alergias: alergiasArr,
      estado,
      ultima_visita: p.ultima_visita,
      sexo: p.sexo,
      grupo_sanguineo: p.grupo_sanguineo
    };
  });
}

export async function createPacienteAction(data: {
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  telefono: string;
  email?: string;
  sexo?: string;
  lugar_nacimiento?: string;
  raza?: string;
  direccion?: string;
  domicilio?: string;
  lugar_procedencia?: string;
  ocupacion?: string;
  religion?: string;
  grupo_sanguineo?: string;
  estado_civil?: string;
  grado_instruccion?: string;
  enfermedad_actual?: string;
  alergias?: string[];
  antecedentes?: { cronicas: string[]; medicacion_habitual: string[]; quirurgicos: string[] };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: usuarioData } = await supabase
    .from("usuarios")
    .select("sede_id")
    .eq("id", user.id)
    .single();
    
  if (!usuarioData?.sede_id) return { error: "No se pudo obtener la sede del usuario." };

  const hoy = new Date().toISOString().split("T")[0];
  if (data.fecha_nacimiento > hoy) {
    return { error: "La fecha de nacimiento no puede ser mayor a la fecha actual." };
  }

  if (data.ocupacion && data.ocupacion.trim().length > 30) {
    return { error: "El campo ocupación no puede superar los 30 caracteres." };
  }
  if (data.religion && data.religion.trim().length > 30) {
    return { error: "El campo religión no puede superar los 30 caracteres." };
  }
  if (data.raza && data.raza.trim().length > 30) {
    return { error: "El campo raza no puede superar los 30 caracteres." };
  }
  if (data.grado_instruccion && data.grado_instruccion.trim().length > 15) {
    return { error: "El grado de instrucción no puede superar los 15 caracteres." };
  }
  if (data.lugar_nacimiento && data.lugar_nacimiento.trim().length > 30) {
    return { error: "El lugar de nacimiento no puede superar los 30 caracteres." };
  }
  if (data.lugar_procedencia && data.lugar_procedencia.trim().length > 30) {
    return { error: "El lugar donde reside actualmente no puede superar los 30 caracteres." };
  }

  // Generamos el UUID en el servidor para no tener que hacer un .select("id") al final.
  // El .select() dispara la regla RLS `select_pacientes_doctor` y, como este paciente
  // es recién creado y no tiene citas asignadas, el SELECT falla arrojando el error 42501.
  const nuevoPacienteId = randomUUID();

    const { error } = await supabase.from("pacientes").insert({
    id:                nuevoPacienteId,
    sede_id:           usuarioData.sede_id,
    creado_por:        user.id,
    nombre:            data.nombre.trim(),
    apellido:          data.apellido.trim(),
    dni:               data.dni.trim(),
    fecha_nacimiento:  data.fecha_nacimiento,
    telefono:          data.telefono.trim(),
    email:             data.email             || null,
    sexo:              data.sexo              || null,
    lugar_nacimiento:  data.lugar_nacimiento  || null,
    raza:              data.raza              || null,
    direccion:         data.direccion         || null,
    domicilio:         data.domicilio         || null,
    lugar_procedencia: data.lugar_procedencia || null,
    ocupacion:         data.ocupacion         || null,
    religion:          data.religion          || null,
    grupo_sanguineo:   data.grupo_sanguineo   || null,
    estado_civil:      data.estado_civil      || null,
    grado_instruccion: data.grado_instruccion || null,
    enfermedad_actual: data.enfermedad_actual || null,
    alergias:          data.alergias          || [],
    antecedentes:      data.antecedentes      || { cronicas: [], medicacion_habitual: [], quirurgicos: [] },
    activo: true
  });

  if (error) {
    console.error("Error insertando paciente:", error);
    if (error.code === '23505') {
      return { error: "Ya existe un paciente registrado con ese DNI." };
    }
    return { error: "Ocurrió un error al guardar el paciente." };
  }

  const historia = await resolveOrCrearHistoriaClinica(
    supabase, nuevoPacienteId, data.dni.trim()
  );
  if ("error" in historia) return historia;

  revalidatePath("/pacientes");
  return { success: true, id: nuevoPacienteId, historia };
}
