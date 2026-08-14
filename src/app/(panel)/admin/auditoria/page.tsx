"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAuditoriaLogsAction } from "../admin.actions";
import { createClient } from "@/lib/supabase/client";

const TABLAS = [
  "usuarios", "personal", "pacientes", "contacto", "horarios_medico", "citas",
  "historia_clinica", "nota_clinica", "tratamiento", "plan_tratamiento",
  "tratamiento_catalogo_planeado", "tipo_consulta", "consultas", "diagnostico",
  "cie10", "procedimiento_efectuado", "odontograma", "odontograma_diente",
  "condicion", "recetas", "medicamentos", "receta_medicamento", "tipo_archivo",
  "archivos_clinicos", "catalogo_tratamientos", "presupuestos", "detalle_presupuesto",
  "medio_pago", "cuotas", "caja_turno", "medio_pago_caja_monto", "categoria_movimiento",
  "proveedores", "tipo_moneda", "cliente_pago", "movimiento_caja", "recomendacion",
  "consentimientos", "sesiones", "messages", "plantilla"
].sort();

export default function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterAccion, setFilterAccion] = useState("");
  const [filterTabla, setFilterTabla] = useState("");
  const [filterUsuario, setFilterUsuario] = useState("");
  const [filterFecha, setFilterFecha] = useState(new Date().toISOString().split("T")[0]);

  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const result = await getAuditoriaLogsAction({
      accion: filterAccion,
      tabla: filterTabla,
      usuario: filterUsuario,
      fecha: filterFecha,
      page: page
    });
    setLogs(result.data);
    setTotalCount(result.count);
    setLoading(false);
  }, [filterAccion, filterTabla, filterUsuario, filterFecha, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("auditoria_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs_auditoria" },
        (payload) => {
          // Recargar logs cuando haya una nueva entrada (ej. en pacientes u otra tabla auditada)
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  // Botón "Limpiar filtros" — resetea todo a su estado por defecto; el
  // propio cambio de estado dispara loadLogs vía el useEffect existente.
  const handleClearFilters = () => {
    setFilterAccion("");
    setFilterTabla("");
    setFilterUsuario("");
    setFilterFecha(new Date().toISOString().split("T")[0]);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / 5) || 1;

  return (
    <>
      <Header title="Auditoría" />
      {/* Mismo esqueleto que ConfiguracionTiposClient.tsx: <header> fijo
          (bg-white, solo border-b, sin rounded ni sombra) con título y
          filtros — nada de esto scrollea. La tabla vive en su propia card
          dentro de <main>, que sí scrollea. */}
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
      <header className="shrink-0 flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
      {/* En mobile solo el título — ícono y descripción se ocultan. */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
          <Icon name="admin_panel_settings" size={24} />
        </div>
        <div>
          <h1 className="text-[15px] md:text-base font-bold text-slate-800">Auditoría y Control Operacional</h1>
          <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Monitorea los logs de seguridad y la actividad del sistema.</p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
        {/* Fila siempre visible: búsqueda + ícono filtro (colapsa/expande
            Acciones/Tablas/Fecha en <lg) + ícono limpiar. En lg+ los 3
            selects y "Filtrar" ya están siempre visibles debajo, así que el
            ícono de filtro no hace falta ahí. */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Usuario..."
              value={filterUsuario}
              onChange={(e) => setFilterUsuario(e.target.value)}
              className="w-full h-9 sm:h-10 pl-9 pr-3 py-1.5 sm:py-2 border border-slate-200 rounded-lg text-[13px] md:text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            title="Acciones, Tablas y Fecha"
            className={`lg:hidden relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center transition-colors ${
              filtersOpen ? "bg-cyan-50 border-cyan-300 text-cyan-600" : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
            }`}
          >
            <Icon name="filter_lines" size={18} />
          </button>

          <button
            type="button"
            onClick={handleClearFilters}
            title="Limpiar filtros"
            className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <Icon name="eraser" size={18} />
          </button>
        </div>

        {/* Acciones / Tablas / Fecha + Filtrar — siempre visibles en lg+;
            colapsados detrás del ícono de arriba en tablet/mobile. */}
        <div className={`grid-cols-1 sm:grid-cols-3 gap-3 ${filtersOpen ? "grid" : "hidden"} lg:grid lg:grid-cols-4`}>
          <Select
            value={filterAccion}
            onChange={setFilterAccion}
            placeholder="Todas las Acciones"
            options={[
              { value: "INSERT", label: "INSERT" },
              { value: "UPDATE", label: "UPDATE" },
              { value: "DELETE", label: "DELETE" },
            ]}
          />

          <Select
            value={filterTabla}
            onChange={setFilterTabla}
            placeholder="Todas las Tablas"
            options={TABLAS.map((t) => ({ value: t, label: t }))}
          />

          <DatePicker value={filterFecha} onChange={setFilterFecha} />

          <button
            type="submit"
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-[13px] md:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Icon name="filter_lines" size={16} />
            Filtrar
          </button>
        </div>
      </form>
      </header>

      {/* Sin padding ni card propia: el <main> continúa el mismo fondo
          blanco del <header>, así se ven como un solo bloque. */}
      <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden relative">
        {loading && (
           <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col gap-px pt-2 px-2">
             {Array.from({ length: 8 }).map((_, i) => (
               <div key={i} className="flex items-center gap-4 px-3 py-3">
                 <Skeleton className="h-2.5 w-24" />
                 <Skeleton className="h-2.5 w-28" />
                 <Skeleton className="h-4 w-16 rounded" />
                 <Skeleton className="h-2.5 w-20" />
                 <Skeleton className="h-2.5 w-10 ml-auto" />
               </div>
             ))}
           </div>
        )}

        {totalCount > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(page - 1) * 5 + 1}–{Math.min(page * 5, totalCount)}</span> de <span className="font-semibold text-slate-700">{totalCount}</span> registros
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              <span className="text-[12px] md:text-[13px] font-semibold text-slate-700">{page}/{totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 640 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Fecha y Hora</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Usuario</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Acción</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Tabla</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Registro ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? (
                logs.map((log) => {
                  const personalUser = log.usuarios?.personal?.[0] || log.usuarios?.personal;
                  const userName = personalUser ? `${personalUser.nombre} ${personalUser.apellido}` : log.usuario_id;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap text-[10px] md:text-[11px]">
                        {new Date(log.fecha).toLocaleString("es-ES", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700">
                        {userName}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold ${
                          log.accion === 'INSERT' ? 'bg-emerald-100 text-emerald-700' :
                          log.accion === 'UPDATE' ? 'bg-amber-100 text-amber-700' :
                          log.accion === 'DELETE' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.accion}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-medium">
                        {log.tabla_afectada}
                      </td>
                      <td className="px-5 py-3 text-[10px] md:text-[11px] text-slate-400 font-mono">
                        {log.registro_id}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No se encontraron registros para esta fecha y filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet — tarjetas. pb extra para despejar el BottomNav
            (fixed, se dibuja encima del contenido). */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
          {logs.length === 0 ? (
            <p className="text-center text-[13px] md:text-sm text-slate-400 py-12">No se encontraron registros para esta fecha y filtros.</p>
          ) : (
            logs.map((log) => {
              const personalUser = log.usuarios?.personal?.[0] || log.usuarios?.personal;
              const userName = personalUser ? `${personalUser.nombre} ${personalUser.apellido}` : log.usuario_id;
              return (
                <div key={log.id} className="p-4 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold ${
                      log.accion === 'INSERT' ? 'bg-emerald-100 text-emerald-700' :
                      log.accion === 'UPDATE' ? 'bg-amber-100 text-amber-700' :
                      log.accion === 'DELETE' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {log.accion}
                    </span>
                    <span className="text-[10px] md:text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.fecha).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Tabla</span>
                    <p className="text-[13px] md:text-sm font-medium text-slate-700">{log.tabla_afectada}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] md:text-[11px] text-slate-500">
                    <span className="truncate">Usuario: {userName}</span>
                    <span className="font-mono text-slate-400 shrink-0">ID: {log.registro_id}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
      </div>
    </>
  );
}
