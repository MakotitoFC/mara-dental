"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export type SyncPayloadResult =
  | {
      success: true;
      catalogos: {
        catalogo_tratamientos: any[];
        tipo_consulta: any[];
        cie10: any[];
        condicion: any[];
        medio_pago: any[];
        tipo_moneda: any[];
        categoria_movimiento: any[];
        especialidad: any[];
        puesto: any[];
        personal: any[];
        sede: any[];
        plantilla: any[];
      };
      mesActual: {
        pacientes: any[];
        citas: any[];
        caja_turno: any[];
        movimiento_caja: any[];
        cuotas: any[];
        presupuestos: any[];
        detalle_presupuesto: any[];
      };
      dashboard?: any;
    }
  | {
      success: false;
      step: string;
      error: string;
    };

function getLimaMonthRange(): { inicioMesDate: string; finMesDate: string; inicioMesISO: string } {
  // Hora America/Lima (UTC-5)
  const now = new Date();
  const limaString = now.toLocaleString("en-US", { timeZone: "America/Lima" });
  const limaDate = new Date(limaString);
  const year = limaDate.getFullYear();
  const month = limaDate.getMonth() + 1; // 1-12

  const mm = String(month).padStart(2, "0");
  const inicioMesDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const dd = String(lastDay).padStart(2, "0");
  const finMesDate = `${year}-${mm}-${dd}`;
  const inicioMesISO = `${inicioMesDate}T00:00:00-05:00`;

  return { inicioMesDate, finMesDate, inicioMesISO };
}

