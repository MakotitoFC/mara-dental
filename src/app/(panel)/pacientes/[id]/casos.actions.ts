"use server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getCasosClinicosAction(pacienteId: string) {
  const supabase = await createClient();

  // 1. Obtener la historia clínica
  const { data: hc } = await supabase
    .from("historia_clinica")
    .select("id, codigo_historia, fecha_creacion, estado")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (!hc) return { historia_clinica: null, casos: [] };

  // 2. Obtener las notas clínicas (casos)
  const { data: notas } = await supabase
    .from("nota_clinica")
    .select("id, titulo_caso_clinico, estado, created_at, updated_at")
    .eq("historia_clinica_id", hc.id)
    .order("created_at", { ascending: false });

  if (!notas || notas.length === 0) return { historia_clinica: hc, casos: [] };

  const notaIds = notas.map(n => n.id);

  // 3. Obtener consultas asociadas
  const { data: consultas } = await supabase
    .from("consultas")
    .select(`
      id, nota_clinica_id, fecha_consulta, motivo, observaciones, tipo_consulta_id,
      usuarios!consultas_doctor_id_fkey ( personal ( nombre, apellido ) )
    `)
    .in("nota_clinica_id", notaIds)
    .order("fecha_consulta", { ascending: false });

  // Agrupar consultas por nota clínica
  const consultasPorNota = new Map<string, any[]>();
  for (const c of consultas || []) {
    if (!consultasPorNota.has(c.nota_clinica_id)) {
      consultasPorNota.set(c.nota_clinica_id, []);
    }
    const per = (c.usuarios as any)?.personal?.[0] || (c.usuarios as any)?.personal;
    const doctor = per ? `Dr. ${per.nombre} ${per.apellido}` : "Doctor";
    
    consultasPorNota.get(c.nota_clinica_id)!.push({
      ...c,
      doctor
    });
  }

  // Estructurar los casos
  const casos = notas.map(n => {
    const cons = consultasPorNota.get(n.id) || [];
    // Usar el título de la nota, o el motivo de la consulta más antigua si no hay título
    const motivo_principal = n.titulo_caso_clinico || (cons.length > 0 ? cons[cons.length - 1].motivo : "Caso sin motivo principal");
    
    return {
      ...n,
      consultas: cons,
      motivo_consulta: motivo_principal
    };
  });

  return {
    historia_clinica: hc,
    casos
  };
}

export async function cambiarEstadoNotaAction(notaId: string, nuevoEstado: string, pacienteId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("nota_clinica")
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq("id", notaId);

  if (error) {
    console.error("Error cambiando estado:", error);
    return { error: "No se pudo actualizar el estado" };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function crearHistoriaClinicaAction(pacienteId: string) {
  const supabase = await createClient();
  const { data: p, error: errP } = await supabase.from("pacientes")
    .select("dni")
    .eq("id", pacienteId)
    .limit(1)
    .maybeSingle();
    
  if (errP) console.error("Error obteniendo paciente para HC:", errP);
  if (!p) return { error: "Paciente no existe o no tienes permisos (RLS)" };
  
  const year = new Date().getFullYear();
  const baseDni = p.dni && p.dni.trim() !== "" ? p.dni : Date.now().toString().slice(-6);
  const codigo_historia = `HC${year}-${baseDni}`;
  
  const { error } = await supabase.from("historia_clinica").insert({
    paciente_id: pacienteId,
    codigo_historia,
    fecha_creacion: new Date().toISOString(),
    estado: "activa"
  });

  if (error) {
    console.error("Error insertando HC:", error);
    // 23505 = unique_violation
    if (error.code === '23505') {
       return { error: "La historia clínica ya existe (código duplicado)" };
    }
    return { error: "No se pudo crear historia: " + error.message };
  }
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true };
}

export async function crearCasoClinicoAction(pacienteId: string, motivo: string, tituloCaso?: string) {
  const supabase = await createClient();
  let { data: hc } = await supabase.from("historia_clinica")
    .select("id")
    .eq("paciente_id", pacienteId)
    .limit(1)
    .maybeSingle();
  
  if (!hc) {
    // Intentar crear la HC automáticamente
    const hcRes = await crearHistoriaClinicaAction(pacienteId);
    if (hcRes.error) {
      return { error: "No se pudo autogenerar la Historia Clínica: " + hcRes.error };
    }
    // Volver a consultar
    const { data: newHc } = await supabase.from("historia_clinica")
      .select("id")
      .eq("paciente_id", pacienteId)
      .limit(1)
      .maybeSingle();
      
    if (!newHc) return { error: "Error inesperado al autogenerar la Historia Clínica. Es probable que no tengas permisos (RLS)." };
    hc = newHc;
  }

  const { data: nota, error } = await supabase.from("nota_clinica").insert({
    historia_clinica_id: hc.id,
    titulo_caso_clinico: tituloCaso || motivo,
    estado: "En Consulta"
  }).select("id").single();

  if (error) return { error: "No se pudo crear el caso: " + error.message };
  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, notaId: nota.id };
}

