"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { getAuditoriaLogsAction } from "../admin.actions";

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
  const [isTablaDropdownOpen, setIsTablaDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTablaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const totalPages = Math.ceil(totalCount / 20) || 1;

  return (
    <div className="p-6 max-w-6xl mx-auto w-full flex flex-col gap-6 relative">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Auditoría y Control Operacional</h1>
        <p className="text-sm text-slate-500">Monitorea los logs de seguridad y la actividad del sistema.</p>
      </div>

      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Usuario..."
            value={filterUsuario}
            onChange={(e) => setFilterUsuario(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
          />
        </div>
        
        <div className="relative">
          <Icon name="history" size={16} className="absolute left-3 top-3 text-slate-400" />
          <select
            value={filterAccion}
            onChange={(e) => setFilterAccion(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none appearance-none cursor-pointer"
          >
            <option value="">Todas las Acciones</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <Icon name="expand_more" size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
        </div>

        {/* Custom Select for Tablas with max height (approx 5 items) */}
        <div className="relative" ref={dropdownRef}>
          <Icon name="database" size={16} className="absolute left-3 top-3 text-slate-400" />
          <div 
            onClick={() => setIsTablaDropdownOpen(!isTablaDropdownOpen)}
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer select-none whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {filterTabla || "Todas las Tablas"}
          </div>
          <Icon name="expand_more" size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
          
          {isTablaDropdownOpen && (
            <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto max-h-[170px]">
              <div 
                onClick={() => { setFilterTabla(""); setIsTablaDropdownOpen(false); }}
                className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer"
              >
                Todas las Tablas
              </div>
              {TABLAS.map(t => (
                <div 
                  key={t}
                  onClick={() => { setFilterTabla(t); setIsTablaDropdownOpen(false); }}
                  className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer"
                >
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <Icon name="calendar_month" size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="date"
            value={filterFecha}
            onChange={(e) => setFilterFecha(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
          />
        </div>

        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap shadow-sm">
          Filtrar
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-[400px] relative">
        {loading && (
           <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 text-slate-400">
             <div className="w-8 h-8 border-2 border-t-cyan-500 rounded-full animate-spin" />
             <p className="text-sm font-medium">Cargando datos...</p>
           </div>
        )}
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 font-semibold text-slate-500">Fecha y Hora</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Usuario</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Acción</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Tabla</th>
                <th className="px-5 py-3 font-semibold text-slate-500">Registro ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? (
                logs.map((log) => {
                  const personalUser = log.usuarios?.personal?.[0] || log.usuarios?.personal;
                  const userName = personalUser ? `${personalUser.nombre} ${personalUser.apellido}` : log.usuario_id;
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {new Date(log.fecha).toLocaleString("es-ES", {
                          day: "2-digit", month: "2-digit", year: "numeric", 
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700">
                        {userName}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
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
                      <td className="px-5 py-3 text-xs text-slate-400 font-mono">
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span> ({totalCount} registros)
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
