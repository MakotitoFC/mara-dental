"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { resolveOrCrearHistoriaClinica } from "../historia.helpers";
import { getSedeInfoAction } from "./consulta.actions";

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
      tipo_consulta_id,
      estado,
      notas,
      tipo_consulta:tipo_consulta_id ( tipo_consulta, color )
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

  // Parsear jsonb de examen_fisico donde se guardan tratamiento y medicación
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
      hora_inicio: c.hora_inicio,
      servicio: c.tipo_consulta?.tipo_consulta || "Consulta general",
      tipo_consulta: c.tipo_consulta,
      tipo_consulta_id: c.tipo_consulta_id,
      estado: c.estado,
      notas: c.notas,
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
    enfermedad_actual: toStringArray(paciente.enfermedad_actual),
    restricciones_clinicas: toStringArray(paciente.restricciones_clinicas),
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

export async function updatePacienteAction(pacienteId: string, data: {
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
  enfermedad_actual?: string[];
  restricciones_clinicas?: string[];
  alergias?: string[];
  antecedentes?: { cronicas: string[]; medicacion_habitual: string[]; quirurgicos: string[] };
}) {
  const supabase = await createClient();

  const hoy = new Date().toISOString().split("T")[0];
  if (data.fecha_nacimiento > hoy) {
    return { error: "La fecha de nacimiento no puede ser mayor a la fecha actual." };
  }

  const { data: updatedRows, error } = await supabase.from("pacientes").update({
    nombre:                 data.nombre.trim(),
    apellido:               data.apellido.trim(),
    dni:                    data.dni.trim(),
    fecha_nacimiento:       data.fecha_nacimiento,
    telefono:               data.telefono.trim(),
    email:                  data.email                  || null,
    sexo:                   data.sexo                   || null,
    lugar_nacimiento:       data.lugar_nacimiento       || null,
    raza:                   data.raza                   || null,
    direccion:              data.direccion              || null,
    domicilio:              data.domicilio              || null,
    lugar_procedencia:      data.lugar_procedencia      || null,
    ocupacion:              data.ocupacion              || null,
    religion:               data.religion               || null,
    grupo_sanguineo:        data.grupo_sanguineo        || null,
    estado_civil:           data.estado_civil           || null,
    grado_instruccion:      data.grado_instruccion      || null,
    enfermedad_actual:      data.enfermedad_actual      || [],
    restricciones_clinicas: data.restricciones_clinicas || [],
    alergias:               data.alergias               || [],
    antecedentes:           data.antecedentes           || { cronicas: [], medicacion_habitual: [], quirurgicos: [] },
  }).eq("id", pacienteId).select("id");

  if (error) {
    console.error("Error actualizando paciente:", error);
    if (error.code === '23505') {
      return { error: "Ya existe otro paciente registrado con ese DNI." };
    }
    return { error: "Ocurrió un error al guardar los cambios." };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { error: "No tienes permiso para actualizar los datos de este paciente (RLS) o el paciente no existe." };
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/pacientes");
  return { success: true };
}

export async function crearNotaClinicaAction(pacienteId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "No autorizado" };

  // No necesitamos la tabla 'personal', usamos user.id directamente

  // 1. Obtener/Crear Historia Clínica
  const { data: paciente, error: errorPaciente } = await supabase
    .from("pacientes")
    .select("nombre, apellido, fecha_nacimiento, dni")
    .eq("id", pacienteId)
    .single();

  if (errorPaciente || !paciente) {
    console.error("Error buscando paciente:", errorPaciente);
    return { error: "Paciente no encontrado o sin acceso." };
  }

  const hc = await resolveOrCrearHistoriaClinica(supabase, pacienteId, paciente.dni);
  if ("error" in hc) return hc;

  // 1.5 Buscar Cita del Día
  const hoyStr = new Date().toLocaleDateString("en-CA"); // Formato YYYY-MM-DD
  const { data: citasHoy } = await supabase
    .from("citas")
    .select("id, tipo_consulta_id")
    .eq("paciente_id", pacienteId)
    .eq("doctor_id", user.id)
    .eq("fecha", hoyStr)
    .in("estado", ["programada", "confirmada"])
    .order("hora_inicio", { ascending: true })
    .limit(1);

  let tipoConsultaIdFallback = citasHoy?.[0]?.tipo_consulta_id;
  if (!tipoConsultaIdFallback) {
    const { data: tc } = await supabase.from("tipo_consulta").select("id").limit(1).single();
    if (tc) tipoConsultaIdFallback = tc.id;
  }

  // 1.8 Crear Nota Clínica asociada a la Historia Clínica
  const { data: notaClinica, error: errorNota } = await supabase
    .from("nota_clinica")
    .insert({
       historia_clinica_id: hc.id,
       estado: "activa"
    })
    .select("id")
    .single();

  if (errorNota || !notaClinica) {
    console.error("Error creando nota_clinica:", errorNota);
    return { error: "No se pudo crear la nota clínica base." };
  }

  // 2. Insertar Consulta usando nota_clinica_id
  const { data: nuevaConsulta, error } = await supabase.from("consultas").insert({
    nota_clinica_id: notaClinica.id,
    doctor_id: user.id,
    cita_id: citasHoy?.[0]?.id || null,
    tipo_consulta_id: tipoConsultaIdFallback,
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

// ─── Historial de consultas (vista completa por consulta) ─────────────────────

export async function getHistorialConsultasAction(
  pacienteId: string,
  opts?: { fechaDesde?: string; fechaHasta?: string },
) {
  const supabase = await createClient();
  const pid = Number(pacienteId);

  // consultas no tiene FK directa a historia_clinica — la cadena real es
  // historia_clinica → nota_clinica → consultas. Resolvemos en dos pasos en
  // vez de un filtro anidado de 2 niveles (soporte incierto en PostgREST).
  const { data: hc } = await supabase
    .from("historia_clinica")
    .select("id")
    .eq("paciente_id", pid)
    .maybeSingle();

  if (!hc) return [];

  const { data: notasClinicas } = await supabase
    .from("nota_clinica")
    .select("id")
    .eq("historia_clinica_id", hc.id);

  const notaIds = (notasClinicas || []).map((n) => n.id);
  if (notaIds.length === 0) return [];

  let consultasQuery = supabase
    .from("consultas")
    .select(`
      id, fecha_consulta, motivo, observaciones, examen_fisico,
      personal ( nombre, apellido, url_firma_digital, especialidad ( especialidad ) ),
      diagnostico!diagnostico_consulta_origen_id_fkey (
        id, diagnostico, es_definitivo, "esTratado",
        cie10 ( codigo, descripcion ),
        tratamiento (
          id, tratamiento,
          plan_tratamiento (
            id, fase, orden, descripcion, tiempo_estimado, estado,
            tratamiento_catalogo_planeado ( id, estado, catalogo_tratamientos ( nombre, precio, moneda ) )
          )
        ),
        recetas ( id, estado, fecha_emision, receta_medicamento ( medicamento_nombre, dosis, frecuencia, indicaciones ) )
      )
    `)
    .in("nota_clinica_id", notaIds)
    .order("fecha_consulta", { ascending: false });

  if (opts?.fechaDesde) consultasQuery = consultasQuery.gte("fecha_consulta", opts.fechaDesde);
  if (opts?.fechaHasta) consultasQuery = consultasQuery.lte("fecha_consulta", `${opts.fechaHasta}T23:59:59`);

  const [consultasRes, presupuestosRes] = await Promise.all([
    consultasQuery,
    supabase
      .from("presupuestos")
      .select(`id, fecha_emision, total_bruto, descuento_monto, estado,
        detalle_presupuesto ( cantidad, subtotal, catalogo_tratamientos ( nombre ) ),
        pagos ( monto, estado )`)
      .eq("paciente_id", pid),
  ]);

  const consultaIds = (consultasRes.data || []).map((c: any) => c.id);
  const diagIdsPorConsulta = new Map<number, number[]>();
  for (const c of consultasRes.data || []) {
    diagIdsPorConsulta.set(c.id, (c.diagnostico || []).map((d: any) => d.id));
  }
  const todosDiagIds = Array.from(diagIdsPorConsulta.values()).flat();

  const [archivosPorConsultaRes, archivosPorDiagRes, odontogramasRes] = await Promise.all([
    consultaIds.length > 0
      ? supabase.from("archivos_clinicos")
          .select("id, nombre_archivo, url, tipo_archivo_id, categoria, fecha_subida, consulta_id, tipo_archivo (id, tipo_archivo)")
          .in("consulta_id", consultaIds)
      : Promise.resolve({ data: [] as any[] }),
    todosDiagIds.length > 0
      ? supabase.from("archivos_clinicos")
          .select("id, nombre_archivo, url, tipo_archivo_id, categoria, fecha_subida, diagnostico_id, tipo_archivo (id, tipo_archivo)")
          .in("diagnostico_id", todosDiagIds)
      : Promise.resolve({ data: [] as any[] }),
    consultaIds.length > 0
      ? supabase.from("odontograma")
          .select("id, consulta_id, tipo_tratamiento, odontograma_diente ( diente )")
          .in("consulta_id", consultaIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const archivosPorId = new Map<number, any>();
  for (const a of [...(archivosPorConsultaRes.data || []), ...(archivosPorDiagRes.data || [])]) {
    archivosPorId.set(a.id, a);
  }
  const archivosSignedList = await Promise.all(
    Array.from(archivosPorId.values()).map(async (a: any) => {
      let displayUrl = a.url;
      if (a.url && !String(a.url).startsWith("http")) {
        const { data: signed } = await supabase.storage.from("archivos_clinicos").createSignedUrl(a.url, 60 * 60);
        displayUrl = signed?.signedUrl || a.url;
        if (displayUrl.startsWith("/")) {
          displayUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${displayUrl}`;
        } else if (!displayUrl.startsWith("http")) {
          displayUrl = `${process.env.R2_PUBLIC_CUSTOM_DOMAIN}/${a.url}`;
        }
      }
      const tipoRaw = a.tipo_archivo;
      const tipo_archivo = tipoRaw && typeof tipoRaw === "object"
        ? (tipoRaw.tipo_archivo || tipoRaw.Tipo_archivo || "desconocido")
        : (typeof tipoRaw === "string" ? tipoRaw : "desconocido");
      return { ...a, tipo_archivo, displayUrl };
    }),
  );

  const archivosPorConsulta = new Map<number, any[]>();
  for (const a of archivosSignedList) {
    if (a.consulta_id != null) {
      if (!archivosPorConsulta.has(a.consulta_id)) archivosPorConsulta.set(a.consulta_id, []);
      archivosPorConsulta.get(a.consulta_id)!.push(a);
    }
  }
  for (const [consultaId, diagIds] of diagIdsPorConsulta) {
    for (const a of archivosSignedList) {
      if (a.diagnostico_id != null && diagIds.includes(a.diagnostico_id)) {
        if (!archivosPorConsulta.has(consultaId)) archivosPorConsulta.set(consultaId, []);
        const list = archivosPorConsulta.get(consultaId)!;
        if (!list.some((x) => x.id === a.id)) list.push(a);
      }
    }
  }

  const odontogramaPorConsulta = new Map<number, { piezas: number; tipo: string | null }>();
  for (const o of odontogramasRes.data || []) {
    if (o.consulta_id == null) continue;
    const piezas = new Set((o.odontograma_diente || []).map((d: any) => d.diente)).size;
    odontogramaPorConsulta.set(o.consulta_id, { piezas, tipo: o.tipo_tratamiento || null });
  }

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

    const diagnosticos = (c.diagnostico || []).map((d: any) => {
      // Ítems de catálogo planeados, aplanados desde tratamiento → plan_tratamiento →
      // tratamiento_catalogo_planeado (relación real; puede haber varios por diagnóstico).
      const catalogoItems = (d.tratamiento || []).flatMap((t: any) =>
        (t.plan_tratamiento || []).flatMap((p: any) =>
          (p.tratamiento_catalogo_planeado || []).map((tc: any) => tc.catalogo_tratamientos).filter(Boolean)
        )
      );
      const primerItem = catalogoItems[0];

      return {
        id: d.id,
        texto: d.diagnostico,
        es_definitivo: d.es_definitivo,
        es_tratado: d.esTratado,
        cie10: d.cie10 ? { codigo: d.cie10.codigo, descripcion: d.cie10.descripcion } : null,
        tratamientos: (d.tratamiento || []).map((t: any) => ({
          id: t.id,
          notas: t.tratamiento,
          nombre: primerItem?.nombre ?? "Tratamiento",
          precio: Number(primerItem?.precio) || 0,
          moneda: primerItem?.moneda ?? "PEN",
        })),
        plan: (d.tratamiento || []).flatMap((t: any) =>
          (t.plan_tratamiento || []).map((p: any) => ({
            id: p.id, etapa: p.fase, descripcion: p.descripcion, estado: p.estado, tiempo: p.tiempo_estimado,
          }))
        ),
        recetas: (d.recetas || []).map((r: any) => ({
          id: r.id, estado: r.estado,
          medicamentos: (r.receta_medicamento || []).map((m: any) => ({
            nombre: m.medicamento_nombre, dosis: m.dosis, frecuencia: m.frecuencia, indicaciones: m.indicaciones,
          })),
        })),
      };
    });

    return {
      id: String(c.id),
      fecha: c.fecha_consulta,
      motivo: c.motivo || "Consulta",
      observaciones: c.observaciones || "",
      doctor: dr,
      doctorEspecialidad: c.personal?.especialidad?.especialidad ?? null,
      doctorFirmaUrl: c.personal?.url_firma_digital ?? null,
      examen,
      diagnosticos,
      presupuestos: presuPorDia.get(dia) || [],
      archivos: (archivosPorConsulta.get(c.id) || []).map((a: any) => ({
        id: a.id,
        nombre_archivo: a.nombre_archivo,
        categoria: a.categoria,
        tipo_archivo: a.tipo_archivo,
        fecha_subida: a.fecha_subida,
        displayUrl: a.displayUrl,
      })),
      odontograma: odontogramaPorConsulta.get(c.id) || null,
    };
  });
}

// ─── Expediente clínico completo (para exportación PDF) ────────────────────────

export async function getExpedienteCompletoAction(pacienteId: string, opts?: {
  fechaDesde?: string; fechaHasta?: string;
}) {
  const supabase = await createClient();

  const [detalle, historial, sede] = await Promise.all([
    getDetallePacienteAction(pacienteId),
    getHistorialConsultasAction(pacienteId, opts),
    getSedeInfoAction(),
  ]);

  if (!detalle) return null;

  const { data: hc } = await supabase
    .from("historia_clinica")
    .select("id, codigo_historia, fecha_creacion, estado")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  // Odontograma pieza por pieza, agrupado por consulta (real: odontograma.consulta_id).
  const consultaIds = historial.map((c: any) => Number(c.id));
  const odontogramasPorConsulta = new Map<number, any[]>();

  if (consultaIds.length > 0) {
    const { data: odontos } = await supabase
      .from("odontograma")
      .select(`
        id, consulta_id, tipo_tratamiento,
        personal ( nombre, apellido ),
        odontograma_diente ( id, diente, superficie, descripcion, condicion ( condicion ) )
      `)
      .in("consulta_id", consultaIds);

    for (const o of odontos || []) {
      const grouped = new Map<string, any>();
      for (const d of (o.odontograma_diente || []) as any[]) {
        const key = `${d.diente}_${d.descripcion || ""}`;
        if (!grouped.has(key)) {
          grouped.set(key, { toothNumber: Number(d.diente), isAll: false, surfaceConditions: [] as any[], observaciones: d.descripcion || "" });
        }
        const g = grouped.get(key)!;
        const condicionNombre = (d.condicion as any)?.condicion ?? "hallazgo";
        if (d.superficie === "diente completo") {
          g.isAll = true;
          g.allConvention = condicionNombre;
        } else if (!g.surfaceConditions.find((s: any) => s.surface === d.superficie)) {
          g.surfaceConditions.push({ surface: d.superficie, convention: condicionNombre });
        }
      }
      const doctor = o.personal ? `${(o.personal as any).nombre} ${(o.personal as any).apellido}`.trim() : null;
      const entry = { id: o.id, tipo: o.tipo_tratamiento, doctor, findings: Array.from(grouped.values()) };
      const list = odontogramasPorConsulta.get(o.consulta_id) || [];
      list.push(entry);
      odontogramasPorConsulta.set(o.consulta_id, list);
    }
  }

  const consultas = historial.map((c: any) => ({
    ...c,
    odontogramaDetalle: odontogramasPorConsulta.get(Number(c.id)) || [],
  }));

  return {
    paciente: detalle.paciente,
    historiaClinica: hc || null,
    sede,
    consultas,
  };
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
    if (a.url && !a.url.startsWith("http")) {
      const { data: signed } = await supabase.storage.from("archivos_clinicos").createSignedUrl(a.url, 60 * 60);
      let displayUrl = signed?.signedUrl || a.url;
      if (displayUrl.startsWith("/")) {
        displayUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${displayUrl}`;
      } else if (!displayUrl.startsWith("http")) {
        displayUrl = `${process.env.R2_PUBLIC_CUSTOM_DOMAIN}/${a.url}`;
      }
      return { ...a, displayUrl };
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