export async function agregarConsultaAction(notaId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: tc } = await supabase.from("tipo_consulta").select("id").limit(1).single();

  const { data: consulta, error } = await supabase.from("consultas").insert({
    nota_clinica_id: notaId,
    doctor_id: user.id,
    cita_id: data.cita_id || null,
    tipo_consulta_id: data.tipo_consulta_id || tc?.id,
    motivo: data.motivo,
    observaciones: data.observaciones,
    examen_fisico: data.examen_fisico,
    fecha_consulta: data.fecha_consulta || new Date().toISOString()
  }).select("id");

  if (error) return { error: "No se pudo agregar consulta" };
  
  // Extraer el id ya sea si retorna un objeto o un arreglo
  const idValue = Array.isArray(consulta) && consulta.length > 0 ? consulta[0].id : (consulta as any)?.id;
  
  return { success: true, consultaId: String(idValue) };
}

export async function editarConsultaAction(consultaId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  // 1. Obtener la consulta y validar que exista
  const { data: consultaDb, error: errGet } = await supabase
    .from("consultas")
    .select("fecha_consulta, doctor_id")
    .eq("id", consultaId)
    .single();

  if (errGet || !consultaDb) return { error: "Consulta no encontrada" };

  // 2. Validar que la consulta sea del MISMO DÍA que hoy
  const hoy = new Date();
  const fechaConsulta = new Date(consultaDb.fecha_consulta);
  const isSameDay = hoy.getFullYear() === fechaConsulta.getFullYear() &&
                    hoy.getMonth() === fechaConsulta.getMonth() &&
                    hoy.getDate() === fechaConsulta.getDate();

  if (!isSameDay) {
    return { error: "Solo se puede editar una consulta el mismo día en que fue creada" };
  }

  // 3. Actualizar la consulta
  const { error: errUpdate } = await supabase
    .from("consultas")
    .update({
      motivo: data.motivo,
      observaciones: data.observaciones,
      examen_fisico: data.examen_fisico,
      updated_at: new Date().toISOString()
    })
    .eq("id", consultaId);

  if (errUpdate) return { error: "Error al actualizar la consulta" };

  return { success: true };
}


/** Elimina una consulta y TODAS sus dependencias (diagnósticos, tratamientos,
 * planes, recetas, odontogramas, recomendaciones, archivos y presupuestos sin pagos). */
