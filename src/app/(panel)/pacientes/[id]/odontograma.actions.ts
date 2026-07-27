"use server";

import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getCondicionesOdontogramaAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("condicion").select("*").order("condicion");
  if (error) {
    console.error("Error obteniendo condiciones:", error);
    return [];
  }
  return data;
}

/**
 * odontograma no referencia al paciente directo: la cadena real es
 * historia_clinica → nota_clinica → consultas/odontograma (ambas NOT NULL).
 * El registro de hallazgos solo ocurre dentro de una consulta activa (la
 * Ficha del Paciente es de solo lectura) — así que aquí simplemente
 * resolvemos el nota_clinica_id de esa consulta, sin crear nada ad-hoc.
 */
async function resolveOdontogramaContext(
  supabase: SupabaseClient,
  consultaId: string | undefined,
): Promise<{ consulta_id: string; nota_clinica_id: string } | { error: string }> {
  if (!consultaId) {
    return { error: "Los hallazgos del odontograma solo se registran dentro de una consulta activa." };
  }
  const { data: consulta } = await supabase
    .from("consultas")
    .select("id, nota_clinica_id")
    .eq("id", consultaId)
    .single();
  if (!consulta) return { error: "No se encontró la consulta activa." };
  return { consulta_id: consulta.id, nota_clinica_id: consulta.nota_clinica_id };
}

export async function getOdontogramasAction(pacienteId: string) {
  const supabase = await createClient();

  const { data: hc } = await supabase
    .from("historia_clinica")
    .select("id")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (!hc) return [];

  const { data: notas } = await supabase
    .from("nota_clinica")
    .select("id")
    .eq("historia_clinica_id", hc.id);

  const notaIds = (notas || []).map((n) => n.id);
  if (notaIds.length === 0) return [];

  const { data: records, error } = await supabase
    .from("odontograma")
    .select(`
      id, created_at, notas_generales,
      usuarios ( personal (nombre, apellido) ),
      odontograma_diente(id, diente, superficie, descripcion, condicion_id)
    `)
    .in("nota_clinica_id", notaIds)
    .order("created_at", { ascending: false });

  if (error || !records) return [];

  return records.map(record => {
    // Agrupar odontograma_diente por diente y descripcion para simular los envíos en lote
    const grouped = new Map<string, any>();
    for (const d of (record.odontograma_diente || []) as any[]) {
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

      const condicionIdStr: string = String(d.condicion_id);

      if (d.superficie === "diente completo") {
         g.isAll = true;
         g.allConvention = condicionIdStr;
      } else {
         // Asegurar que no hayan duplicados de superficie en el grupo
         if (!g.surfaceConditions.find((s: any) => s.surface === d.superficie)) {
           g.surfaceConditions.push({ surface: d.superficie, convention: condicionIdStr });
         }
      }
    }

    const findings = Array.from(grouped.values());
    const dentistaInfo = (record.usuarios as any)?.personal;

    return {
      id: String(record.id),
      fecha: record.created_at.split("T")[0],
      tipo: "Evaluación Odontológica",
      dentista: dentistaInfo ? `Dr. ${dentistaInfo.nombre} ${dentistaInfo.apellido}` : "Doctor",
      findings
    };
  });
}

export async function addFindingAction(data: {
  consulta_id?: string;
  diente: number;
  isAll: boolean;
  allConvention?: string;
  surfaceConditions: { surface: string; convention: string }[];
  observaciones: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const ctx = await resolveOdontogramaContext(supabase, data.consulta_id);
  if ("error" in ctx) return { error: ctx.error };

  const today = new Date().toISOString().split("T")[0];

  const { data: existingOdon } = await supabase
    .from("odontograma")
    .select("id")
    .eq("nota_clinica_id", ctx.nota_clinica_id)
    .eq("doctor_id", user.id)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .limit(1)
    .maybeSingle();

  let odontograma_id;
  if (existingOdon) {
    odontograma_id = existingOdon.id;
  } else {
    const { data: newOdon, error: err } = await supabase.from("odontograma").insert({
      consulta_id: ctx.consulta_id,
      nota_clinica_id: ctx.nota_clinica_id,
      doctor_id: user.id,
    }).select("id").single();
    if (err) return { error: err.message };
    odontograma_id = newOdon.id;
  }

  const inserts = [];
  if (data.isAll) {
    if (!data.allConvention) return { error: "Falta la convención" };
    inserts.push({
      odontograma_id,
      diente: String(data.diente),
      condicion_id: parseInt(data.allConvention),
      superficie: "diente completo",
      descripcion: data.observaciones
    });
  } else {
    for (const sc of data.surfaceConditions) {
      if (!sc.convention) continue;
      inserts.push({
        odontograma_id,
        diente: String(data.diente),
        condicion_id: parseInt(sc.convention),
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

export async function updateFindingAction(db_ids: string[], observaciones: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("odontograma_diente")
    .update({ descripcion: observaciones })
    .in("id", db_ids);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteFindingAction(db_ids: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("odontograma_diente")
    .delete()
    .in("id", db_ids);

  if (error) return { error: error.message };
  return { success: true };
}
