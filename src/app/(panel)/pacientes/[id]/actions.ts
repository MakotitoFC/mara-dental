"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDetallePacienteAction(pacienteId: string) {
  const supabase = await createClient();

  // 1. Obtener paciente
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", pacienteId)
    .single();

  if (!paciente) return null;

  // 2. Obtener citas
  const { data: citas } = await supabase
    .from("citas")
    .select(`
      id,
      fecha,
      hora_inicio,
      tipo_consulta,
      estado,
      personal ( nombre, apellido )
    `)
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false });

  // 3. Obtener consultas (notas clínicas)
  const { data: consultas } = await supabase
    .from("consultas")
    .select(`
      id,
      fecha_consulta,
      motivo,
      observaciones,
      examen_fisico,
      personal ( nombre, apellido ),
      historia_clinica!inner ( paciente_id )
    `)
    .eq("historia_clinica.paciente_id", pacienteId)
    .order("fecha_consulta", { ascending: false });

  // Procesar para la vista
  // Convierte cualquier valor (string, object JSONB, array) a string seguro para React
  function toStr(val: unknown): string | undefined {
    if (val == null || val === "") return undefined;
    if (typeof val === "string") return val || undefined;
    if (Array.isArray(val)) return val.map(v => toStr(v)).filter(Boolean).join(", ") || undefined;
    if (typeof val === "object") {
      const values = Object.values(val as Record<string, unknown>).map(v => toStr(v)).filter(Boolean);
      return values.join(" · ") || undefined;
    }
    return String(val) || undefined;
  }

  // Convierte campo array/JSONB a array de strings
  function toStringArray(val: unknown): string[] {
    if (Array.isArray(val)) {
      return val.map(item => toStr(item)).filter((s): s is string => Boolean(s));
    }
    if (typeof val === "string") {
      try {
        const p = JSON.parse(val);
        if (Array.isArray(p)) return p.map(item => toStr(item)).filter((s): s is string => Boolean(s));
        if (typeof p === "object" && p !== null) {
          // {enfermedad: true/false} → solo claves con true
          return Object.entries(p as Record<string, unknown>)
            .filter(([, v]) => v === true)
            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
        }
        return [val];
      } catch { return [val]; }
    }
    if (typeof val === "object" && val !== null) {
      const entries = Object.entries(val as Record<string, unknown>);
      // {enfermedad: true/false} → solo claves con true
      if (entries.every(([, v]) => typeof v === "boolean")) {
        return entries
          .filter(([, v]) => v === true)
          .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
      }
      // Otro tipo de objeto JSONB → tratar cada valor como string
      return entries.map(([, v]) => toStr(v)).filter((s): s is string => Boolean(s));
    }
    return [];
  }

  // Antecedentes patológicos enriquecidos: { cronicas, medicacion_habitual, quirurgicos }
  // Compatible con datos antiguos (lista plana o {enf:true} → se vuelcan a 'cronicas')
  function parseAntecedentes(val: unknown): { cronicas: string[]; medicacion_habitual: string[]; quirurgicos: string[] } {
    let obj: any = val;
    if (typeof val === "string") { try { obj = JSON.parse(val); } catch { obj = [val]; } }
    const arr = (v: unknown) => toStringArray(v);
    if (obj && typeof obj === "object" && !Array.isArray(obj) &&
        ("cronicas" in obj || "medicacion_habitual" in obj || "quirurgicos" in obj)) {
      return {
        cronicas: arr(obj.cronicas),
        medicacion_habitual: arr(obj.medicacion_habitual),
        quirurgicos: arr(obj.quirurgicos),
      };
    }
    // Formato antiguo → todo a crónicas
    return { cronicas: toStringArray(obj), medicacion_habitual: [], quirurgicos: [] };
  }

  const alergiasArr = toStringArray(paciente.alergias);
  const antArr      = toStringArray(paciente.antecedentes);
  const antEstruct  = parseAntecedentes(paciente.antecedentes);

  // Parsear jsonb de examen_fisico donde metemos tratamiento y medicacion del mock
  const notasMap = (consultas || []).map((c: any) => {
    let tr = undefined;
    let med = undefined;
    let type = "consulta";
    if (c.examen_fisico) {
      tr = c.examen_fisico.tratamiento;
      med = c.examen_fisico.medicacion;
      type = c.examen_fisico.tipo || "consulta";
    }
    const drName = c.personal ? `${c.personal.nombre} ${c.personal.apellido}`.trim() : "Doctor";
    return {
      id: String(c.id),
      fecha: c.fecha_consulta || "",
      doctor_nombre: drName,
      motivo: c.motivo || "",
      tipo: type, // Guardado en el jsonb en createNotaClinicaAction
      observaciones: c.observaciones || undefined,
      tratamiento: tr,
      medicacion: med
    };
  });

  const citasMap = (citas || []).map((c: any) => {
    const drName = c.personal ? `${c.personal.nombre} ${c.personal.apellido}`.trim() : "Doctor";
    return {
      id: String(c.id),
      fecha: c.fecha,
      hora: c.hora_inicio,
      servicio: c.tipo_consulta || "Consulta general",
      estado: c.estado,
      medico: drName
    };
  });

  const pFinal = {
    id: String(paciente.id),
    nombre:            toStr(paciente.nombre)             ?? "",
    apellido:          toStr(paciente.apellido),
    dni:               toStr(paciente.dni)                ?? "",
    fecha_nacimiento:  toStr(paciente.fecha_nacimiento),
    sexo:              toStr(paciente.sexo),
    lugar_nacimiento:  toStr(paciente.lugar_nacimiento),
    raza:              toStr(paciente.raza),
    telefono:          toStr(paciente.telefono)           ?? "",
    email:             toStr(paciente.email),
    direccion:         toStr(paciente.direccion),
    domicilio:         toStr(paciente.domicilio),
    lugar_procedencia: toStr(paciente.lugar_procedencia),
    ocupacion:         toStr(paciente.ocupacion),
    grado_instruccion: toStr(paciente.grado_instruccion),
    estado_civil:      toStr(paciente.estado_civil),
    religion:          toStr(paciente.religion),
    enfermedad_actual: toStr(paciente.enfermedad_actual),
    grupo_sanguineo:   toStr(paciente.grupo_sanguineo),
    alergias:          alergiasArr,
    antecedentes:      antArr,
    antecedentes_estructurados: antEstruct,
    activo:            paciente.activo,
    ultima_visita:     citasMap.length > 0 ? citasMap[0].fecha : undefined,
    proxima_cita:      citasMap.find((c: any) => c.estado === 'programada' || c.estado === 'confirmada')?.fecha
  };

  return {
    paciente: pFinal,
    citas: citasMap,
    notas: notasMap
  };
}