export async function eliminarConsultaAction(consultaId: string, pacienteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const { data: usr } = await supabase
    .from("usuarios")
    .select("rol_id, sede_id, rol ( rol )")
    .eq("id", user.id)
    .single();
  const rolName = ((usr?.rol as any)?.rol || "").toLowerCase();
  const puedeEliminar = [1, 2, 3, 6].includes(usr?.rol_id) || ["doctor", "admin", "superadmin", "doctor_admin"].includes(rolName);
  if (!puedeEliminar) {
    return { error: "No tienes permisos para eliminar consultas." };
  }

  const adminClient = getAdminClient();

  const { data: consultaDb, error: cErr } = await adminClient
    .from("consultas")
    .select("id, cita_id, nota_clinica_id")
    .eq("id", consultaId)
    .maybeSingle();

  if (cErr || !consultaDb) {
    return { error: "Consulta no encontrada" };
  }

  // 1. Buscar diagnósticos originados en esta consulta
  const { data: diags } = await adminClient
    .from("diagnostico")
    .select("id")
    .eq("consulta_origen_id", consultaId);
  const diagIds = (diags || []).map((d: any) => d.id);

  // 2. Verificar si existen presupuestos vinculados con pagos confirmados
  const presIds: string[] = [];
  if (diagIds.length > 0) {
    const { data: presList } = await adminClient
      .from("presupuestos")
      .select("id, movimiento_caja(id, estado, monto)")
      .in("diagnostico_id", diagIds);

    for (const p of presList || []) {
      const pagos = (p.movimiento_caja || []).filter((m: any) => m.estado === "confirmado" && Number(m.monto) !== 0);
      if (pagos.length > 0) {
        return { error: "No se puede eliminar esta consulta porque tiene un presupuesto con pagos registrados en caja." };
      }
      presIds.push(p.id);
    }
  }

  // 3. Eliminar archivos clínicos asociados a la consulta o a sus diagnósticos
  await adminClient.from("archivos_clinicos").delete().eq("consulta_id", consultaId);
  if (diagIds.length > 0) {
    await adminClient.from("archivos_clinicos").delete().in("diagnostico_id", diagIds);
  }

  // 4. Eliminar recomendaciones de la consulta
  await adminClient.from("recomendacion").delete().eq("consulta_id", consultaId);

  // 5. Eliminar odontogramas y dientes asociados a la consulta
  const { data: odontos } = await adminClient
    .from("odontograma")
    .select("id")
    .eq("consulta_id", consultaId);
  const odontoIds = (odontos || []).map((o: any) => o.id);
  if (odontoIds.length > 0) {
    await adminClient.from("odontograma_diente").delete().in("odontograma_id", odontoIds);
    await adminClient.from("odontograma").delete().in("id", odontoIds);
  }

  // 6. Eliminar dependencias de diagnósticos: recetas, tratamientos, presupuestos y luego diagnósticos
  if (diagIds.length > 0) {
    const { data: recetas } = await adminClient
      .from("recetas")
      .select("id")
      .in("diagnostico_id", diagIds);
    const recetaIds = (recetas || []).map((r: any) => r.id);
    if (recetaIds.length > 0) {
      await adminClient.from("receta_medicamento").delete().in("receta_id", recetaIds);
      await adminClient.from("recetas").delete().in("id", recetaIds);
    }

    const { data: trats } = await adminClient
      .from("tratamiento")
      .select("id")
      .in("diagnostico_id", diagIds);
    const tratIds = (trats || []).map((t: any) => t.id);
    if (tratIds.length > 0) {
      await adminClient.from("plan_tratamiento").delete().in("tratamiento_id", tratIds);
      await adminClient.from("tratamiento").delete().in("id", tratIds);
    }

    if (presIds.length > 0) {
      await adminClient.from("cuotas").delete().in("presupuesto_id", presIds);
      await adminClient.from("detalle_presupuesto").delete().in("presupuesto_id", presIds);
      await adminClient.from("presupuestos").delete().in("id", presIds);
    }

    await adminClient.from("diagnostico").delete().in("id", diagIds);
  }

  // 7. Eliminar la consulta
  const { error: delErr } = await adminClient.from("consultas").delete().eq("id", consultaId);
  if (delErr) {
    console.error("eliminarConsultaAction error:", delErr);
    return { error: `No se pudo eliminar la consulta: ${delErr.message}` };
  }

  // 8. Si estaba asociada a una cita y no quedan otras consultas para esa cita, devolverla a 'programada'
  if (consultaDb.cita_id) {
    const { count } = await adminClient
      .from("consultas")
      .select("id", { count: "exact", head: true })
      .eq("cita_id", consultaDb.cita_id);
    if (!count || count === 0) {
      await adminClient
        .from("citas")
        .update({ estado: "programada" })
        .eq("id", consultaDb.cita_id)
        .eq("estado", "hecho");
    }
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/pagos");
  revalidatePath("/agenda");
  return { success: true };
}
