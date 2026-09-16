"use client";

import { useState, useEffect, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  getMovimientosCajaFiltradosAction,
  getCategoriasParaFiltroAction,
  toggleConciliadoAction,
  type FiltrosMovimientosContador,
  type MovimientoCajaDetallado,
  type MovimientosCajaFiltradosResult,
} from "../../contador.actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total - 2, total - 1, total];
  if (current >= total - 2) return [1, 2, 3, "...", total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function MovimientosCajaView() {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Filtros con valores por defecto
  const [temporalidad, setTemporalidad] = useState<"hoy" | "mes" | "año" | "fecha" | "historico">("hoy");
  const [fechaEspecifica, setFechaEspecifica] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [estado, setEstado] = useState<"todos" | "confirmado" | "pendiente" | "anulado">("todos");
  const [tipo, setTipo] = useState<"todos" | "I" | "E">("todos");
  const [categoriaId, setCategoriaId] = useState<number | "todos">("todos");
  const [page, setPage] = useState(1);

  // Datos
  const [categorias, setCategorias] = useState<{ id: number; nombre: string; tipo: string }[]>([]);
  const [data, setData] = useState<MovimientosCajaFiltradosResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Cargar categorías disponibles para filtro
  useEffect(() => {
    getCategoriasParaFiltroAction().then((cats) => setCategorias(cats || []));
  }, []);

  // Función de carga de movimientos
  const fetchMovimientos = (targetPage = page) => {
    setLoading(true);
    const filtros: FiltrosMovimientosContador = {
      temporalidad,
      fechaEspecifica: temporalidad === "fecha" ? fechaEspecifica : undefined,
      estado,
      tipo,
      categoriaId,
    };

    startTransition(async () => {
      try {
        const res = await getMovimientosCajaFiltradosAction(filtros, {
          page: targetPage,
          pageSize: 15,
        });
        setData(res);
      } catch (err: any) {
        console.error("Error cargando movimientos:", err);
        toast.error("Error al cargar los movimientos de caja");
      } finally {
        setLoading(false);
      }
    });
  };

  // Recargar al cambiar filtros
  useEffect(() => {
    setPage(1);
    fetchMovimientos(1);
  }, [temporalidad, fechaEspecifica, estado, tipo, categoriaId]);

  // Cambio de página
  const handlePageChange = (newPage: number) => {
    if (newPage === page || newPage < 1 || (data && newPage > data.totalPages)) return;
    setPage(newPage);
    fetchMovimientos(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Conciliar / Desconciliar
  const handleToggleConciliado = async (mov: MovimientoCajaDetallado) => {
    setTogglingId(mov.id);
    const nuevoEstado = !mov.conciliado;
    try {
      const res = await toggleConciliadoAction(mov.id, nuevoEstado);
      if (res.success) {
        toast.success(nuevoEstado ? "Movimiento marcado como conciliado" : "Movimiento desconciliado");
        // Actualización optimista
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            movimientos: prev.movimientos.map((m) =>
              m.id === mov.id
                ? {
                    ...m,
                    conciliado: nuevoEstado,
                    fecha_conciliacion: nuevoEstado ? new Date().toISOString() : null,
                  }
                : m
            ),
          };
        });
      } else {
        toast.error(res.error || "No se pudo actualizar la conciliación");
      }
    } catch {
      toast.error("Error al actualizar la conciliación");
    } finally {
      setTogglingId(null);
    }
  };

  // Categorías filtradas por tipo seleccionado
  const categoriasOpciones = categorias
    .filter((c) => (tipo === "todos" ? true : c.tipo === tipo))
    .map((c) => ({
      value: String(c.id),
      label: `[${c.tipo === "I" ? "Ingreso" : "Egreso"}] ${c.nombre}`,
    }));

  const movimientos = data?.movimientos || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.totalCount || 0;
  const totales = data?.totales || { totalIngresos: 0, totalEgresos: 0, balance: 0 };

  const hoyStr = new Date().toISOString().split("T")[0];
  const hayFiltrosActivos =
    temporalidad !== "hoy" ||
    estado !== "todos" ||
    tipo !== "todos" ||
    categoriaId !== "todos";

  const handleLimpiarFiltros = () => {
    setTemporalidad("hoy");
    setFechaEspecifica(new Date().toISOString().split("T")[0]);
    setEstado("todos");
    setTipo("todos");
    setCategoriaId("todos");
    setPage(1);
    if (!hayFiltrosActivos) {
      fetchMovimientos(1);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* 1. Panel Superior de Filtros */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        {/* Cabecera del panel de filtros con título, badge de filtros activos y botón Limpiar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Icon name="filter_alt" size={17} className="text-cyan-600 shrink-0" />
            <span className="text-[13px] font-bold text-slate-800">Filtros de auditoría</span>
            {hayFiltrosActivos && (
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                Filtros aplicados
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleLimpiarFiltros}
            className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              hayFiltrosActivos
                ? "bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 shadow-2xs"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200/60"
            }`}
            title="Restablecer todos los filtros a sus valores por defecto (Hoy, Todos)"
          >
            <Icon name="refresh" size={14} className={isPending ? "animate-spin" : ""} />
            <span>Limpiar filtros</span>
          </button>
        </div>

        {/* Fila 1: Filtro de Temporalidad (Segmented Buttons) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Periodo de visualización
            </span>
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTemporalidad("hoy")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                  temporalidad === "hoy"
                    ? "bg-white text-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setTemporalidad("mes")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                  temporalidad === "mes"
                    ? "bg-white text-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mes actual
              </button>
              <button
                type="button"
                onClick={() => setTemporalidad("año")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                  temporalidad === "año"
                    ? "bg-white text-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Año actual
              </button>
              <button
                type="button"
                onClick={() => setTemporalidad("fecha")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  temporalidad === "fecha"
                    ? "bg-white text-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon name="calendar_today" size={13} />
                <span>Por fecha</span>
              </button>
              <button
                type="button"
                onClick={() => setTemporalidad("historico")}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  temporalidad === "historico"
                    ? "bg-white text-cyan-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon name="history" size={13} />
                <span>Histórico (Todo)</span>
              </button>
            </div>
          </div>

          {/* Datepicker condicional si elige "Por fecha" */}
          {temporalidad === "fecha" && (
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <label className="text-[12px] font-semibold text-slate-600 shrink-0">
                Seleccionar día:
              </label>
              <input
                type="date"
                value={fechaEspecifica}
                onChange={(e) => setFechaEspecifica(e.target.value)}
                className="h-9 border border-slate-300 rounded-xl px-2.5 py-1 text-[12.5px] bg-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          )}
        </div>

        {/* Fila 2: Filtros por Estado, Tipo y Categoría */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {/* Estado */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Estado
            </label>
            <Select
              value={estado}
              onChange={(v) => setEstado(v as any)}
              options={[
                { value: "todos", label: "Todos los estados" },
                { value: "confirmado", label: "Confirmados" },
                { value: "pendiente", label: "Pendientes" },
                { value: "anulado", label: "Anulados" },
              ]}
              className="w-full"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Tipo de Flujo
            </label>
            <Select
              value={tipo}
              onChange={(v) => {
                setTipo(v as any);
                setCategoriaId("todos");
              }}
              options={[
                { value: "todos", label: "Todos (Ingresos y Egresos)" },
                { value: "I", label: "Solo Ingresos (+)" },
                { value: "E", label: "Solo Egresos (−)" },
              ]}
              className="w-full"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Categoría
            </label>
            <Select
              value={String(categoriaId)}
              onChange={(v) => setCategoriaId(v === "todos" ? "todos" : Number(v))}
              options={[{ value: "todos", label: "Todas las categorías" }, ...categoriasOpciones]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 2. Resumen Financiero Rápido de los Movimientos Filtrados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
            <Icon name="receipt_long" size={16} className="text-slate-500" />
            Registros
          </span>
          <span className="text-[20px] font-bold font-mono text-slate-800">
            {totalCount} {totalCount === 1 ? "movimiento" : "movimientos"}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5 mb-1">
            <Icon name="trending_up" size={16} className="text-emerald-600" />
            Ingresos
          </span>
          <span className="text-[20px] font-bold font-mono text-emerald-600 truncate">
            +S/ {totales.totalIngresos.toFixed(2)}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5 mb-1">
            <Icon name="trending_down" size={16} className="text-red-500" />
            Egresos
          </span>
          <span className="text-[20px] font-bold font-mono text-red-500 truncate">
            −S/ {totales.totalEgresos.toFixed(2)}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1">
            <Icon name="account_balance_wallet" size={16} className="text-cyan-600" />
            Balance
          </span>
          <span
            className={`text-[20px] font-bold font-mono truncate ${
              totales.balance >= 0 ? "text-slate-900" : "text-red-600"
            }`}
          >
            S/ {totales.balance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 3. Listado de Movimientos (Mobile First Cards - No Table) */}
      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                </div>
                <Skeleton className="w-24 h-6 rounded-lg" />
              </div>
              <Skeleton className="w-full h-12 rounded-xl" />
            </div>
          ))
        ) : movimientos.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Icon name="search" size={24} />
            </div>
            <h3 className="text-[14.5px] font-bold text-slate-800">
              No se encontraron movimientos
            </h3>
            <p className="text-[12.5px] text-slate-500 max-w-sm">
              No hay movimientos de caja registrados con los filtros seleccionados para tu sede.
            </p>
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200/60 transition-colors cursor-pointer"
              >
                <Icon name="refresh" size={14} />
                <span>Restablecer filtros a hoy</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {movimientos.map((m) => {
              const esIngreso = m.categoria_tipo === "I";
              const esAnulado = m.estado === "anulado";
              const esPendiente = m.estado === "pendiente";

              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3.5 ${
                    esAnulado
                      ? "border-red-200/70 bg-red-50/20 opacity-80"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  {/* Fila 1: Cabecera con Icono, Categoría, Monto y Estado */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          esIngreso
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        <Icon
                          name={esIngreso ? "trending_up" : "trending_down"}
                          size={20}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[13.5px] text-slate-900 truncate">
                            {m.categoria_nombre}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              esIngreso
                                ? "bg-emerald-100/70 text-emerald-800"
                                : "bg-red-100/70 text-red-800"
                            }`}
                          >
                            {esIngreso ? "Ingreso" : "Egreso"}
                          </span>
                        </div>
                        <span className="text-[11.5px] text-slate-400 font-medium">
                          {format(new Date(m.fecha), "dd MMM yyyy, HH:mm", { locale: es })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`text-[17px] font-black font-mono tracking-tight ${
                          esAnulado
                            ? "line-through text-slate-400"
                            : esIngreso
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {esIngreso ? "+" : "−"}{m.moneda_codigo === "USD" ? "$" : "S/"}{" "}
                        {m.monto.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          esAnulado
                            ? "bg-red-100 text-red-700"
                            : esPendiente
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {m.estado}
                      </span>
                    </div>
                  </div>

                  {/* Fila 2: Entidad / Receptor / Paciente / Tercero */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
                        <Icon
                          name={
                            m.entidad_tipo === "paciente"
                              ? "person"
                              : m.entidad_tipo === "proveedor"
                              ? "store"
                              : m.entidad_tipo === "cliente"
                              ? "person"
                              : "assignment"
                          }
                          size={14}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                          {m.entidad_tipo === "paciente"
                            ? "Paciente"
                            : m.entidad_tipo === "proveedor"
                            ? "Proveedor"
                            : m.entidad_tipo === "cliente"
                            ? "Cliente Pagador"
                            : "Concepto"}
                        </span>
                        <p className="text-[12.5px] font-bold text-slate-800 truncate">
                          {m.entidad_nombre}
                        </p>
                      </div>
                    </div>
                    {m.entidad_documento && (
                      <span className="text-[11px] font-mono font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shrink-0">
                        Doc: {m.entidad_documento}
                      </span>
                    )}
                  </div>

                  {/* Fila 3: Metadatos en Cuadrícula (Medio de pago, Turno, Registrado por, Comprobante) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px] text-slate-600">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon name="payments" size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{m.medio_pago_nombre}</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0" title={`Turno abierto el ${m.turno_apertura}`}>
                      <Icon name="wallet" size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">Turno #{m.caja_turno_id.slice(0, 8)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0" title={`Registrado por ${m.usuario_nombre}`}>
                      <Icon name="badge_id" size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{m.usuario_nombre}</span>
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      {m.comprobante_serie_numero ? (
                        <span className="text-cyan-700 font-semibold truncate flex items-center gap-1" title={`${m.comprobante_tipo || "Comprobante"} ${m.comprobante_serie_numero}`}>
                          <Icon name="receipt_long" size={13} />
                          {m.comprobante_serie_numero}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sin comprobante</span>
                      )}
                    </div>
                  </div>

                  {/* Fila 4: Observación / Referencia (si existen) */}
                  {(m.observacion || m.referencia) && (
                    <div className="text-[11.5px] text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100 flex flex-wrap items-center gap-2">
                      {m.referencia && (
                        <span className="font-mono text-[10.5px] bg-slate-200/80 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                          Ref: {m.referencia}
                        </span>
                      )}
                      {m.observacion && <span className="italic text-slate-700">{m.observacion}</span>}
                    </div>
                  )}

                  {/* Fila 5: Banner de Anulación (si está anulado) */}
                  {esAnulado && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11.5px] text-red-700 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Icon name="warning" size={14} className="shrink-0" />
                        <span>Movimiento Anulado</span>
                      </div>
                      {m.anulado_por_nombre && (
                        <p>
                          Por: <strong>{m.anulado_por_nombre}</strong>
                          {m.fecha_anulacion && ` el ${format(new Date(m.fecha_anulacion), "dd/MM/yyyy HH:mm")}`}
                        </p>
                      )}
                      {m.motivo_anulacion && (
                        <p className="italic text-red-600">
                          Motivo: &quot;{m.motivo_anulacion}&quot;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Fila 6: Pie de tarjeta con Conciliación */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleToggleConciliado(m)}
                        disabled={togglingId === m.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50 ${
                          m.conciliado
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Icon
                          name={m.conciliado ? "check_circle" : "radio_button_checked"}
                          size={13}
                          className={m.conciliado ? "text-emerald-600" : "text-slate-400"}
                        />
                        <span>{m.conciliado ? "Conciliado" : "Sin conciliar"}</span>
                      </button>

                      {m.conciliado && m.fecha_conciliacion && (
                        <span className="text-slate-400 hidden sm:inline">
                          ({format(new Date(m.fecha_conciliacion), "dd/MM HH:mm")})
                        </span>
                      )}
                    </div>

                    <span className="text-[10.5px] font-mono text-slate-400">
                      ID: {m.id.slice(0, 8)}…
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Paginación Server-Side */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
          <div className="text-[12px] text-slate-500">
            Mostrando página <strong className="text-slate-800">{page}</strong> de{" "}
            <strong className="text-slate-800">{totalPages}</strong> ({totalCount} movimientos en total)
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[12px] font-semibold flex items-center gap-1"
            >
              <Icon name="chevron_left" size={14} />
              <span>Anterior</span>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers(page, totalPages).map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-[12px]">
                      …
                    </span>
                  );
                }
                return (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => handlePageChange(Number(p))}
                    disabled={loading}
                    className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                      p === page
                        ? "bg-cyan-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[12px] font-semibold flex items-center gap-1"
            >
              <span>Siguiente</span>
              <Icon name="chevron_right" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
