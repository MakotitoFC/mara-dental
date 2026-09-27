// src/lib/offline/sync.ts
import { db } from "./db";
import { fetchOfflineSyncPayloadAction } from "./sync.actions";

let isSyncing = false;

export async function syncOfflineData(sedeId?: number | string): Promise<{ success: boolean; error?: string; step?: string }> {
  if (typeof window === "undefined") return { success: false, error: "Ambiente no soportado" };

  if (!navigator.onLine) {
    console.log("[SyncOffline] Dispositivo offline — omitiendo sincronización.");
    return { success: false, error: "Sin conexión a internet" };
  }

  if (isSyncing) {
    console.log("[SyncOffline] Ya existe una sincronización en curso.");
    return { success: false, error: "Sincronización en curso" };
  }

  isSyncing = true;
  const tTotal0 = performance.now();
  console.log(`[SyncOffline] Iniciando sincronización agregada (sede: ${sedeId || "auto"})...`);

  // Marcar estado en progreso
  try {
    await db.sync_meta.put({
      scope: "all",
      last_synced_at: new Date().toISOString(),
      status: "in_progress",
    });
  } catch {}

  try {
    const res = await fetchOfflineSyncPayloadAction(sedeId);

    if (!res.success) {
      console.error(`[SyncOffline] ❌ Error en paso [${res.step}]: ${res.error}`);
      await db.sync_meta.put({
        scope: "all",
        last_synced_at: new Date().toISOString(),
        status: "error",
        step: res.step,
        error: res.error,
      });

      window.dispatchEvent(
        new CustomEvent("mara_sync_error", {
          detail: { step: res.step, error: res.error },
        })
      );

      return { success: false, step: res.step, error: res.error };
    }

    const { catalogos, mesActual } = res;

    // Helper para guardar y medir tiempo de cada tabla
    async function persistTable(name: string, table: any, rows: any[]) {
      const t0 = performance.now();
      const synced_at = new Date().toISOString();
      const enriched = rows.map((r) => ({ ...r, synced_at }));

      await table.clear();
      if (enriched.length > 0) {
        await table.bulkPut(enriched);
      }
      const ms = (performance.now() - t0).toFixed(1);
      console.log(`[SyncOffline] ✓ ${name}: ${enriched.length} registros guardados en ${ms}ms`);
    }

    // Guardar catálogos
    await persistTable("catalogo_tratamientos", db.catalogo_tratamientos, catalogos.catalogo_tratamientos);
    await persistTable("tipo_consulta", db.tipo_consulta, catalogos.tipo_consulta);
    await persistTable("cie10", db.cie10, catalogos.cie10);
    await persistTable("condicion", db.condicion, catalogos.condicion);
    await persistTable("medio_pago", db.medio_pago, catalogos.medio_pago);
    await persistTable("tipo_moneda", db.tipo_moneda, catalogos.tipo_moneda);
    await persistTable("categoria_movimiento", db.categoria_movimiento, catalogos.categoria_movimiento);
    await persistTable("especialidad", db.especialidad, catalogos.especialidad);
    await persistTable("puesto", db.puesto, catalogos.puesto);
    await persistTable("personal", db.personal, catalogos.personal);
    await persistTable("sede", db.sede, catalogos.sede);
    await persistTable("plantilla", db.plantilla, catalogos.plantilla);

    // Guardar datos mes actual
    await persistTable("pacientes", db.pacientes, mesActual.pacientes);
    await persistTable("citas", db.citas, mesActual.citas);
    await persistTable("caja_turno", db.caja_turno, mesActual.caja_turno);
    await persistTable("movimiento_caja", db.movimiento_caja, mesActual.movimiento_caja);
    await persistTable("cuotas", db.cuotas, mesActual.cuotas);
    await persistTable("presupuestos", db.presupuestos, mesActual.presupuestos);
    await persistTable("detalle_presupuesto", db.detalle_presupuesto, mesActual.detalle_presupuesto);

    // Actualizar metadata de sincronización exitosa
    const finishedAt = new Date().toISOString();
    await db.sync_meta.put({
      scope: "all",
      last_synced_at: finishedAt,
      status: "success",
    });

    const totalMs = (performance.now() - tTotal0).toFixed(1);
    console.log(`[SyncOffline] 🎉 Sincronización completa finalizada con éxito en ${totalMs}ms.`);

    window.dispatchEvent(
      new CustomEvent("mara_sync_completed", {
        detail: { timestamp: finishedAt, totalMs },
      })
    );

    return { success: true };
  } catch (err: any) {
    console.error("[SyncOffline] ❌ Excepción inesperada durante sincronización:", err);
    await db.sync_meta.put({
      scope: "all",
      last_synced_at: new Date().toISOString(),
      status: "error",
      step: "sync:client_exception",
      error: err?.message || "Excepción en el cliente",
    });

    window.dispatchEvent(
      new CustomEvent("mara_sync_error", {
        detail: { step: "sync:client_exception", error: err?.message || "Error en cliente" },
      })
    );

    return { success: false, step: "sync:client_exception", error: err?.message };
  } finally {
    isSyncing = false;
  }
}
