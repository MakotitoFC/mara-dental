"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { FilterTag } from "@/components/ui/FilterTag";
import { SmartPopover } from "@/components/ui/SmartPopover";
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

type TagKey = "accion" | "tabla" | "fecha";

// Nombres del set de íconos ya usado en toda la app (ver src/components/ui/Icon.tsx
// → ICONS): "bolt"/"table_chart" NO existen ahí (Icon renderiza un <span>
// vacío si el nombre no matchea), por eso no se veían. "history" y "database"
// sí están mapeados (RotateCcw / Database de lucide-react).
const TAG_META: Record<TagKey, { label: string; icon: string }> = {
  accion: { label: "Acciones", icon: "history" },
  tabla: { label: "Tablas", icon: "database" },
  fecha: { label: "Fecha", icon: "calendar_today" },
};

const AVAILABLE_KEYS: TagKey[] = ["accion", "tabla", "fecha"];

/** Paso 1 (mismo patrón que Calendario/Dashboard Directivo/Personal): lista
    simple de categorías, SIN sus opciones internas. variant "icon": botón
    maestro. variant "chip": "+ Filtro" al final de la fila de tags. */
function FilterCategoryPicker({
  variant, activeKeys, onToggle,
}: {
  variant: "icon" | "chip";
  activeKeys: Set<TagKey>;
  onToggle: (k: TagKey) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SmartPopover
      open={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) =>
        variant === "icon" ? (
          <button
            ref={ref}
            type="button"
            onClick={() => setOpen((o) => !o)}
            title="Filtros"
            aria-label="Filtros"
            className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-colors ${
              open || activeKeys.size > 0 ? "bg-cyan-50 text-cyan-600" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Icon name="filter_lines" size={18} />
          </button>
        ) : (
          <button
            type="button"
            ref={ref}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium bg-cyan-500/5 text-cyan-600 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors shrink-0"
          >
            <Icon name="add" size={14} className="shrink-0" />
            Filtro
          </button>
        )
      }
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg py-1.5"
      >
        {AVAILABLE_KEYS.map((k) => {
          const active = activeKeys.has(k);
          return (
            <button
              key={k}
              type="button"
              onMouseDown={() => { onToggle(k); setOpen(false); }}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${active ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
            >
              <Icon name={TAG_META[k].icon} size={15} className={active ? "text-cyan-600" : "text-slate-400"} />
              <span className="flex-1">{TAG_META[k].label}</span>
              {active && <Icon name="check" size={14} className="text-cyan-600" />}
            </button>
          );
        })}
      </motion.div>
    </SmartPopover>
  );
}

/** Paso 2: tag de filtro activo con dropdown propio. `children` es un
    render-prop que recibe `close()` — así tanto una lista de opciones
    (Acciones/Tablas, cierra al elegir) como un input nativo de fecha
    (Fecha, cierra al cambiar) pueden cerrar ESTE MISMO popover al aplicar su
    selección, sin importar qué tipo de control interno usen. */
function TagDropdown({
  icon, label, onRemove, children, panelClassName,
}: {
  icon: string;
  label: string;
  onRemove: () => void;
  children: (close: () => void) => React.ReactNode;
  /** Override para categorías cuyo contenido NO es una lista larga (ej.
      "Fecha", que trae el DatePicker del sistema) — el `max-h-72
      overflow-y-auto` por defecto está pensado para listas (Acciones/Tablas)
      y recortaría/scrollearía un calendario mensual completo sin necesidad. */
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SmartPopover
      open={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) => (
        <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon={icon} label={label} />
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={panelClassName ?? "min-w-[200px] max-h-72 overflow-y-auto no-scrollbar bg-white border border-slate-200 rounded-lg shadow-lg p-1"}
      >
        {children(() => setOpen(false))}
      </motion.div>
    </SmartPopover>
  );
}

/** Ventana de números de página con elipsis — mismo patrón que Catálogo de
 * Tratamientos y Personal ("1 2 3 ... 8 9 10"). */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total - 2, total - 1, total];
  if (current >= total - 2) return [1, 2, 3, "...", total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

/** Ventana compacta de 2 números para la píldora flotante de mobile. */
function getMobilePageWindow(current: number, total: number): number[] {
  if (total <= 1) return [1];
  if (current >= total) return [total - 1, total];
  return [current, current + 1];
}

export default function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterAccion, setFilterAccion] = useState("");
  const [filterTabla, setFilterTabla] = useState("");
  const [filterUsuario, setFilterUsuario] = useState("");
  const [filterFecha, setFilterFecha] = useState(new Date().toISOString().split("T")[0]);

  const [page, setPage] = useState(1);
  // Tags de "filtros activos": solo aparecen cuando el usuario los agrega a
  // mano desde el picker de 2 pasos (botón maestro o "+ Filtro" → elige
  // categoría → aparece el tag) — mismo patrón que Calendario/Dashboard
  // Directivo/Personal.
  const [activeTags, setActiveTags] = useState<Set<TagKey>>(new Set());
  const toggleTag = (key: TagKey) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const removeTag = (key: TagKey) => {
    setActiveTags((prev) => { const next = new Set(prev); next.delete(key); return next; });
    setPage(1);
    if (key === "accion") setFilterAccion("");
    else if (key === "tabla") setFilterTabla("");
    else if (key === "fecha") setFilterFecha(new Date().toISOString().split("T")[0]);
  };

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
        <div>
          <h1 className="text-[15px] md:text-base font-bold text-slate-800">Auditoría y Control Operacional</h1>
          <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Monitorea los logs de seguridad y la actividad del sistema.</p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
        {/* Búsqueda + botón maestro de filtro (mismo patrón que
            Calendario/Dashboard Directivo/Personal): un solo ícono
            reemplaza los 3 selects sueltos + el botón "Filtrar" que había
            antes. Los filtros ya aplican en vivo (loadLogs corre en un
            useEffect atado al estado), así que no hace falta un submit
            explícito para ellos. */}
        <div className="flex items-center gap-2">
          {/* Mismo diseño y ancho que el buscador de Catálogo/Personal. */}
          <div className="flex-1 min-w-0 sm:max-w-xs lg:max-w-md relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario..."
              value={filterUsuario}
              onChange={(e) => setFilterUsuario(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Paso 1 — lista simple de categorías, sin sus opciones internas.
              justify-between (arriba) lo empuja al extremo derecho de la
              fila, separado del buscador en vez de pegado a su lado. */}
          <FilterCategoryPicker variant="icon" activeKeys={activeTags} onToggle={toggleTag} />
        </div>

        {/* Paso 2 — tags interactivos (aparecen solo si el usuario los
            agregó desde el picker de arriba); "+ Filtro" al final reabre el
            mismo picker. Sin "Limpiar todo": cada X quita su propio filtro.
            Si no hay ninguno, la fila entera no se renderiza. */}
        {activeTags.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeTags.has("accion") && (
              <TagDropdown
                icon={TAG_META.accion.icon}
                label={`Acciones: ${filterAccion || "Todas"}`}
                onRemove={() => removeTag("accion")}
              >
                {(close) => (
                  <>
                    {[
                      { value: "", label: "Todas las Acciones" },
                      { value: "INSERT", label: "INSERT" },
                      { value: "UPDATE", label: "UPDATE" },
                      { value: "DELETE", label: "DELETE" },
                    ].map((o) => (
                      <button
                        key={o.value || "todas"}
                        type="button"
                        onMouseDown={() => { setFilterAccion(o.value); setPage(1); close(); }}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${o.value === filterAccion ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </>
                )}
              </TagDropdown>
            )}

            {activeTags.has("tabla") && (
              <TagDropdown
                icon={TAG_META.tabla.icon}
                label={`Tabla: ${filterTabla || "Todas"}`}
                onRemove={() => removeTag("tabla")}
              >
                {(close) => (
                  <>
                    <button
                      type="button"
                      onMouseDown={() => { setFilterTabla(""); setPage(1); close(); }}
                      className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${filterTabla === "" ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                    >
                      Todas las Tablas
                    </button>
                    {TABLAS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onMouseDown={() => { setFilterTabla(t); setPage(1); close(); }}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${t === filterTabla ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </>
                )}
              </TagDropdown>
            )}

            {activeTags.has("fecha") && (
              <TagDropdown
                icon={TAG_META.fecha.icon}
                label={`Fecha: ${filterFecha}`}
                onRemove={() => removeTag("fecha")}
                panelClassName="bg-white border border-slate-200 rounded-lg shadow-lg p-3"
              >
                {(close) => (
                  // Mismo DatePicker que usa el resto del sistema — calendario
                  // mensual con navegación por chevrons, y ya detecta bordes de
                  // pantalla solo (flip()/shift() de floating-ui, dentro de
                  // SmartPopover). Al elegir el día se completa la fecha
                  // (día+mes+año, según en qué mes/año esté parado el
                  // calendario) y se cierra ESTE tag (close()) en el mismo
                  // evento, sin depender de un click afuera. Sin botones
                  // "Hoy"/"Borrar": el valor por defecto ya es hoy, y "Borrar"
                  // duplicaba la X del propio tag.
                  <DatePicker
                    value={filterFecha}
                    onChange={(v) => { setFilterFecha(v); setPage(1); close(); }}
                  />
                )}
              </TagDropdown>
            )}

            <FilterCategoryPicker variant="chip" activeKeys={activeTags} onToggle={toggleTag} />
          </div>
        )}
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

        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 640 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Usuario</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Tabla</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Fecha y Hora</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? (
                logs.map((log) => {
                  const personalUser = log.usuarios?.personal?.[0] || log.usuarios?.personal;
                  const userName = personalUser ? `${personalUser.nombre} ${personalUser.apellido}` : log.usuario_id;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                            <Icon name="person" size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 truncate">{userName}</p>
                            <p className="text-[12px] text-slate-500 truncate font-mono">Registro ID: {log.registro_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {log.tabla_afectada}
                      </td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-[10px] md:text-[11px]">
                        {new Date(log.fecha).toLocaleString("es-ES", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] md:text-[11px] font-semibold rounded-full ${
                          log.accion === 'INSERT' ? 'bg-emerald-50 text-emerald-600' :
                          log.accion === 'UPDATE' ? 'bg-amber-50 text-amber-600' :
                          log.accion === 'DELETE' ? 'bg-red-50 text-red-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            log.accion === 'INSERT' ? 'bg-emerald-500' :
                            log.accion === 'UPDATE' ? 'bg-amber-500' :
                            log.accion === 'DELETE' ? 'bg-red-500' :
                            'bg-slate-400'
                          }`} />
                          {log.accion}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-[13px] md:text-sm text-slate-500">
                    No se encontraron registros para esta fecha y filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet — tarjetas. pb extra para despejar el BottomNav
            (fixed, se dibuja encima del contenido aunque main quepa en la
            pantalla) — en md+ el nav está oculto así que ahí no hace falta. */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar bg-slate-50 p-3 flex flex-col">
          <div className="flex flex-col gap-3">
            {logs.length === 0 ? (
              <p className="text-center text-[13px] text-slate-400 py-10">No se encontraron registros para esta fecha y filtros.</p>
            ) : (
              logs.map((log) => {
                const personalUser = log.usuarios?.personal?.[0] || log.usuarios?.personal;
                const userName = personalUser ? `${personalUser.nombre} ${personalUser.apellido}` : log.usuario_id;
                return (
                  <div key={log.id} className="bg-white rounded-xl border border-slate-200 flex flex-col">
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400">#{log.id}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full ${
                        log.accion === 'INSERT' ? 'bg-emerald-50 text-emerald-600' :
                        log.accion === 'UPDATE' ? 'bg-amber-50 text-amber-600' :
                        log.accion === 'DELETE' ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          log.accion === 'INSERT' ? 'bg-emerald-500' :
                          log.accion === 'UPDATE' ? 'bg-amber-500' :
                          log.accion === 'DELETE' ? 'bg-red-500' :
                          'bg-slate-400'
                        }`} />
                        {log.accion}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                          <Icon name="person" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] text-slate-700 truncate">{userName}</p>
                          <p className="text-[12px] text-slate-500 truncate">{log.tabla_afectada}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="font-mono">ID: {log.registro_id}</span>
                        <span>
                          {new Date(log.fecha).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Paginación mobile — píldora flotante, centrada, pegada al fondo
              del área con scroll (sticky dentro del mismo contenedor): las
              tarjetas siguen desplazándose por debajo, visibles a través del
              blur sutil del fondo translúcido. */}
          {totalPages > 1 && (
            <div className="mt-3 sticky bottom-0 self-center z-10 flex items-center gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full shadow-lg px-1.5 py-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              {getMobilePageWindow(page, totalPages).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-full text-[12px] font-semibold transition-colors ${
                    p === page ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Paginación desktop/tablet — debajo de la tabla, patrón "Anterior /
            1 2 3 ... / Siguiente". En mobile se oculta: ahí la paginación es
            la píldora flotante dentro de la lista de tarjetas. */}
        {totalCount > 0 && (
          <div className="hidden sm:flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap border-t border-slate-200">
            <span className="text-[12.5px] text-slate-500 whitespace-nowrap">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="shrink-0 w-8 h-8 flex items-center justify-center text-[12.5px] text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`shrink-0 w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-colors ${
                      p === page ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
      </div>
    </>
  );
}
