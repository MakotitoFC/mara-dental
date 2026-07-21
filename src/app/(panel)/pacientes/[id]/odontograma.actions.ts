"use server";

import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Busca el id de una condición por nombre (case-insensitive); la crea si no existe. */
async function resolveCondicionId(supabase: SupabaseClient, nombre: string): Promise<number | null> {
  const { data: existente } = await supabase
    .from("condicion")
    .select("id")
    .ilike("condicion", nombre)
    .maybeSingle();

  if (existente) return existente.id;

  const { data: creada, error } = await supabase
    .from("condicion")
    .insert({ condicion: nombre })
    .select("id")
    .single();

  if (error) {
    console.error("Error creando condición:", error);
    return null;
  }
  return creada.id;
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
  consultaId: number | undefined,
): Promise<{ consulta_id: number; nota_clinica_id: number } | { error: string }> {
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
      personal(nombre, apellido),
      odontograma_diente(id, diente, superficie, descripcion, condicion(condicion))
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

      const condicionNombre: string = d.condicion?.condicion ?? "hallazgo";

      if (d.superficie === "diente completo") {
         g.isAll = true;
         g.allConvention = condicionNombre;
      } else {
         // Asegurar que no hayan duplicados de superficie en el grupo
         if (!g.surfaceConditions.find((s: any) => s.surface === d.superficie)) {
           g.surfaceConditions.push({ surface: d.superficie, convention: condicionNombre });
         }
      }
    }

    const findings = Array.from(grouped.values());

    return {
      id: String(record.id),
      fecha: record.created_at.split("T")[0],
      tipo: "Evaluación Odontológica",
      dentista: record.personal ? `Dr. ${(record.personal as any).nombre} ${(record.personal as any).apellido}` : "Doctor",
      findings
    };
  });
}

export async function addFindingAction(data: {
  consulta_id?: number;
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

  const ctx = await resolveOdontogramaContext(supabase, data.consulta_id);
  if ("error" in ctx) return { error: ctx.error };

  const today = new Date().toISOString().split("T")[0];

  const { data: existingOdon } = await supabase
    .from("odontograma")
    .select("id")
    .eq("nota_clinica_id", ctx.nota_clinica_id)
    .eq("doctor_id", personal.id)
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
      doctor_id: personal.id,
    }).select("id").single();
    if (err) return { error: err.message };
    odontograma_id = newOdon.id;
  }

  // condicion_id es NOT NULL — resolvemos (o creamos) cada condición usada antes de insertar.
  const nombresUsados = data.isAll
    ? [data.allConvention].filter(Boolean) as string[]
    : Array.from(new Set(data.surfaceConditions.map(sc => sc.convention)));

  const condicionIds = new Map<string, number>();
  for (const nombre of nombresUsados) {
    const id = await resolveCondicionId(supabase, nombre);
    if (id === null) return { error: `No se pudo resolver la condición "${nombre}".` };
    condicionIds.set(nombre, id);
  }

  const inserts = [];
  if (data.isAll) {
    inserts.push({
      odontograma_id,
      diente: String(data.diente),
      condicion_id: condicionIds.get(data.allConvention!),
      superficie: "diente completo",
      descripcion: data.observaciones
    });
  } else {
    for (const sc of data.surfaceConditions) {
      inserts.push({
        odontograma_id,
        diente: String(data.diente),
        condicion_id: condicionIds.get(sc.convention),
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