/** Ejecuta una consulta con timeout para garantizar que nunca se quede colgada */
async function queryWithTimeout<T>(
  stepName: string,
  promise: PromiseLike<{ data: T | null; error: any }>,
  timeoutMs: number = 10000
): Promise<{ data: T | null; error: any }> {
  let timeoutId: any;
  const timeoutPromise = new Promise<{ data: null; error: any }>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout de ${timeoutMs}ms excedido en paso: ${stepName}`));
    }, timeoutMs);
  });

  try {
    const res = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { data: null, error: { message: err?.message || "Error desconocido" } };
  }
}

export async function fetchOfflineSyncPayloadAction(sedeIdParam?: number | string): Promise<SyncPayloadResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, step: "auth:verify", error: "Usuario no autenticado" };
  }

  const { data: usr, error: usrErr } = await supabase
    .from("usuarios")
    .select("sede_id, rol_id")
    .eq("id", user.id)
    .single();

  if (usrErr || !usr) {
    return { success: false, step: "auth:user_profile", error: usrErr?.message || "Perfil no encontrado" };
  }

  // Permitir la sincronización únicamente para rol_id === 6 (doctor_admin) o administradores
  const resolvedSedeId = Number(sedeIdParam || usr.sede_id);
  if (!resolvedSedeId) {
    return { success: false, step: "auth:sede_resolution", error: "No se pudo resolver la sede_id" };
  }

  const adminClient = getAdminClient();
  const { inicioMesDate, finMesDate, inicioMesISO } = getLimaMonthRange();

  try {
    // 1. Catálogos estáticos (réplica completa)
    const catTratamientos = await queryWithTimeout(
      "catalogo:tratamientos",
      adminClient.from("catalogo_tratamientos").select("*").eq("activo", true)
    );
    if (catTratamientos.error) {
      return { success: false, step: "catalogo:tratamientos", error: catTratamientos.error.message };
    }

    const catTipoConsulta = await queryWithTimeout(
      "catalogo:tipo_consulta",
      adminClient.from("tipo_consulta").select("*")
    );
    if (catTipoConsulta.error) {
      return { success: false, step: "catalogo:tipo_consulta", error: catTipoConsulta.error.message };
    }

    const catCie10 = await queryWithTimeout(
      "catalogo:cie10",
      adminClient.from("cie10").select("*")
    );
    if (catCie10.error) {
      return { success: false, step: "catalogo:cie10", error: catCie10.error.message };
    }

    const catCondicion = await queryWithTimeout(
      "catalogo:condicion",
      adminClient.from("condicion").select("*")
    );
    if (catCondicion.error) {
      return { success: false, step: "catalogo:condicion", error: catCondicion.error.message };
    }

    const catMedioPago = await queryWithTimeout(
      "catalogo:medio_pago",
      adminClient.from("medio_pago").select("*")
    );
    if (catMedioPago.error) {
      return { success: false, step: "catalogo:medio_pago", error: catMedioPago.error.message };
    }

    const catTipoMoneda = await queryWithTimeout(
      "catalogo:tipo_moneda",
      adminClient.from("tipo_moneda").select("*")
    );
    if (catTipoMoneda.error) {
      return { success: false, step: "catalogo:tipo_moneda", error: catTipoMoneda.error.message };
    }

    const catCategoriaMov = await queryWithTimeout(
      "catalogo:categoria_movimiento",
      adminClient.from("categoria_movimiento").select("*").eq("activo", true)
    );
    if (catCategoriaMov.error) {
      return { success: false, step: "catalogo:categoria_movimiento", error: catCategoriaMov.error.message };
    }

    const catEspecialidad = await queryWithTimeout(
      "catalogo:especialidad",
      adminClient.from("especialidad").select("*")
    );
    if (catEspecialidad.error) {
      return { success: false, step: "catalogo:especialidad", error: catEspecialidad.error.message };
    }

    const catPuesto = await queryWithTimeout(
      "catalogo:puesto",
      adminClient.from("puesto").select("*")
    );
    if (catPuesto.error) {
      return { success: false, step: "catalogo:puesto", error: catPuesto.error.message };
    }

    const catPersonal = await queryWithTimeout(
      "catalogo:personal",
      adminClient.from("personal").select("*")
    );
    if (catPersonal.error) {
      return { success: false, step: "catalogo:personal", error: catPersonal.error.message };
    }

    const catSede = await queryWithTimeout(
      "catalogo:sede",
      adminClient.from("sede").select("*").eq("id", resolvedSedeId)
    );
    if (catSede.error) {
      return { success: false, step: "catalogo:sede", error: catSede.error.message };
    }

    const catPlantilla = await queryWithTimeout(
      "catalogo:plantilla",
      adminClient.from("plantilla").select("*").or(`sede_id.eq.${resolvedSedeId},sede_id.is.null`)
    );
    if (catPlantilla.error) {
      return { success: false, step: "catalogo:plantilla", error: catPlantilla.error.message };
    }

    // 2. Mes actual: Pacientes activos de la sede
    const resPacientes = await queryWithTimeout(
      "mes:pacientes",
      adminClient.from("pacientes").select("*").eq("sede_id", resolvedSedeId).eq("activo", true)
    );
    if (resPacientes.error) {
      return { success: false, step: "mes:pacientes", error: resPacientes.error.message };
    }
    const pacientes = resPacientes.data || [];

    // 3. Mes actual: Citas de la sede en la ventana de fecha (respetando que citas NO tiene sede_id)
    const resCitas = await queryWithTimeout(
      "mes:citas",
      adminClient
        .from("citas")
        .select("*, pacientes!inner(sede_id, activo)")
        .eq("pacientes.sede_id", resolvedSedeId)
        .gte("fecha", inicioMesDate)
        .lte("fecha", finMesDate)
    );
    if (resCitas.error) {
      return { success: false, step: "mes:citas", error: resCitas.error.message };
    }
    // Sanitizar embebido para que la fila en Dexie quede limpia
    const citas = (resCitas.data || []).map((c: any) => {
      const { pacientes: _p, ...cleanCita } = c;
      return cleanCita;
    });

    // 4. Mes actual: Turnos de caja de la sede (caja_turno SÍ tiene sede_id)
    const resCajaTurno = await queryWithTimeout(
      "mes:caja_turno",
      adminClient
        .from("caja_turno")
        .select("*")
        .eq("sede_id", resolvedSedeId)
        .gte("fecha_apertura", inicioMesISO)
    );
    if (resCajaTurno.error) {
      return { success: false, step: "mes:caja_turno", error: resCajaTurno.error.message };
    }
    const cajaTurnos = resCajaTurno.data || [];
    const cajaTurnoIds = cajaTurnos.map((ct: any) => ct.id);

    // 5. Mes actual: Movimientos de caja correspondientes a los turnos
    let movimientosCaja: any[] = [];
    if (cajaTurnoIds.length > 0) {
      const resMovimientos = await queryWithTimeout(
        "mes:movimiento_caja",
        adminClient.from("movimiento_caja").select("*").in("caja_turno_id", cajaTurnoIds)
      );
      if (resMovimientos.error) {
        return { success: false, step: "mes:movimiento_caja", error: resMovimientos.error.message };
      }
      movimientosCaja = resMovimientos.data || [];
    }

    // 6. Mes actual: Presupuestos (respetando que presupuestos NO tiene sede_id)
    // Sincronizar presupuestos emitidos este mes O pendientes de cobro (aprobados)
    const resPresupuestos = await queryWithTimeout(
      "mes:presupuestos",
      adminClient
        .from("presupuestos")
        .select("*, pacientes!inner(sede_id, activo)")
        .eq("pacientes.sede_id", resolvedSedeId)
        .or(`fecha_emision.gte.${inicioMesDate},estado.eq.aprobado`)
    );
    if (resPresupuestos.error) {
      return { success: false, step: "mes:presupuestos", error: resPresupuestos.error.message };
    }
    const presupuestos = (resPresupuestos.data || []).map((p: any) => {
      const { pacientes: _pac, ...cleanPres } = p;
      return cleanPres;
    });
    const presupuestoIds = presupuestos.map((p: any) => p.id);

    // 7. Cuotas y detalle de los presupuestos sincronizados
    let cuotas: any[] = [];
    let detallePresupuesto: any[] = [];
    if (presupuestoIds.length > 0) {
      const resCuotas = await queryWithTimeout(
        "mes:cuotas",
        adminClient.from("cuotas").select("*").in("presupuesto_id", presupuestoIds)
      );
      if (resCuotas.error) {
        return { success: false, step: "mes:cuotas", error: resCuotas.error.message };
      }
      cuotas = resCuotas.data || [];

      const resDetalle = await queryWithTimeout(
        "mes:detalle_presupuesto",
        adminClient.from("detalle_presupuesto").select("*").in("presupuesto_id", presupuestoIds)
      );
      if (resDetalle.error) {
        return { success: false, step: "mes:detalle_presupuesto", error: resDetalle.error.message };
      }
      detallePresupuesto = resDetalle.data || [];
    }

    return {
      success: true,
      catalogos: {
        catalogo_tratamientos: catTratamientos.data || [],
        tipo_consulta: catTipoConsulta.data || [],
        cie10: catCie10.data || [],
        condicion: catCondicion.data || [],
        medio_pago: catMedioPago.data || [],
        tipo_moneda: catTipoMoneda.data || [],
        categoria_movimiento: catCategoriaMov.data || [],
        especialidad: catEspecialidad.data || [],
        puesto: catPuesto.data || [],
        personal: catPersonal.data || [],
        sede: catSede.data || [],
        plantilla: catPlantilla.data || [],
      },
      mesActual: {
        pacientes,
        citas,
        caja_turno: cajaTurnos,
        movimiento_caja: movimientosCaja,
        cuotas,
        presupuestos,
        detalle_presupuesto: detallePresupuesto,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      step: "sync:unhandled_exception",
      error: err?.message || "Excepción no controlada durante la sincronización",
    };
  }
}
