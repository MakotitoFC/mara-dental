// src/lib/offline/data-access.ts
import { db } from "./db";

/**
 * Capa de acceso a datos híbrida:
 * Si estamos online, consulta Supabase y actualiza Dexie en segundo plano.
 * Si estamos offline, lee directamente de IndexedDB (Dexie).
 */

export async function getAgendaData(): Promise<{
  citas: any[];
  doctores: any[];
  tiposConsulta: any[];
}> {
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  if (isOnline) {
    try {
      const { getCitasSedeAction, getDoctoresSedeAction } = await import(
        "@/app/(panel)/agenda/actions"
      );
      const [citasOnline, doctoresOnline] = await Promise.all([
        getCitasSedeAction().catch(() => []),
        getDoctoresSedeAction().catch(() => []),
      ]);

      if (citasOnline.length > 0) {
        return {
          citas: citasOnline,
          doctores: doctoresOnline,
          tiposConsulta: await db.tipo_consulta.toArray().catch(() => []),
        };
      }
    } catch (e) {
      console.warn("[DataAccess] Falló consulta online de agenda, usando Dexie:", e);
    }
  }

  // Lectura Offline desde Dexie
  const [citasRaw, pacientesRaw, tiposConsultaRaw, personalRaw] = await Promise.all([
    db.citas.toArray().catch(() => []),
    db.pacientes.toArray().catch(() => []),
    db.tipo_consulta.toArray().catch(() => []),
    db.personal.toArray().catch(() => []),
  ]);

  const pacMap = new Map(pacientesRaw.map((p) => [String(p.id), p]));
  const personalMap = new Map(personalRaw.map((p) => [String(p.usuario_id), p]));

  const citas = citasRaw.map((c: any) => {
    const pac = pacMap.get(String(c.paciente_id));
    const doc = personalMap.get(String(c.doctor_id));

    let alergiasArr: string[] = [];
    if (Array.isArray(pac?.alergias)) {
      alergiasArr = pac.alergias;
    } else if (typeof pac?.alergias === "string") {
      try {
        alergiasArr = JSON.parse(pac.alergias);
      } catch {}
    }

    return {
      id: String(c.id),
      paciente_id: String(c.paciente_id || ""),
      paciente_nombre: pac ? `${pac.nombre || ""} ${pac.apellido || ""}`.trim() : "Paciente",
      alergias: alergiasArr,
      tipo_consulta_id: c.tipo_consulta_id || "",
      doctor_id: String(c.doctor_id || ""),
      doctor_nombre: doc ? `Dr. ${doc.apellido || doc.nombre}` : "Médico",
      fecha: c.fecha,
      hora_inicio: (c.hora_inicio || "").slice(0, 5),
      hora_fin: (c.hora_fin || "").slice(0, 5),
      estado: c.estado || "programada",
      notas: c.notas || undefined,
    };
  });

  const doctores = personalRaw
    .filter((p) => p.nombre && p.apellido)
    .map((p) => ({
      id: String(p.usuario_id),
      nombre: p.nombre,
      apellido: p.apellido,
      especialidad: "Odontología",
    }));

  return { citas, doctores, tiposConsulta: tiposConsultaRaw };
}

export async function getPacientesData(): Promise<{ pacientes: any[] }> {
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  if (isOnline) {
    try {
      const { getDoctorPacientesAction } = await import(
        "@/app/(panel)/pacientes/actions"
      );
      const res = await getDoctorPacientesAction();
      if (res && res.length > 0) return { pacientes: res };
    } catch (e) {
      console.warn("[DataAccess] Falló consulta online de pacientes, usando Dexie:", e);
    }
  }

  // Lectura Offline desde Dexie
  const pacientesRaw = await db.pacientes.toArray().catch(() => []);
  const pacientes = pacientesRaw.map((p) => ({
    id: String(p.id),
    nombre: `${p.nombre || ""} ${p.apellido || ""}`.trim(),
    dni: p.dni || "—",
    fecha_nacimiento: p.fecha_nacimiento || "",
    telefono: p.telefono || "—",
    alergias: Array.isArray(p.alergias) ? p.alergias : [],
    estado: "en_tratamiento" as const,
    ultima_visita: null,
    sexo: p.sexo || undefined,
  }));

  return { pacientes };
}

