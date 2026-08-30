"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { FilterCategoryPicker, type FilterCategoryMeta } from "@/components/ui/FilterCategoryPicker";
import { TagDropdown } from "@/components/ui/TagDropdown";
import { TextInput } from "@/components/ui/TextInput";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPresupuestosPaginadosAction } from "../contador.actions";

type FilterTagKey = "sede" | "estado";
const FILTER_CATEGORIES: Record<FilterTagKey, FilterCategoryMeta> = {
  sede: { label: "Sede", icon: "location_on" },
  estado: { label: "Estado", icon: "check_circle" },
};

const ESTADO_TAB_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "pendientes", label: "Por Cobrar" },
  { value: "pagados", label: "Pagados" },
  { value: "rechazados", label: "Rechazados" },
];

/** Ventana de números de página con elipsis — mismo patrón que Personal
 * ("1 2 3 ... 8 9 10"). */
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

export default function PresupuestosClient({
  initialResult,
  sedes = [],
}: {
  initialResult: { data: any[]; total: number; totalPages: number };
  sedes?: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  // Filtros y Paginación
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState(searchParams?.get("filtro") || "todos");
  const [sedeId, setSedeId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 7;

  // Tags de filtro activo: solo aparecen al elegirlos desde el picker
  // maestro (mismo patrón que Dashboard Directivo/Personal/Auditoría/
  // Diagnóstico/Presupuesto de paciente).
  const [activeFilterTags, setActiveFilterTags] = useState<Set<FilterTagKey>>(new Set());
  const toggleFilterTag = (k: FilterTagKey) => {
    setActiveFilterTags((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };
  const removeFilterTag = (k: FilterTagKey) => {
    setActiveFilterTags((prev) => { const next = new Set(prev); next.delete(k); return next; });
    setPage(1);
    if (k === "sede") setSedeId("");
    else if (k === "estado") setFiltro("todos");
  };

  const [dataState, setDataState] = useState(initialResult);
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<any | null>(null);

  // Cargar datos al cambiar filtros
  async function fetchPresupuestos(p = page, q = query, f = filtro, s = sedeId) {
    startTransition(async () => {
      const res = await getPresupuestosPaginadosAction({
        page: p,
        pageSize,
        query: q,
        filtro: f,
        sedeId: s,
      });
      setDataState(res);
    });
  }

  // Debounced search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPresupuestos(1, query, filtro, sedeId);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filtro, sedeId]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("realtime-presupuestos-unified")
      .on("postgres_changes", { event: "*", schema: "public", table: "presupuestos" }, () => {
        fetchPresupuestos();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "movimiento_caja" }, () => {
        fetchPresupuestos();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cuotas" }, () => {
        fetchPresupuestos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, query, filtro, sedeId]);

  const presupuestos = dataState.data || [];
  const totalPages = dataState.totalPages || 1;
  const totalRecords = dataState.total || 0;

  function getEstadoBadge(t: any) {
    if (t.estado === "rechazado" || t.estado === "anulado") {
      return <Badge status="error" className="text-[10px]">Rechazado</Badge>;
    }
    if (t.es_pagado) {
      return <Badge status="success" className="text-[10px]">Pagado</Badge>;
    }
    return (
      <Badge status="pending" className="text-[10px]">
        Pendiente {t.cuotas_pendientes_count > 0 ? `(${t.cuotas_pendientes_count} cuotas)` : ""}
      </Badge>
    );
  }

  return (
    <>
      <Header title="Presupuestos y Cobranzas" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        {/* Header Principal */}
        <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4">
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-base font-bold text-slate-800">Presupuestos y Cobranzas</h1>
            <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Gestión de presupuestos emitidos, cobranzas y cuotas por cobrar.</p>
          </div>

          {/* Barra de Búsqueda + botón maestro de filtro (mismo patrón que
              Dashboard Directivo/Personal/Auditoría/Diagnóstico/Presupuesto
              de paciente): reemplaza el select de Sede + las 4 pestañas de
              Estado sueltas. */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1 max-w-xs">
              <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <TextInput
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente por nombre o DNI..."
                className="pl-10 pr-4"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>

            {/* Paso 1 — lista simple de categorías (Sede/Estado), sin sus
                opciones internas. Icon-only, sin estilo de tag cian. */}
            <FilterCategoryPicker variant="icon" categories={FILTER_CATEGORIES} activeKeys={activeFilterTags} onToggle={toggleFilterTag} />
          </div>

          {/* Paso 2 — tags interactivos (aparecen solo si se eligieron desde
              el picker); "+ Filtro" al final los reabre. Sin botón de
              limpiar: cada X quita su propio filtro. */}
          {activeFilterTags.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilterTags.has("sede") && (
                <TagDropdown
                  icon="location_on"
                  label={`Sede: ${sedeId ? (sedes.find((s: any) => String(s.id) === sedeId)?.nombre_clinica ?? "—") : "Todas las Sedes"}`}
                  onRemove={() => removeFilterTag("sede")}
                >
                  {(close) => (
                    <>
                      <button
                        type="button"
                        onMouseDown={() => { setSedeId(""); setPage(1); close(); }}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${sedeId === "" ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                      >
                        Todas las Sedes
                      </button>
                      {sedes.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => { setSedeId(String(s.id)); setPage(1); close(); }}
                          className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${String(s.id) === sedeId ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                        >
                          {s.nombre_clinica}
                        </button>
                      ))}
                    </>
                  )}
                </TagDropdown>
              )}
              {activeFilterTags.has("estado") && (
                <TagDropdown
                  icon="check_circle"
                  label={`Estado: ${ESTADO_TAB_OPTIONS.find((o) => o.value === filtro)?.label ?? "Todos"}`}
                  onRemove={() => removeFilterTag("estado")}
                >
                  {(close) => (
                    <>
                      {ESTADO_TAB_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onMouseDown={() => { setFiltro(o.value); setPage(1); close(); }}
                          className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${o.value === filtro ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </>
                  )}
                </TagDropdown>
              )}
              <FilterCategoryPicker variant="chip" categories={FILTER_CATEGORIES} activeKeys={activeFilterTags} onToggle={toggleFilterTag} />
            </div>
          )}
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
          {/* Tabla Desktop */}
          <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 950 }}>
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Paciente</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Fecha</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Total Neto</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Cobrado / Saldo</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-center">Estado</th>
                  <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isPending ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                          <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-2.5 w-40" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-3 w-24" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-3 w-20 ml-auto" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-3 w-24 ml-auto" /></td>
                      <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                    </tr>
                  ))
                ) : presupuestos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[13px] md:text-sm text-slate-500">
                      No se encontraron presupuestos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  presupuestos.map((t: any) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedPresupuesto(t)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                            <Icon name="assignment" size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{t.paciente?.nombre_completo || "Paciente General"}</p>
                            <p className="text-[12px] text-slate-500 truncate">{t.tratamientos}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-[12px] whitespace-nowrap">
                        {format(new Date(t.fecha_emision), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-900 whitespace-nowrap">
                        {t.moneda === "USD" ? "$" : "S/"} {Number(t.total_neto).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="font-mono text-emerald-600 text-[12px]">
                          Cobrado: {t.moneda === "USD" ? "$" : "S/"} {Number(t.pagado).toFixed(2)}
                        </div>
                        {t.saldo > 0.009 && (
                          <div className="font-mono text-amber-600 text-[12px] mt-0.5">
                            Saldo: {t.moneda === "USD" ? "$" : "S/"} {Number(t.saldo).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getEstadoBadge(t)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPresupuesto(t);
                          }}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 inline-flex items-center justify-center transition-colors"
                          title="Ver Detalle de Cobros y Cuotas"
                        >
                          <Icon name="visibility" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación desktop/tablet — mismo patrón de Personal. */}
          {!isPending && totalRecords > 0 && (
            <div className="hidden sm:flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap border-t border-slate-200">
              <span className="text-[12.5px] text-slate-500 whitespace-nowrap">Página {page} de {totalPages}</span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  disabled={page === 1 || isPending}
                  onClick={() => { const np = page - 1; setPage(np); fetchPresupuestos(np); }}
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
                      onClick={() => { setPage(p); fetchPresupuestos(p); }}
                      className={`shrink-0 w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-colors ${
                        p === page ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  disabled={page === totalPages || isPending}
                  onClick={() => { const np = page + 1; setPage(np); fetchPresupuestos(np); }}
                  className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <Icon name="chevron_right" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Vista Mobile Cards */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar bg-slate-50 p-3 flex flex-col">
            <div className="flex flex-col gap-3">
            {presupuestos.length === 0 ? (
              <p className="text-center text-[13px] text-slate-400 py-10">No hay presupuestos registrados.</p>
            ) : (
              presupuestos.map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedPresupuesto(t)}
                  className="bg-white rounded-xl border border-slate-200 flex flex-col active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400">{format(new Date(t.fecha_emision), "dd/MM/yyyy")}</span>
                    {getEstadoBadge(t)}
                  </div>
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                        <Icon name="assignment" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-slate-800 truncate">{t.paciente?.nombre_completo || "Paciente General"}</p>
                        <p className="text-[12px] text-slate-500 truncate">{t.tratamientos}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <span className="font-mono text-[13px] text-slate-900">
                        {t.moneda === "USD" ? "$" : "S/"} {Number(t.total_neto).toFixed(2)}
                      </span>
                      {t.saldo > 0.009 ? (
                        <span className="font-mono text-amber-600 text-[11px] font-semibold">
                          Saldo: S/ {Number(t.saldo).toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-mono text-emerald-600 text-[11px] font-semibold">
                          Cobrado: {t.moneda === "USD" ? "$" : "S/"} {Number(t.pagado).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            </div>

            {!isPending && totalPages > 1 && (
              <div className="mt-3 sticky bottom-0 self-center z-10 flex items-center gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full shadow-lg px-1.5 py-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => { const np = page - 1; setPage(np); fetchPresupuestos(np); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon name="chevron_left" size={16} />
                </button>
                {getMobilePageWindow(page, totalPages).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); fetchPresupuestos(p); }}
                    className={`w-7 h-7 rounded-full text-[12px] font-semibold transition-colors ${
                      p === page ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => { const np = page + 1; setPage(np); fetchPresupuestos(np); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon name="chevron_right" size={16} />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal / Drawer de Detalle del Presupuesto y Cobranza */}
      <AnimatePresence>
        {selectedPresupuesto && (
          <ResponsiveSheet
            onClose={() => setSelectedPresupuesto(null)}
            title={`Presupuesto #${selectedPresupuesto.id}`}
          >
            <div className="space-y-5 text-[13px]">
              {/* Resumen Superior */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Neto</span>
                    <span className="text-2xl font-bold font-mono text-slate-800">
                      {selectedPresupuesto.moneda === "USD" ? "$" : "S/"} {Number(selectedPresupuesto.total_neto).toFixed(2)}
                    </span>
                  </div>
                  {getEstadoBadge(selectedPresupuesto)}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-center">
                  <div className="bg-cyan-500/5 p-2 rounded-xl border border-cyan-500/40">
                    <span className="text-[10px] font-semibold text-cyan-600 block">Total Pagado</span>
                    <span className="text-base font-bold font-mono text-cyan-600">
                      S/ {Number(selectedPresupuesto.pagado).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-cyan-500/5 p-2 rounded-xl border border-cyan-500/40">
                    <span className="text-[10px] font-semibold text-cyan-600 block">Saldo Pendiente</span>
                    <span className="text-base font-bold font-mono text-cyan-600">
                      S/ {Number(selectedPresupuesto.saldo).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Información del Paciente */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Icon name="person" size={16} className="text-cyan-600" /> Información del Paciente
                </h3>
                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Nombre</span>
                    <span className="text-slate-800">{selectedPresupuesto.paciente?.nombre_completo || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">DNI</span>
                    <span className="font-mono text-slate-800">{selectedPresupuesto.paciente?.dni || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Sede Asignada</span>
                    <span className="font-medium text-slate-700">{selectedPresupuesto.paciente?.sede_nombre || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Doctor Asignado</span>
                    <span className="font-medium text-slate-700">{selectedPresupuesto.doctor_nombre}</span>
                  </div>
                </div>
              </div>

              {/* Detalle de Cuotas */}
              {selectedPresupuesto.cuotas?.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Icon name="calendar_month" size={16} className="text-blue-600" /> Plan de Cuotas ({selectedPresupuesto.cuotas.length})
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {selectedPresupuesto.cuotas.map((c: any) => {
                      const isPaid = c.estado === "pagado" || c.movimiento_caja_id;
                      return (
                        <div key={c.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800">Cuota #{c.numero_cuota}</span>
                            <span className="text-[11px] text-slate-400 block">
                              Vence: {c.fecha_vencimiento ? format(new Date(c.fecha_vencimiento + "T00:00:00"), "dd/MM/yyyy") : "-"}
                            </span>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800">S/ {Number(c.monto).toFixed(2)}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-medium rounded-full ${
                              isPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50/60 text-amber-600"
                            }`}>
                              {isPaid ? "Pagada" : "Pendiente"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Historial de Pagos y Transacciones */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Icon name="payments" size={16} className="text-emerald-600" /> Pagos Registrados
                </h3>
                {selectedPresupuesto.movimientos?.length === 0 ? (
                  <p className="text-[12px] text-slate-400 py-2">No se han registrado pagos para este presupuesto.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selectedPresupuesto.movimientos.map((m: any) => (
                      <div key={m.id} className="py-2 flex items-center justify-between text-[12px]">
                        <div>
                          <span className="font-semibold text-slate-700">Pago Registrado</span>
                          <span className="text-[10px] text-slate-400 block">ID: {m.id}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold ${m.estado === "anulado" ? "line-through text-slate-400" : "text-emerald-600"}`}>
                            S/ {Math.abs(Number(m.monto)).toFixed(2)}
                          </span>
                          <span className={`block text-[9px] font-medium ${
                            m.estado === "confirmado" ? "text-emerald-600" : "text-red-600"
                          }`}>
                            {m.estado.charAt(0).toUpperCase() + m.estado.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
    </>
  );
}

