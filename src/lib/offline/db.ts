// src/lib/offline/db.ts
import Dexie, { type Table } from 'dexie';

export interface SyncMeta {
  scope: string; // 'all' | 'catalogos' | 'mes_actual' | `paciente_${id}`
  last_synced_at: string;
  status: 'success' | 'error' | 'in_progress';
  step?: string;
  error?: string;
}

export interface PacienteDetailRecord {
  paciente_id: string;
  data: any;
  synced_at: string;
}

export interface DashboardCacheRecord {
  cache_key: string;
  data: any;
  synced_at: string;
}

export class MaraDentalDexie extends Dexie {
  catalogo_tratamientos!: Table<any, number>;
  tipo_consulta!: Table<any, number>;
  cie10!: Table<any, number>;
  condicion!: Table<any, number>;
  medio_pago!: Table<any, number>;
  tipo_moneda!: Table<any, number>;
  categoria_movimiento!: Table<any, number>;
  especialidad!: Table<any, number>;
  puesto!: Table<any, number>;
  personal!: Table<any, string>;
  sede!: Table<any, number>;
  plantilla!: Table<any, string>;

  pacientes!: Table<any, string>;
  citas!: Table<any, string>;
  caja_turno!: Table<any, string>;
  movimiento_caja!: Table<any, string>;
  cuotas!: Table<any, string>;
  presupuestos!: Table<any, string>;
  detalle_presupuesto!: Table<any, string>;

  paciente_detail!: Table<PacienteDetailRecord, string>;
  dashboard_cache!: Table<DashboardCacheRecord, string>;
  sync_meta!: Table<SyncMeta, string>;

  constructor() {
    super('MaraDentalOfflineDB');
    this.version(1).stores({
      catalogo_tratamientos: 'id, nombre, activo',
      tipo_consulta: 'id, tipo_consulta, estado',
      cie10: 'id, codigo, descripcion',
      condicion: 'id, condicion',
      medio_pago: 'id, nombre',
      tipo_moneda: 'id, moneda',
      categoria_movimiento: 'id, nombre, tipo, activo',
      especialidad: 'id, especialidad',
      puesto: 'id, puesto',
      personal: 'usuario_id, email, puesto_id, especialidad_id',
      sede: 'id, nombre_clinica',
      plantilla: 'id, categoria, sede_id',

      pacientes: 'id, sede_id, dni, nombre, apellido, telefono, activo',
      citas: 'id, paciente_id, doctor_id, fecha, estado',
      caja_turno: 'id, sede_id, usuario_id, fecha_apertura, fecha_cierre',
      movimiento_caja: 'id, caja_turno_id, presupuesto_id, fecha, estado',
      cuotas: 'id, presupuesto_id, numero_cuota, estado',
      presupuestos: 'id, paciente_id, doctor_id, estado, fecha_emision',
      detalle_presupuesto: 'id, presupuesto_id, catalogo_tratamiento_id',

      paciente_detail: 'paciente_id, synced_at',
      dashboard_cache: 'cache_key, synced_at',
      sync_meta: 'scope, last_synced_at, status',
    });
  }
}

export const db = new MaraDentalDexie();

/** Purga completa de todas las tablas offline al cerrar sesión */
export async function clearAllOfflineData(): Promise<void> {
  try {
    await Promise.all([
      db.catalogo_tratamientos.clear(),
      db.tipo_consulta.clear(),
      db.cie10.clear(),
      db.condicion.clear(),
      db.medio_pago.clear(),
      db.tipo_moneda.clear(),
      db.categoria_movimiento.clear(),
      db.especialidad.clear(),
      db.puesto.clear(),
      db.personal.clear(),
      db.sede.clear(),
      db.plantilla.clear(),
      db.pacientes.clear(),
      db.citas.clear(),
      db.caja_turno.clear(),
      db.movimiento_caja.clear(),
      db.cuotas.clear(),
      db.presupuestos.clear(),
      db.detalle_presupuesto.clear(),
      db.paciente_detail.clear(),
      db.dashboard_cache.clear(),
      db.sync_meta.clear(),
    ]);
    console.log('[SyncOffline] Base de datos Dexie purgada exitosamente.');
  } catch (err) {
    console.error('[SyncOffline] Error purgando Dexie:', err);
  }
}