export async function crearNotaClinicaAction(pacienteId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "No autorizado" };

  const { data: personal } = await supabase
    .from("personal")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (!personal) return { error: "Perfil de doctor no encontrado" };

  // 1. Obtener/Crear Historia Clínica
  let { data: hc } = await supabase
    .from("historia_clinica")
    .select("id")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (!hc) {
    // Necesitamos paciente para iniciales y fecha_nacimiento
    const { data: paciente } = await supabase
      .from("pacientes")
      .select("nombre, apellido, fecha_nacimiento")
      .eq("id", pacienteId)
      .single();

    if (!paciente) return { error: "Paciente no encontrado" };

    // Construir base del código: 4 iniciales + YYMMDD
    const full = `${paciente.nombre} ${paciente.apellido}`.trim().split(/\s+/);
    let inits = full.map(w => w[0].toUpperCase()).join("");
    if (inits.length < 4) inits = inits.padEnd(4, "X");
    inits = inits.substring(0, 4);

    const f = paciente.fecha_nacimiento; // YYYY-MM-DD
    const yymmdd = f.substring(2, 4) + f.substring(5, 7) + f.substring(8, 10);
    const prefix = `${inits}${yymmdd}`; // 10 chars

    // Buscar en BD el máximo correlativo
    const { data: existentes } = await supabase
      .from("historia_clinica")
      .select("codigo_historia")
      .like("codigo_historia", `${prefix}%`)
      .order("codigo_historia", { ascending: false })
      .limit(1);

    let num = 0;
    if (existentes && existentes.length > 0) {
      const highest = existentes[0].codigo_historia;
      const parsedNum = parseInt(highest.substring(10), 10);
      if (!isNaN(parsedNum)) {
        num = parsedNum + 1;
      }
    }

    const codigo_historia = `${prefix}${String(num).padStart(3, "0")}`; // 13 chars (4 + 6 + 3)

    // Es uuid, supabase lo auto-genera si usamos uuid_generate_v4(), o insertamos sin id
    // Para postgres UUID, dejamos que Supabase asigne el ID si lo soporta. Pero el schema de BD.md dice:
    // "id" uuid PRIMARY KEY. No dice DEFAULT uuid_generate_v4(). 
    // Así que lo proveeremos por código.
    const newId = crypto.randomUUID();
    const insertRes = await supabase
      .from("historia_clinica")
      .insert({
         id: newId,
         paciente_id: parseInt(pacienteId, 10),
         codigo_historia
      })
      .select("id")
      .single();

    if (insertRes.error) {
       console.error("Error creando historia:", insertRes.error);
       return { error: "No se pudo crear la historia clínica." };
    }
    hc = insertRes.data;
  }

  // 1.5 Buscar Cita del Día
  const hoyStr = new Date().toLocaleDateString("en-CA"); // Formato YYYY-MM-DD
  const { data: citasHoy } = await supabase
    .from("citas")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("doctor_id", personal.id)
    .eq("fecha", hoyStr)
    .in("estado", ["programada", "confirmada"])
    .order("hora_inicio", { ascending: true })
    .limit(1);

  const cita_id = citasHoy && citasHoy.length > 0 ? citasHoy[0].id : null;

  // 2. Insertar Consulta
  const { data: nuevaConsulta, error } = await supabase.from("consultas").insert({
    id_historia_clinica: hc.id,
    doctor_id: personal.id,
    cita_id,
    fecha_consulta: new Date().toISOString(),
    motivo: data.motivo,
    observaciones: data.observaciones || null,
    examen_fisico: data.examen_fisico || {}
  }).select("id").single();

  if (error) {
    console.error("Error insertando consulta:", error);
    return { error: "No se pudo guardar la nota." };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  return { success: true, consultaId: nuevaConsulta?.id };
}

