"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import {
  cerrarCajaAction,
  getDetalleCierreCajaAction,
  toggleConciliacionMovimientoAction,
  conciliarTodosMovimientosAction,
  type DetalleCierreCaja,
  type MovimientoCierreItem,
} from "../caja.actions";
import { useRouter } from "next/navigation";

export function CerrarCajaSheet({
  cajaId,
  mediosPago,
  onClose,
}: {
  cajaId: string;
  mediosPago: { id: number; nombre: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"cuadre" | "conciliacion">("cuadre");
  const [detalle, setDetalle] = useState<DetalleCierreCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [montosReales, setMontosReales] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState("");
  const [filtroMedio, setFiltroMedio] = useState<string>("todos");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    cargarDetalle();
  }, [cajaId]);

  async function cargarDetalle() {
    setLoading(true);
    const data = await getDetalleCierreCajaAction(cajaId);
    if (data) {
      setDetalle(data);
      // Inicializar valores de medios digitales con lo esperado para agilizar
      const initialMap: Record<number, string> = {};
      data.resumen_medios.forEach((r) => {
        if (r.es_efectivo) {
          initialMap[r.medio_pago_id] = "";
        } else {
          initialMap[r.medio_pago_id] = r.esperado > 0 ? r.esperado.toFixed(2) : "0.00";
        }
      });
      setMontosReales(initialMap);
    }
    setLoading(false);
  }

  async function handleToggleConciliar(mov: MovimientoCierreItem) {
    if (togglingId === mov.id) return;
    setTogglingId(mov.id);
    const nuevoEstado = !mov.conciliado;
    const res = await toggleConciliacionMovimientoAction(mov.id, nuevoEstado);
    setTogglingId(null);

    if (res?.success && detalle) {
      setDetalle({
        ...detalle,
        movimientos: detalle.movimientos.map((m) =>
          m.id === mov.id ? { ...m, conciliado: nuevoEstado } : m
        ),
        total_conciliados: nuevoEstado
          ? detalle.total_conciliados + 1
          : detalle.total_conciliados - 1,
      });
    }
  }

  async function handleConciliarTodos() {
    if (!detalle || detalle.movimientos.length === 0) return;
    setSaving(true);
    const res = await conciliarTodosMovimientosAction(cajaId);
    setSaving(false);
    if (res?.success) {
      setDetalle({
        ...detalle,
        movimientos: detalle.movimientos.map((m) => ({ ...m, conciliado: true })),
        total_conciliados: detalle.movimientos.length,
      });
    }
  }

  async function handleCerrar() {
    if (!detalle) return;
    setSaving(true);
    setError(null);

    try {
      const efectivoResumen = detalle.resumen_medios.find((r) => r.es_efectivo);
      if (efectivoResumen && (!montosReales[efectivoResumen.medio_pago_id] || montosReales[efectivoResumen.medio_pago_id].trim() === "")) {
        setError("Debe ingresar el monto de efectivo físico contado en caja.");
        setSaving(false);
        setTab("cuadre");
        return;
      }

      const payload = detalle.resumen_medios.map((m) => ({
        medio_pago_id: m.medio_pago_id,
        monto: Number(montosReales[m.medio_pago_id] || 0),
      }));

      const res = await cerrarCajaAction(cajaId, payload, observaciones);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
        onClose();
      }
    } catch (e) {
      setError("Error inesperado al cerrar la caja.");
    } finally {
      setSaving(false);
    }
  }

  // Cálculos de efectivo
  const resumenEfectivo = detalle?.resumen_medios.find((r) => r.es_efectivo);
  const efectivoEsperado = resumenEfectivo?.esperado ?? 0;
  const efectivoRealNum = Number(montosReales[resumenEfectivo?.medio_pago_id ?? 1] || 0);
  const diferenciaEfectivo = montosReales[resumenEfectivo?.medio_pago_id ?? 1]
    ? efectivoRealNum - efectivoEsperado
    : null;

  // Filtrado de movimientos para tab de conciliación
  const movimientosFiltrados = (detalle?.movimientos || []).filter((m) => {
    if (filtroMedio === "todos") return true;
    if (filtroMedio === "devoluciones") return m.es_devolucion;
    return String(m.medio_pago_id) === filtroMedio;
  });

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Cierre de Caja y Conciliación"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p className="text-[11.5px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
              <Icon name="warning" size={13} /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCerrar}
              disabled={saving || loading}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors shadow-sm"
            >
              <Icon name="point_of_sale" size={16} />
              {saving ? "Cerrando turno…" : "Confirmar Cierre de Caja"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1 pb-2">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[13px]">Consolidando datos del turno...</p>
          </div>
        ) : !detalle ? (
          <p className="text-center py-10 text-slate-500 text-[13px]">No se pudo cargar la información de la caja.</p>
        ) : (
          <>
            {/* Navegación por Pestañas */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900/60 p-1 border border-slate-200/80 dark:border-slate-800">
              <button
                onClick={() => setTab("cuadre")}
                className={`flex-1 py-2 px-3 rounded-lg text-[12.5px] font-semibold flex items-center justify-center gap-2 transition-all ${
                  tab === "cuadre"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <Icon name="calculate" size={15} />
                Cuadre de Saldos
              </button>
              <button
                onClick={() => setTab("conciliacion")}
                className={`flex-1 py-2 px-3 rounded-lg text-[12.5px] font-semibold flex items-center justify-center gap-2 transition-all ${
                  tab === "conciliacion"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <Icon name="checklist" size={15} />
                Conciliación ({detalle.total_conciliados}/{detalle.total_movimientos})
              </button>
            </div>

            {/* PESTAÑA 1: CUADRE DE SALDOS */}
            {tab === "cuadre" && (
              <div className="flex flex-col gap-4">
                {/* TARJETA PRINCIPAL DE EFECTIVO */}
                <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-slate-800 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                        <Icon name="payments" size={17} />
                      </div>
                      <div>
                        <h3 className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100">Efectivo Físico en Caja</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Cuadre del cajón físico del turno</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      Obligatorio
                    </span>
                  </div>

                  {/* Desglose Matemático */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-white/80 dark:bg-slate-900/60 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-[11px]">
                    <div>
                      <span className="text-slate-400 uppercase text-[9px] font-bold block">Fondo Apertura:</span>
                      <strong className="text-slate-800 dark:text-slate-200">S/ {resumenEfectivo?.apertura.toFixed(2) || "0.00"}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-600 dark:text-emerald-400 uppercase text-[9px] font-bold block">(+) Cobros Efectivo:</span>
                      <strong className="text-emerald-700 dark:text-emerald-300">S/ {resumenEfectivo?.ingresos.toFixed(2) || "0.00"}</strong>
                    </div>
                    <div>
                      <span className="text-rose-600 dark:text-rose-400 uppercase text-[9px] font-bold block">(-) Salidas/Dev.:</span>
                      <strong className="text-rose-700 dark:text-rose-300">S/ {resumenEfectivo?.egresos.toFixed(2) || "0.00"}</strong>
                    </div>
                  </div>

                  {/* Saldo Esperado vs Contado */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Efectivo Esperado en Caja:</span>
                      <span className="text-[18px] font-black text-slate-900 dark:text-slate-100">
                        S/ {efectivoEsperado.toFixed(2)}
                      </span>
                    </div>

                    {/* Input Efectivo Real Contado */}
                    <div className="flex flex-col gap-1 sm:w-48">
                      <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                        Monto Real Contado <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={montosReales[resumenEfectivo?.medio_pago_id ?? 1] || ""}
                          onChange={(e) =>
                            setMontosReales((prev) => ({
                              ...prev,
                              [resumenEfectivo?.medio_pago_id ?? 1]: e.target.value,
                            }))
                          }
                          className="w-full pl-8 pr-3 py-2 text-[14px] font-bold border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estado de Descuadre en Vivo */}
                  {diferenciaEfectivo !== null && (
                    <div
                      className={`p-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-between ${
                        Math.abs(diferenciaEfectivo) <= 0.009
                          ? "bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : diferenciaEfectivo > 0
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon
                          name={
                            Math.abs(diferenciaEfectivo) <= 0.009
                              ? "check_circle"
                              : diferenciaEfectivo > 0
                              ? "add_circle"
                              : "error"
                          }
                          size={16}
                        />
                        <span>
                          {Math.abs(diferenciaEfectivo) <= 0.009
                            ? "✓ Efectivo Exacto (Caja Cuadrada)"
                            : diferenciaEfectivo > 0
                            ? "Sobrante de efectivo en caja"
                            : "Faltante de efectivo en caja"}
                        </span>
                      </div>
                      <span className="font-extrabold">
                        {diferenciaEfectivo >= 0 ? "+" : ""}S/ {diferenciaEfectivo.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* MEDIOS DE PAGO DIGITALES */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      Medios Digitales y Bancarios (Ingresos del Turno)
                    </h3>
                    <span className="text-[11px] text-slate-400">Verifica con tus comprobantes/POS</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {detalle.resumen_medios
                      .filter((r) => !r.es_efectivo)
                      .map((r) => (
                        <div
                          key={r.medio_pago_id}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col gap-2 shadow-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{r.nombre}</span>
                            <span className="text-[11.5px] font-bold text-cyan-600 dark:text-cyan-400">
                              Total: S/ {r.esperado.toFixed(2)}
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-medium">S/</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={montosReales[r.medio_pago_id] || ""}
                              onChange={(e) =>
                                setMontosReales((prev) => ({
                                  ...prev,
                                  [r.medio_pago_id]: e.target.value,
                                }))
                              }
                              placeholder={r.esperado.toFixed(2)}
                              className="w-full pl-7 pr-2.5 py-1.5 text-[12.5px] font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* OBSERVACIONES DE CIERRE */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
                    Observaciones del Cierre de Turno (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej. Se entregó el efectivo a la administración sin incidencias..."
                    className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-[12.5px] outline-none focus:border-cyan-400 resize-none"
                  />
                </div>
              </div>
            )}

            {/* PESTAÑA 2: CONCILIACIÓN DE MOVIMIENTOS */}
            {tab === "conciliacion" && (
              <div className="flex flex-col gap-3">
                {/* Cabecera y botón conciliar todos */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                      {detalle.total_conciliados} de {detalle.total_movimientos} revisados
                    </span>
                    {detalle.total_conciliados === detalle.total_movimientos && detalle.total_movimientos > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        100% Conciliado
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleConciliarTodos}
                    disabled={saving}
                    className="text-[11.5px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 flex items-center gap-1"
                  >
                    <Icon name="done_all" size={14} />
                    Conciliar Todos
                  </button>
                </div>

                {/* Filtros de Medio */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setFiltroMedio("todos")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                      filtroMedio === "todos"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Todos ({detalle.movimientos.length})
                  </button>
                  <button
                    onClick={() => setFiltroMedio("devoluciones")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                      filtroMedio === "devoluciones"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    }`}
                  >
                    Devoluciones
                  </button>
                  {detalle.resumen_medios.map((r) => (
                    <button
                      key={r.medio_pago_id}
                      onClick={() => setFiltroMedio(String(r.medio_pago_id))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                        filtroMedio === String(r.medio_pago_id)
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {r.nombre}
                    </button>
                  ))}
                </div>

                {/* Lista de Transacciones */}
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                  {movimientosFiltrados.length === 0 ? (
                    <p className="text-center py-8 text-[12px] text-slate-400">No hay movimientos en este filtro.</p>
                  ) : (
                    movimientosFiltrados.map((m) => {
                      const isEgreso = m.tipo === "E";

                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            m.conciliado
                              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              : "bg-amber-50/40 dark:bg-amber-950/15 border-amber-200 dark:border-amber-800/40"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
                                {m.paciente_o_entidad}
                              </p>
                              {m.es_devolucion && (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 uppercase">
                                  Devolución
                                </span>
                              )}
                              <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                {m.medio_pago_nombre} {m.referencia ? `· Ref: ${m.referencia}` : ""}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {m.descripcion}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`text-[13px] font-bold ${
                                isEgreso ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {isEgreso ? "-" : "+"}S/ {m.monto.toFixed(2)}
                            </span>

                            {/* Botón de Conciliar */}
                            <button
                              onClick={() => handleToggleConciliar(m)}
                              disabled={togglingId === m.id}
                              title={m.conciliado ? "Conciliado" : "Marcar como revisado"}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                m.conciliado
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-400 dark:bg-slate-700 hover:text-cyan-600"
                              }`}
                            >
                              <Icon name={m.conciliado ? "check" : "circle"} size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}