export async function getPacienteDetailData(pacienteId: string): Promise<any | null> {
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  if (isOnline) {
    try {
      const { getDetallePacienteAction, getHistorialConsultasAction } = await import(
        "@/app/(panel)/pacientes/[id]/actions"
      );
      const { getCasosClinicosAction } = await import(
        "@/app/(panel)/pacientes/[id]/casos.actions"
      );

      const [detalle, historial, datosCasos] = await Promise.all([
        getDetallePacienteAction(pacienteId),
        getHistorialConsultasAction(pacienteId),
        getCasosClinicosAction(pacienteId),
      ]);

      if (detalle) {
        const fullGraph = { detalle, historial, datosCasos };
        // Guardar bajo demanda en Dexie
        db.paciente_detail
          .put({
            paciente_id: pacienteId,
            data: fullGraph,
            synced_at: new Date().toISOString(),
          })
          .catch(() => {});
        return fullGraph;
      }
    } catch (e) {
      console.warn("[DataAccess] Falló consulta online de ficha clínica, buscando en Dexie:", e);
    }
  }

  // Lectura Offline desde Dexie
  const cached = await db.paciente_detail.get(pacienteId).catch(() => null);
  if (cached && cached.data) {
    return cached.data;
  }

  return null; // Ficha no disponible sin conexión
}

