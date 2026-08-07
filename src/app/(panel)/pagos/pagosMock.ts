import type { PagosDashboardSede } from "./actions";

// TEMPORAL — solo para ver el Panel de Pagos poblado mientras no haya
// presupuestos/pagos reales cargados en la sede. Los `id` son claramente
// falsos (prefijo "mock-"), así que "Registrar pago" sobre estas filas no
// escribe nada real en la BD (fallará con un error visible, no un crash).
// Se descarta automáticamente en cuanto haya al menos un presupuesto o pago
// real — ver getPagosDashboardSedeAction en actions.ts.
export const PAGOS_MOCK: PagosDashboardSede = {
  pendientes: [
    {
      id: "mock-1",
      paciente_id: "mock-paciente-1",
      paciente_nombre: "Elena Rodríguez",
      telegram_chat_id: null,
      fecha_emision: new Date().toISOString().split("T")[0],
      tratamiento: "Endodoncia + Radiografía",
      total_neto: 450,
      pagado: 0,
      saldo: 450,
      moneda: "PEN",
    },
    {
      id: "mock-2",
      paciente_id: "mock-paciente-2",
      paciente_nombre: "Martín Silva",
      telegram_chat_id: null,
      fecha_emision: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      tratamiento: "Limpieza Profunda",
      total_neto: 120,
      pagado: 0,
      saldo: 120,
      moneda: "PEN",
    },
    {
      id: "mock-3",
      paciente_id: "mock-paciente-3",
      paciente_nombre: "Carlos Gómez",
      telegram_chat_id: null,
      fecha_emision: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
      tratamiento: "Ajuste de Prótesis",
      total_neto: 85,
      pagado: 0,
      saldo: 85,
      moneda: "PEN",
    },
  ],
  ingresosHoy: 200,
  comprobantesHoy: 1,
  metodosPago: [
    { nombre: "Tarjeta", monto: 300, porcentaje: 65 },
    { nombre: "Transferencia", monto: 115, porcentaje: 25 },
    { nombre: "Efectivo", monto: 46, porcentaje: 10 },
  ],
  historial: [
    { id: "mock-h1", paciente_nombre: "Lucía Méndez", monto: 200, medio_pago_nombre: "Tarjeta", fecha_pago: new Date().toISOString(), moneda: "PEN" },
    { id: "mock-h2", paciente_nombre: "Ana Torres", monto: 150, medio_pago_nombre: "Transferencia", fecha_pago: new Date(Date.now() - 86400000).toISOString(), moneda: "PEN" },
    { id: "mock-h3", paciente_nombre: "Roberto Díaz", monto: 50, medio_pago_nombre: "Efectivo", fecha_pago: new Date(Date.now() - 2 * 86400000).toISOString(), moneda: "PEN" },
  ],
  esMock: true,
};
