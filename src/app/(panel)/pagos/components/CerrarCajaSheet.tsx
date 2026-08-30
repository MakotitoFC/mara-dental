"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { TextInput, Textarea } from "@/components/ui/TextInput";
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
    if (filtroMedio === "anulados") return m.estado === "anulado";
    return String(m.medio_pago_id) === filtroMedio;
  });

  const conteoAnulados = (detalle?.movimientos || []).filter((m) => m.estado === "anulado").length;

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Cierre de Caja y Conciliación"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
 <p className="text-[11.5px] text-red-600 font-medium flex items-center gap-1.5">
              <Icon name="warning" size={13} /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
 className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCerrar}
              disabled={saving || loading}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors shadow-sm"
            >
              {saving ? "Cerrando turno…" : "Confirmar"}
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
            {/* Navegación por Pestañas — compuesto de botones sin padding/
                margen entre sí, seleccionado en cian con texto blanco. */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setTab("cuadre")}
                className={`flex-1 py-2 px-3 text-[12.5px] font-semibold flex items-center justify-center gap-2 transition-colors ${
                  tab === "cuadre"
                    ? "bg-cyan-600 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon name="calculate" size={15} />
                Cuadre de Saldos
              </button>
              <button
                onClick={() => setTab("conciliacion")}
                className={`flex-1 py-2 px-3 text-[12.5px] font-semibold flex items-center justify-center gap-2 transition-colors border-l border-slate-200 ${
                  tab === "conciliacion"
                    ? "bg-cyan-600 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
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
 <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                        <Icon name="payments" size={17} />
                      </div>
                      <div>
 <h3 className="text-[13.5px] font-bold text-slate-900">Efectivo Físico en Caja</h3>
 <p className="text-[11px] text-slate-500">Cuadre del cajón físico del turno</p>
                      </div>
                    </div>
 <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-300 text-slate-600">
                      Obligatorio
                    </span>
                  </div>

                  {/* Desglose Matemático */}
 <div className="grid grid-cols-3 gap-2 p-2.5 bg-white/80 rounded-xl border border-emerald-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 uppercase text-[9px] font-bold block">Fondo Apertura:</span>
 <strong className="text-slate-800">S/ {resumenEfectivo?.apertura.toFixed(2) ||"0.00"}</strong>
                    </div>
                    <div>
 <span className="text-slate-400 uppercase text-[9px] font-bold block">(+) Cobros Efectivo:</span>
 <strong className="text-slate-800">S/ {resumenEfectivo?.ingresos.toFixed(2) ||"0.00"}</strong>
                    </div>
                    <div>
 <span className="text-slate-400 uppercase text-[9px] font-bold block">(-) Salidas/Dev.:</span>
 <strong className="text-slate-800">S/ {resumenEfectivo?.egresos.toFixed(2) ||"0.00"}</strong>
                    </div>
                  </div>

                  {/* Saldo Esperado vs Contado */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <div className="flex flex-col">
 <span className="text-[11px] font-medium text-slate-500">Efectivo Esperado en Caja:</span>
 <span className="text-[18px] font-black text-slate-900">
                        S/ {efectivoEsperado.toFixed(2)}
                      </span>
                    </div>

                    {/* Input Efectivo Real Contado */}
                    <div className="flex flex-col gap-1 sm:w-48">
 <label className="text-[10.5px] font-bold text-slate-700 uppercase">
                        Monto Real Contado <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-slate-400">S/</span>
                        <TextInput
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
                          className="pl-8 pr-3 text-[14px] font-bold border-emerald-300 focus:border-emerald-300 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estado de Descuadre en Vivo */}
                  {diferenciaEfectivo !== null && (
                    <div
                      className={`p-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-between ${
                        Math.abs(diferenciaEfectivo) <= 0.009
 ? "bg-emerald-100/70 text-emerald-800 border border-emerald-300"
                          : diferenciaEfectivo > 0
 ? "bg-blue-50 text-blue-800 border border-blue-200"
 :"bg-red-50 text-red-800 border border-red-200"
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
 <h3 className="text-[12.5px] font-bold text-slate-800 uppercase tracking-wide">
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
 className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-xs"
                        >
                          <div className="flex justify-between items-center">
 <span className="text-[12.5px] font-bold text-slate-800">{r.nombre}</span>
 <span className="text-[11.5px] font-bold text-cyan-600">
                              Total: S/ {r.esperado.toFixed(2)}
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-medium">S/</span>
                            <TextInput
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
                              className="pl-7 pr-2.5 py-1.5 text-[12.5px] font-semibold bg-slate-50 rounded-lg"
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* OBSERVACIONES DE CIERRE */}
                <div className="flex flex-col gap-1">
 <label className="text-[11px] font-semibold text-slate-600 uppercase">
                    Observaciones del Cierre de Turno (Opcional)
                  </label>
                  <Textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej. Se entregó el efectivo a la administración sin incidencias..."
                    className="resize-none text-[12.5px]"
                  />
                </div>
              </div>
            )}

            {/* PESTAÑA 2: CONCILIACIÓN DE MOVIMIENTOS */}
            {tab === "conciliacion" && (
              <div className="flex flex-col gap-3">
                {/* Cabecera y botón conciliar todos */}
 <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
 <span className="text-[12px] font-bold text-slate-800">
                      {detalle.total_conciliados} de {detalle.total_movimientos} revisados
                    </span>
                    {detalle.total_conciliados === detalle.total_movimientos && detalle.total_movimientos > 0 && (
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">
                        100% Conciliado
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleConciliarTodos}
                    disabled={saving}
 className="text-[11.5px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                  >
                    <Icon name="done_all" size={14} />
                    Conciliar Todos
                  </button>
                </div>

                {/* Filtros de Medio — por defecto gris fantasma, cian con
                    texto blanco al seleccionar (mismo patrón en todos). */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setFiltroMedio("todos")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                      filtroMedio === "todos"
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Todos ({detalle.movimientos.length})
                  </button>
                  <button
                    onClick={() => setFiltroMedio("devoluciones")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                      filtroMedio === "devoluciones"
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Devoluciones
                  </button>
                  {conteoAnulados > 0 && (
                    <button
                      onClick={() => setFiltroMedio("anulados")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                        filtroMedio === "anulados"
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Anulados ({conteoAnulados})
                    </button>
                  )}
                  {detalle.resumen_medios.map((r) => (
                    <button
                      key={r.medio_pago_id}
                      onClick={() => setFiltroMedio(String(r.medio_pago_id))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                        filtroMedio === String(r.medio_pago_id)
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {r.nombre}
                    </button>
                  ))}
                </div>

                {/* Lista de Transacciones */}
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto no-scrollbar pr-1">
                  {movimientosFiltrados.length === 0 ? (
                    <p className="text-center py-8 text-[12px] text-slate-400">No hay movimientos en este filtro.</p>
                  ) : (
                    movimientosFiltrados.map((m) => {
                      const isAnulado = m.estado === "anulado";
                      const isEgreso = m.tipo === "E";

                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            isAnulado
 ? "bg-slate-50 border-slate-200/60 opacity-80"
                              : m.conciliado
 ? "bg-white border-slate-200"
 :"bg-amber-50/40 border-amber-200"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`text-[12.5px] font-bold truncate ${
                                  isAnulado
 ? "text-slate-500"
 :"text-slate-900"
                                }`}
                              >
                                {m.paciente_o_entidad}
                              </p>
                              {isAnulado && (
 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase tracking-wide">
                                  Anulado
                                </span>
                              )}
                              {m.es_devolucion && !isAnulado && (
 <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 uppercase">
                                  Devolución
                                </span>
                              )}
                              <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                {m.medio_pago_nombre} {m.referencia ? `· Ref: ${m.referencia}` : ""}
                              </span>
                            </div>
 <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {m.descripcion} {isAnulado ? "· (Anulado - No suma al total)" : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`text-[13px] font-bold ${
                                isAnulado
 ? "line-through text-slate-400 font-semibold"
                                  : isEgreso
 ? "text-red-600"
 :"text-emerald-600"
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
                                  ? "bg-white border border-emerald-500 text-emerald-600"
 :"bg-slate-100 text-slate-400 hover:text-cyan-600"
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