export async function getPresupuestosData(
  filtro: string = "todos",
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: any[]; total: number; totalPages: number }> {
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  if (isOnline) {
    try {
      const { getPresupuestosPaginadosAction } = await import(
        "@/app/(panel)/(contador)/contador.actions"
      );
      const res = await getPresupuestosPaginadosAction({ page, pageSize, filtro });
      if (res && res.data) return res;
    } catch (e) {
      console.warn("[DataAccess] Falló consulta online de presupuestos, usando Dexie:", e);
    }
  }

  // Lectura Offline desde Dexie
  const [presupuestosRaw, pacientesRaw, detallesRaw, cuotasRaw, movimientosRaw, tratamientosRaw] =
    await Promise.all([
      db.presupuestos.toArray().catch(() => []),
      db.pacientes.toArray().catch(() => []),
      db.detalle_presupuesto.toArray().catch(() => []),
      db.cuotas.toArray().catch(() => []),
      db.movimiento_caja.toArray().catch(() => []),
      db.catalogo_tratamientos.toArray().catch(() => []),
    ]);

  const pacMap = new Map(pacientesRaw.map((p) => [String(p.id), p]));
  const tratMap = new Map(tratamientosRaw.map((t) => [Number(t.id), t]));

  const mapped = presupuestosRaw.map((p: any) => {
    const pac = pacMap.get(String(p.paciente_id));
    const totalNeto = Number(p.total_bruto || 0) - Number(p.descuento_monto || 0);

    const movs = movimientosRaw.filter(
      (m: any) => String(m.presupuesto_id) === String(p.id) && m.estado === "confirmado"
    );
    const pagado = movs.reduce((sum: number, m: any) => sum + Number(m.monto || 0), 0);
    const saldo = Math.max(0, totalNeto - pagado);

    const dets = detallesRaw.filter((d: any) => String(d.presupuesto_id) === String(p.id));
    const nombresTrat = dets
      .map((d: any) => tratMap.get(Number(d.catalogo_tratamiento_id))?.nombre)
      .filter(Boolean);

    const cts = cuotasRaw.filter((c: any) => String(c.presupuesto_id) === String(p.id));

    return {
      id: String(p.id),
      fecha_emision: p.fecha_emision,
      estado: p.estado,
      total_bruto: Number(p.total_bruto || 0),
      descuento_monto: Number(p.descuento_monto || 0),
      total_neto: totalNeto,
      pagado,
      saldo,
      paciente: pac
        ? {
            id: pac.id,
            nombre: `${pac.nombre || ""} ${pac.apellido || ""}`.trim(),
            dni: pac.dni || "—",
            telefono: pac.telefono,
          }
        : { nombre: "Paciente", dni: "—" },
      tratamiento: nombresTrat.slice(0, 2).join(" + ") || "Tratamiento",
      cuotas: cts,
      movimientos: movs,
    };
  });

  // Filtrado
  const filtered = mapped.filter((p) => {
    if (filtro === "pendientes") return p.saldo > 0.009;
    if (filtro === "pagados") return p.estado === "pagado" || p.saldo <= 0.009;
    if (filtro === "rechazados") return p.estado === "rechazado";
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, total, totalPages };
}

export async function getPagosData(): Promise<{
  dashboard: any;
  mediosPago: any[];
  categoriasIngreso: any[];
  categoriasEgreso: any[];
  tiposMoneda: any[];
  sede: any;
  cajaAbiertaId: string;
}> {
  const [presupuestosRaw, pacientesRaw, movimientosRaw, mediosPagoRaw, monedasRaw, sedesRaw, cajaTurnosRaw] =
    await Promise.all([
      db.presupuestos.toArray().catch(() => []),
      db.pacientes.toArray().catch(() => []),
      db.movimiento_caja.toArray().catch(() => []),
      db.medio_pago.toArray().catch(() => []),
      db.tipo_moneda.toArray().catch(() => []),
      db.sede.toArray().catch(() => []),
      db.caja_turno.toArray().catch(() => []),
    ]);

  const pacMap = new Map(pacientesRaw.map((p) => [String(p.id), p]));
  const medioMap = new Map(mediosPagoRaw.map((m) => [Number(m.id), m.nombre]));

  // Pendientes de cobro
  const pendientes = presupuestosRaw
    .map((p: any) => {
      const pac = pacMap.get(String(p.paciente_id));
      const totalNeto = Number(p.total_bruto || 0) - Number(p.descuento_monto || 0);
      const movs = movimientosRaw.filter(
        (m: any) => String(m.presupuesto_id) === String(p.id) && m.estado === "confirmado"
      );
      const pagado = movs.reduce((sum: number, m: any) => sum + Number(m.monto || 0), 0);
      const saldo = Math.max(0, totalNeto - pagado);

      return {
        id: String(p.id),
        paciente_id: String(p.paciente_id),
        paciente_nombre: pac ? `${pac.nombre || ""} ${pac.apellido || ""}`.trim() : "Paciente",
        paciente_documento: pac?.dni || null,
        telegram_chat_id: pac?.telegram_chat_id || null,
        fecha_emision: p.fecha_emision,
        estado: p.estado,
        esPagado: saldo <= 0.009,
        tratamiento: "Tratamiento dental",
        total_neto: totalNeto,
        pagado,
        saldo,
        moneda: "PEN",
        cuotas: [],
      };
    })
    .filter((p) => p.saldo > 0.009 || p.estado === "aprobado");

  // Movimientos de hoy
  const todayStr = new Date().toISOString().slice(0, 10);
  const movsHoy = movimientosRaw.filter((m: any) => (m.fecha || "").startsWith(todayStr));
  const ingresosHoy = movsHoy.reduce((acc, m) => acc + (Number(m.monto) > 0 ? Number(m.monto) : 0), 0);
  const egresosHoy = movsHoy.reduce((acc, m) => acc + (Number(m.monto) < 0 ? Math.abs(Number(m.monto)) : 0), 0);

  const historial = movsHoy.slice(0, 10).map((m: any) => ({
    id: String(m.id),
    paciente_nombre: m.observacion || "Movimiento",
    monto: Number(m.monto),
    medio_pago_nombre: medioMap.get(Number(m.medio_pago_id)) || "Efectivo",
    fecha_pago: m.fecha,
    moneda: "PEN",
  }));

  const cajaAbierta = cajaTurnosRaw.find((ct) => !ct.fecha_cierre);
  const cajaAbiertaId = cajaAbierta ? String(cajaAbierta.id) : "offline-caja";

  const dashboard = {
    pendientes,
    ingresosHoy,
    egresosHoy,
    comprobantesHoy: movsHoy.length,
    metodosPago: mediosPagoRaw.map((mp) => ({
      nombre: mp.nombre,
      monto: 0,
      porcentaje: 0,
    })),
    historial,
  };

  return {
    dashboard,
    mediosPago: mediosPagoRaw,
    categoriasIngreso: [],
    categoriasEgreso: [],
    tiposMoneda: monedasRaw.length > 0 ? monedasRaw : [{ id: 1, moneda: "PEN" }],
    sede: sedesRaw[0] || null,
    cajaAbiertaId,
  };
}

export async function getCajaData(): Promise<{ turnosData: any[]; movimientos: any[] }> {
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  if (isOnline) {
    try {
      const { getCajaTurnosAction } = await import(
        "@/app/(panel)/(contador)/contador.actions"
      );
      const res = await getCajaTurnosAction();
      const allMovs = (res || []).flatMap((t: any) => t.movimientos || []);
      if (res && Array.isArray(res)) return { turnosData: res, movimientos: allMovs };
    } catch (e) {
      console.warn("[DataAccess] Falló consulta online de caja, usando Dexie:", e);
    }
  }

  // Lectura Offline desde Dexie
  const [cajaTurnosRaw, movimientosRaw, personalRaw, mediosPagoRaw] = await Promise.all([
    db.caja_turno.toArray().catch(() => []),
    db.movimiento_caja.toArray().catch(() => []),
    db.personal.toArray().catch(() => []),
    db.medio_pago.toArray().catch(() => []),
  ]);

  const personalMap = new Map(personalRaw.map((p) => [String(p.usuario_id), p]));
  const medioMap = new Map(mediosPagoRaw.map((m) => [Number(m.id), m.nombre]));

  const allOfflineMovs = movimientosRaw.map((m: any) => ({
    id: String(m.id),
    fecha: m.fecha,
    monto: Number(m.monto),
    tipo: Number(m.monto) >= 0 ? "I" : "E",
    medio_pago_nombre: medioMap.get(Number(m.medio_pago_id)) || "Efectivo",
    concepto: m.observacion || "Movimiento",
    conciliado: Boolean(m.conciliado),
  }));

  const turnosData = cajaTurnosRaw.map((ct: any) => {
    const user = personalMap.get(String(ct.usuario_id));
    const movs = movimientosRaw.filter((m: any) => String(m.caja_turno_id) === String(ct.id));
    const totalIngresos = movs.reduce((acc, m) => acc + (Number(m.monto) > 0 ? Number(m.monto) : 0), 0);
    const totalEgresos = movs.reduce((acc, m) => acc + (Number(m.monto) < 0 ? Math.abs(Number(m.monto)) : 0), 0);

    return {
      id: String(ct.id),
      fecha_apertura: ct.fecha_apertura,
      fecha_cierre: ct.fecha_cierre,
      estado: ct.fecha_cierre ? "cerrada" : "abierta",
      usuario_nombre: user ? `${user.nombre || ""} ${user.apellido || ""}`.trim() : "Usuario",
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      saldo_final: totalIngresos - totalEgresos,
      movimientos: movs.map((m: any) => ({
        id: String(m.id),
        fecha: m.fecha,
        monto: Number(m.monto),
        tipo: Number(m.monto) >= 0 ? "I" : "E",
        medio_pago_nombre: medioMap.get(Number(m.medio_pago_id)) || "Efectivo",
        concepto: m.observacion || "Movimiento",
        conciliado: Boolean(m.conciliado),
      })),
    };
  });

  return { turnosData, movimientos: allOfflineMovs };
}

export async function getDashboardData(): Promise<any> {
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  if (isOnline) {
    try {
      const { getDashboardDataAction } = await import(
        "@/app/(panel)/dashboard/actions"
      );
      const res = await getDashboardDataAction();
      if (res) {
        db.dashboard_cache
          .put({
            cache_key: "main_dashboard",
            data: res,
            synced_at: new Date().toISOString(),
          })
          .catch(() => {});
        return res;
      }
    } catch (e) {
      console.warn("[DataAccess] Falló consulta online de dashboard, usando Dexie:", e);
    }
  }

  // Lectura Offline desde Dexie
  const cached = await db.dashboard_cache.get("main_dashboard").catch(() => null);
  if (cached && cached.data) {
    return cached.data;
  }

  const [citasRaw, pacientesRaw] = await Promise.all([
    db.citas.toArray().catch(() => []),
    db.pacientes.toArray().catch(() => []),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const citasHoy = citasRaw.filter((c: any) => (c.fecha || "").startsWith(todayStr));
  const completas = citasHoy.filter((c: any) => c.estado === "completada" || c.estado === "atendida").length;
  const pendientes = citasHoy.filter((c: any) => c.estado === "programada" || c.estado === "confirmada").length;

  return {
    citas: citasHoy,
    cumpleañosHoy: [],
    statsCitasHoy: citasHoy.length,
    statsCompletas: completas,
    statsPendientes: pendientes,
    statsPacientesMes: pacientesRaw.length,
    recordatoriosPendientes: 0,
  };
}
