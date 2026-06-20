"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOdontogramasAction(pacienteId: string) {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from("odontograma")
    .select(`
      id, created_at, notas_generales, tipo_tratamiento,
      personal(nombre, apellido),
      odontograma_diente(id, diente, condicion, superficie, descripcion)
    `)
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: false });

  if (error || !records) return [];

  return records.map(record => {
    // Agrupar odontograma_diente por diente y descripcion para simular los envíos en lote
    const grouped = new Map<string, any>();
    for (const d of record.odontograma_diente || []) {
      const key = `${d.diente}_${d.descripcion || ""}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: String(d.id), // ID base (para el map de React key)
          db_ids: [],
          toothNumber: Number(d.diente),
          isAll: false,
          surfaceConditions: [],
          observaciones: d.descripcion || ""
        });
      }
      
      const g = grouped.get(key)!;
      if (!g.db_ids.includes(d.id)) g.db_ids.push(d.id);

      if (d.superficie === "diente completo") {
         g.isAll = true;
         g.allConvention = d.condicion;
      } else {
         // Asegurar que no hayan duplicados de superficie en el grupo
         if (!g.surfaceConditions.find((s: any) => s.surface === d.superficie)) {
           g.surfaceConditions.push({ surface: d.superficie, convention: d.condicion });
         }
      }
    }

    const findings = Array.from(grouped.values());

    return {
      id: String(record.id),
      fecha: record.created_at.split("T")[0],
      tipo: "Evaluación Odontológica",
      dentista: record.personal ? `Dr. ${record.personal.nombre} ${record.personal.apellido}` : "Doctor",
      service: record.tipo_tratamiento,
      findings
    };
  });
}

export async function addFindingAction(data: {
  paciente_id: number;
  tipo_tratamiento: string;
  diente: number;
  isAll: boolean;
  allConvention?: string;
  surfaceConditions: { surface: string; convention: string }[];
  observaciones: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };
  
  const { data: personal } = await supabase.from("personal").select("id").eq("usuario_id", user.id).single();
  if (!personal) return { error: "Doctor no encontrado" };

  const today = new Date().toISOString().split("T")[0];
  
  const { data: existingOdon } = await supabase
    .from("odontograma")
    .select("id")
    .eq("paciente_id", data.paciente_id)
    .eq("doctor_id", personal.id)
    .eq("tipo_tratamiento", data.tipo_tratamiento)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .limit(1)
    .maybeSingle();

  let odontograma_id;
  if (existingOdon) {
    odontograma_id = existingOdon.id;
  } else {
    const { data: newOdon, error: err } = await supabase.from("odontograma").insert({
      paciente_id: data.paciente_id, 
      doctor_id: personal.id, 
      tipo_tratamiento: data.tipo_tratamiento
    }).select("id").single();
    if (err) return { error: err.message };
    odontograma_id = newOdon.id;
  }

  const inserts = [];
  if (data.isAll) {
    inserts.push({
      odontograma_id, 
      diente: String(data.diente),
      condicion: data.allConvention,
      superficie: "diente completo",
      descripcion: data.observaciones
    });
  } else {
    for (const sc of data.surfaceConditions) {
      inserts.push({
        odontograma_id, 
        diente: String(data.diente),
        condicion: sc.convention,
        superficie: sc.surface,
        descripcion: data.observaciones
      });
    }
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from("odontograma_diente").insert(inserts);
    if (insErr) return { error: insErr.message };
  }

  return { success: true };
}

export async function updateFindingAction(db_ids: number[], observaciones: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("odontograma_diente")
    .update({ descripcion: observaciones })
    .in("id", db_ids);
    
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteFindingAction(db_ids: number[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("odontograma_diente")
    .delete()
    .in("id", db_ids);
    
  if (error) return { error: error.message };
  return { success: true };
}