// Inicia una consulta vacía y devuelve su id para entrar directo al wizard de atención
export async function iniciarConsultaAction(pacienteId: string) {
  const res = await crearNotaClinicaAction(pacienteId, { motivo: "", observaciones: undefined, examen_fisico: undefined });
  if ((res as any)?.error) return res;
  return { success: true, consultaId: (res as any).consultaId };
}

// ─── Historial de consultas (vista completa por consulta) ─────────────────────

export async function getHistorialConsultasAction(pacienteId: string) {
  const supabase = await createClient();
  const pid = Number(pacienteId);

  const [consultasRes, presupuestosRes] = await Promise.all([
    supabase
      .from("consultas")
      .select(`
        id, fecha_consulta, motivo, observaciones, examen_fisico,
        personal ( nombre, apellido ),
        historia_clinica!inner ( paciente_id ),
        diagnostico!diagnostico_consulta_origen_id_fkey (
          id, diagnostico, es_definitivo, es_tratado,
          cie10 ( codigo, descripcion ),
          tratamiento ( id, notas, catalogo_tratamientos ( nombre, precio, moneda ) ),
          plan_trabajo ( id, etapa, descripcion, estado, tiempo_pronostico ),
          recetas ( id, estado, fecha_emision, receta_medicamento ( medicamento_nombre, dosis, frecuencia, indicaciones ) )
        )
      `)
      .eq("historia_clinica.paciente_id", pid)
      .order("fecha_consulta", { ascending: false }),
    supabase
      .from("presupuestos")
      .select(`id, fecha_emision, total_bruto, descuento_monto, estado,
        detalle_presupuesto ( cantidad, subtotal, catalogo_tratamientos ( nombre ) ),
        pagos ( monto, estado )`)
      .eq("paciente_id", pid),
  ]);

  // Presupuestos indexados por día (se asocian a la consulta del mismo día)
  const presuPorDia = new Map<string, any[]>();
  for (const p of presupuestosRes.data || []) {
    const dia = (p.fecha_emision || "").split("T")[0];
    const neto = Number(p.total_bruto) - Number(p.descuento_monto || 0);
    const pagado = ((p as any).pagos || []).filter((x: any) => x.estado !== "anulado").reduce((a: number, x: any) => a + Number(x.monto), 0);
    const item = {
      id: p.id,
      estado: p.estado,
      neto,
      pagado,
      saldo: neto - pagado,
      items: ((p as any).detalle_presupuesto || []).map((d: any) => ({
        nombre: d.catalogo_tratamientos?.nombre ?? "Ítem",
        cantidad: d.cantidad,
        subtotal: Number(d.subtotal),
      })),
    };
    if (!presuPorDia.has(dia)) presuPorDia.set(dia, []);
    presuPorDia.get(dia)!.push(item);
  }

  return (consultasRes.data || []).map((c: any) => {
    const dr = c.personal ? `Dr. ${c.personal.nombre} ${c.personal.apellido}`.trim() : "Doctor";
    const dia = (c.fecha_consulta || "").split("T")[0];
    const examen = Object.entries(c.examen_fisico || {}).filter(([k]) => k !== "tipo").map(([k, v]) => ({ clave: k, valor: String(v) }));

    const diagnosticos = (c.diagnostico || []).map((d: any) => ({
      id: d.id,
      texto: d.diagnostico,
      es_definitivo: d.es_definitivo,
      es_tratado: d.es_tratado,
      cie10: d.cie10 ? { codigo: d.cie10.codigo, descripcion: d.cie10.descripcion } : null,
      tratamientos: (d.tratamiento || []).map((t: any) => ({
        id: t.id,
        notas: t.notas,
        nombre: t.catalogo_tratamientos?.nombre ?? "Tratamiento",
        precio: Number(t.catalogo_tratamientos?.precio) || 0,
        moneda: t.catalogo_tratamientos?.moneda ?? "PEN",
      })),
      plan: (d.plan_trabajo || []).map((p: any) => ({
        id: p.id, etapa: p.etapa, descripcion: p.descripcion, estado: p.estado, tiempo: p.tiempo_pronostico,
      })),
      recetas: (d.recetas || []).map((r: any) => ({
        id: r.id, estado: r.estado,
        medicamentos: (r.receta_medicamento || []).map((m: any) => ({
          nombre: m.medicamento_nombre, dosis: m.dosis, frecuencia: m.frecuencia, indicaciones: m.indicaciones,
        })),
      })),
    }));

    return {
      id: String(c.id),
      fecha: c.fecha_consulta,
      motivo: c.motivo || "Consulta",
      observaciones: c.observaciones || "",
      doctor: dr,
      examen,
      diagnosticos,
      presupuestos: presuPorDia.get(dia) || [],
    };
  });
}

