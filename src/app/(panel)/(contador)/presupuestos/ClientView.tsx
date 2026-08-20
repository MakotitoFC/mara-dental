"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPresupuestosPaginadosAction } from "../contador.actions";

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
  const pageSize = 10;

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
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">RECHAZADO</span>;
    }
    if (t.es_pagado) {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">PAGADO</span>;
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
        PENDIENTE {t.cuotas_pendientes_count > 0 ? `(${t.cuotas_pendientes_count} CUOTAS)` : ""}
      </span>
    );
  }

  return (
    <>
      <Header title="Presupuestos y Cobranzas" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        {/* Header Principal */}
        <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0 hidden sm:flex">
                <Icon name="assignment" size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="text-[16px] md:text-lg font-bold text-slate-800">Presupuestos y Cobranzas</h1>
                <p className="text-[12px] md:text-[13px] text-slate-500">Gestión de presupuestos emitidos, cobranzas y cuotas por cobrar.</p>
              </div>
            </div>
            <div className="shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-2 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Actualizado en Vivo</span>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
            {/* Input de Búsqueda de Paciente */}
            <div className="relative flex-1 max-w-md">
              <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar paciente por nombre o DNI..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-cyan-500 transition-colors"
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

            {/* Selector de Sede */}
            <div className="flex items-center gap-2">
              <select
                value={sedeId}
                onChange={(e) => {
                  setSedeId(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-700 outline-none focus:bg-white focus:border-cyan-500 transition-colors font-medium"
              >
                <option value="">Todas las Sedes</option>
                {sedes.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre_clinica}
                  </option>
                ))}
              </select>

              {/* Pestañas de Estado */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => { setFiltro("todos"); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                    filtro === "todos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => { setFiltro("pendientes"); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1 ${
                    filtro === "pendientes" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon name="pending_actions" size={14} /> Por Cobrar
                </button>
                <button
                  onClick={() => { setFiltro("pagados"); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1 ${
                    filtro === "pagados" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon name="check_circle" size={14} /> Pagados
                </button>
                <button
                  onClick={() => { setFiltro("rechazados"); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors hidden lg:flex items-center gap-1 ${
                    filtro === "rechazados" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Rechazados
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
          {/* Paginación Header */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[11px] text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{presupuestos.length}</span> de{" "}
              <span className="font-semibold text-slate-700">{totalRecords}</span> presupuestos
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1 || isPending}
                onClick={() => {
                  const np = page - 1;
                  setPage(np);
                  fetchPresupuestos(np);
                }}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              <span className="text-[12px] font-semibold text-slate-700">
                Pág. {page} de {totalPages}
              </span>
              <button
                disabled={page === totalPages || isPending}
                onClick={() => {
                  const np = page + 1;
                  setPage(np);
                  fetchPresupuestos(np);
                }}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>

          {/* Tabla Desktop */}
          <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
            <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 950 }}>
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Fecha</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Paciente / Sede</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500">Tratamiento</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Total Neto</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Cobrado / Saldo</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-center">Estado</th>
                  <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isPending ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-44" /></td>
                      <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-5 py-4 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                      <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                      <td className="px-5 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                    </tr>
                  ))
                ) : presupuestos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
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
                      <td className="px-5 py-4 text-slate-600">
                        {format(new Date(t.fecha_emision), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{t.paciente?.nombre_completo || "Paciente General"}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">DNI: {t.paciente?.dni || "-"}</span>
                          <span className="px-1.5 py-0.2 bg-cyan-50 text-cyan-700 font-semibold rounded text-[10px]">
                            {t.paciente?.sede_nombre || "Sede"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate text-slate-700 font-medium">
                        {t.tratamientos}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                        {t.moneda === "USD" ? "$" : "S/"} {Number(t.total_neto).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-mono text-emerald-600 font-bold text-[12px]">
                          Cobrado: {t.moneda === "USD" ? "$" : "S/"} {Number(t.pagado).toFixed(2)}
                        </div>
                        {t.saldo > 0.009 && (
                          <div className="font-mono text-amber-600 font-bold text-[12px] mt-0.5">
                            Saldo: {t.moneda === "USD" ? "$" : "S/"} {Number(t.saldo).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {getEstadoBadge(t)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPresupuesto(t);
                          }}
                          className="w-8 h-8 rounded-lg text-cyan-600 hover:bg-cyan-50 inline-flex items-center justify-center transition-colors"
                          title="Ver Detalle de Cobros y Cuotas"
                        >
                          <Icon name="visibility" size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Vista Mobile Cards */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
            {presupuestos.length === 0 ? (
              <p className="text-center text-[13px] text-slate-400 py-10">No hay presupuestos registrados.</p>
            ) : (
              presupuestos.map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedPresupuesto(t)}
                  className="p-4 flex flex-col gap-3 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[14px] text-slate-800 truncate">
                        {t.paciente?.nombre_completo || "Paciente General"}
                      </p>
                      <p className="text-[12px] text-cyan-700 font-medium">
                        {t.paciente?.sede_nombre || "Sede"} • DNI: {t.paciente?.dni || "-"}
                      </p>
                    </div>
                    {getEstadoBadge(t)}
                  </div>
                  <p className="text-[12px] text-slate-600 line-clamp-1">{t.tratamientos}</p>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[12px]">
                    <span className="text-slate-400">{format(new Date(t.fecha_emision), "dd/MM/yyyy")}</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-800">
                        {t.moneda === "USD" ? "$" : "S/"} {Number(t.total_neto).toFixed(2)}
                      </span>
                      {t.saldo > 0.009 && (
                        <span className="block font-mono font-bold text-amber-600 text-[11px]">
                          Saldo: S/ {Number(t.saldo).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
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
            footer={
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPresupuesto(null)}
                  className="px-5 py-2 text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            }
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
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Total Pagado</span>
                    <span className="text-base font-bold font-mono text-emerald-700">
                      S/ {Number(selectedPresupuesto.pagado).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-600 uppercase block">Saldo Pendiente</span>
                    <span className="text-base font-bold font-mono text-amber-700">
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
                    <span className="font-semibold text-slate-800">{selectedPresupuesto.paciente?.nombre_completo || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">DNI</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedPresupuesto.paciente?.dni || "-"}</span>
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
                    <Icon name="calendar_month" size={16} className="text-indigo-600" /> Plan de Cuotas ({selectedPresupuesto.cuotas.length})
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
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                              isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                            }`}>
                              {isPaid ? "PAGADA" : "PENDIENTE"}
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
                          <span className={`block text-[9px] font-bold uppercase ${
                            m.estado === "confirmado" ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {m.estado}
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