// ─── Línea de tiempo clínica ──────────────────────────────────────────────────
// Feed cronológico unificado: consultas, recetas, imágenes, presupuestos, odontogramas.

export type TimelineEvent = {
  id: string;
  type: "consulta" | "receta" | "imagen" | "presupuesto" | "odontograma";
  fecha: string;          // ISO
  title: string;
  sub: string;
  doctor?: string;        // "Dr. X" cuando aplica
  meta?: any;             // datos para el detalle expandible
};

export async function getTimelineAction(pacienteId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient();
  const pid = Number(pacienteId);

  const [consultasRes, recetasRes, archivosRes, presupuestosRes, odontogramasRes] = await Promise.all([
    supabase
      .from("consultas")
      .select(`id, fecha_consulta, motivo, observaciones, examen_fisico,
        historia_clinica!inner ( paciente_id ),
        personal ( nombre, apellido )`)
      .eq("historia_clinica.paciente_id", pid),
    supabase
      .from("recetas")
      .select(`id, fecha_emision, estado,
        personal ( nombre, apellido ),
        receta_medicamento ( id, medicamento_nombre, dosis, frecuencia, indicaciones ),
        diagnostico!inner ( historia_clinica!inner ( paciente_id ) )`)
      .eq("diagnostico.historia_clinica.paciente_id", pid),
    supabase
      .from("archivos_clinicos")
      .select(`id, nombre_archivo, categoria, tipo_archivo, fecha_subida, url, anotaciones,
        diagnostico!inner ( historia_clinica!inner ( paciente_id ) )`)
      .eq("diagnostico.historia_clinica.paciente_id", pid),
    supabase
      .from("presupuestos")
      .select(`id, fecha_emision, total_bruto, descuento_monto, estado,
        detalle_presupuesto ( id, cantidad, subtotal, catalogo_tratamientos ( nombre ) ),
        pagos ( monto, estado )`)
      .eq("paciente_id", pid),
    supabase
      .from("odontograma")
      .select(`id, created_at, tipo_tratamiento, odontograma_diente ( id, diente, condicion )`)
      .eq("paciente_id", pid),
  ]);

  const events: TimelineEvent[] = [];

  for (const c of consultasRes.data || []) {
    const dr = (c as any).personal ? `Dr. ${(c as any).personal.nombre} ${(c as any).personal.apellido}`.trim() : "Doctor";
    const examen = (c as any).examen_fisico || {};
    const hallazgos = Object.keys(examen).filter(k => k !== "tipo").length;
    events.push({
      id: `consulta-${c.id}`,
      type: "consulta",
      fecha: c.fecha_consulta || new Date().toISOString(),
      title: c.motivo || "Consulta",
      sub: dr,
      doctor: dr,
      meta: {
        consultaId: c.id,
        observaciones: (c as any).observaciones || "",
        hallazgos,
        examen,
      },
    });
  }

  for (const r of recetasRes.data || []) {
    const meds = (r as any).receta_medicamento || [];
    const dr = (r as any).personal ? `Dr. ${(r as any).personal.nombre} ${(r as any).personal.apellido}`.trim() : undefined;
    events.push({
      id: `receta-${r.id}`,
      type: "receta",
      fecha: r.fecha_emision || new Date().toISOString(),
      title: meds.length > 0 ? meds.map((m: any) => m.medicamento_nombre).filter(Boolean).slice(0, 2).join(" · ") : "Receta",
      sub: `${meds.length} medicamento${meds.length !== 1 ? "s" : ""} · ${r.estado}`,
      doctor: dr,
      meta: { recetaId: r.id, estado: r.estado, medicamentos: meds },
    });
  }

  const archivosSigned = await Promise.all((archivosRes.data || []).map(async (a: any) => {
    let displayUrl = a.url;
    if (a.url && !String(a.url).startsWith("http")) {
      const { data: signed } = await supabase.storage.from("archivos_clinicos").createSignedUrl(a.url, 60 * 60);
      displayUrl = signed?.signedUrl || a.url;
    }
    return { ...a, displayUrl };
  }));

  for (const a of archivosSigned) {
    const isImg = a.tipo_archivo === "imagen" || /\.(jpg|jpeg|png|webp|gif)$/i.test(a.nombre_archivo || "");
    events.push({
      id: `imagen-${a.id}`,
      type: "imagen",
      fecha: a.fecha_subida || new Date().toISOString(),
      title: a.nombre_archivo || "Imagen clínica",
      sub: `${a.categoria || "archivo"}${isImg ? "" : " · PDF"}${(a.anotaciones?.length ?? 0) > 0 ? ` · ${a.anotaciones.length} anotación(es)` : ""}`,
      meta: {
        archivoId: a.id,
        nombre_archivo: a.nombre_archivo,
        categoria: a.categoria,
        tipo: a.tipo_archivo,
        url: a.url,
        displayUrl: a.displayUrl,
        anotaciones: a.anotaciones || [],
        isImg,
      },
    });
  }

  for (const p of presupuestosRes.data || []) {
    const neto = Number((p as any).total_bruto) - Number((p as any).descuento_monto || 0);
    const pagos = ((p as any).pagos || []).filter((x: any) => x.estado !== "anulado");
    const pagado = pagos.reduce((acc: number, x: any) => acc + Number(x.monto), 0);
    const saldo = neto - pagado;
    const items = ((p as any).detalle_presupuesto || []).map((d: any) => ({
      nombre: d.catalogo_tratamientos?.nombre ?? "Ítem",
      cantidad: d.cantidad,
      subtotal: Number(d.subtotal),
    }));
    events.push({
      id: `presupuesto-${p.id}`,
      type: "presupuesto",
      fecha: (p as any).fecha_emision || new Date().toISOString(),
      title: `S/ ${neto.toFixed(2)}`,
      sub: saldo > 0 ? `${(p as any).estado} · saldo S/ ${saldo.toFixed(2)}` : `${(p as any).estado} · pagado`,
      meta: { presupuestoId: p.id, estado: (p as any).estado, neto, pagado, saldo, items },
    });
  }

  for (const o of odontogramasRes.data || []) {
    const dientes = (o as any).odontograma_diente || [];
    const piezas = new Set(dientes.map((d: any) => d.diente)).size;
    events.push({
      id: `odontograma-${o.id}`,
      type: "odontograma",
      fecha: (o as any).created_at || new Date().toISOString(),
      title: `${piezas} pieza${piezas !== 1 ? "s" : ""} marcada${piezas !== 1 ? "s" : ""}`,
      sub: (o as any).tipo_tratamiento || "evaluación odontológica",
      meta: { odontogramaId: o.id, hallazgos: dientes.map((d: any) => ({ diente: d.diente, condicion: d.condicion })) },
    });
  }

  events.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  return events;
}
