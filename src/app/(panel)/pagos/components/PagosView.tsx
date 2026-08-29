"use client";

import { useMemo, useState, useEffect, startTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { PagosDashboardSede, PresupuestoPendiente } from "../actions";
import { RegistrarPagoSheet } from "./RegistrarPagoSheet";
import { CerrarCajaSheet } from "./CerrarCajaSheet";
import { CuotasSheet } from "./CuotasSheet";
import { MovimientoLibreSheet } from "./MovimientoLibreSheet";
import { SolicitarDevolucionSheet } from "./SolicitarDevolucionSheet";
import type { ClinicaInfo } from "@/lib/reportExport";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";

function fmtFechaRelativa(iso: string) {
  if (!iso) return "Sin fecha";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const datePart = iso.includes("T") ? iso.split("T")[0] : iso;
  const d = new Date(datePart + "T00:00:00");
  if (isNaN(d.getTime())) {
    const dFallback = new Date(iso);
    if (isNaN(dFallback.getTime())) return "Sin fecha";
    d.setTime(dFallback.getTime());
    d.setHours(0, 0, 0, 0);
  }

  const diffDias = Math.round((hoy.getTime() - d.getTime()) / 86400000);
  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Ayer";
  if (diffDias > 1) return `Hace ${diffDias} días`;
  if (diffDias < 0) return `En ${Math.abs(diffDias)} días`;
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}
function simbolo(moneda: string) {
  return moneda === "PEN" ? "S/" : moneda;
}

export function PagosView({ initialDashboard, mediosPago, categoriasIngreso, categoriasEgreso, tiposMoneda, sede, cajaAbiertaId }: {
  initialDashboard: PagosDashboardSede;
  mediosPago: { id: number; nombre: string }[];
  categoriasIngreso: { id: number; nombre: string }[];
  categoriasEgreso: { id: number; nombre: string }[];
  tiposMoneda: { id: number; moneda: string }[];
  sede: ClinicaInfo | null;
  cajaAbiertaId: string;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [query, setQuery] = useState("");
  const [activo, setActivo] = useState<PresupuestoPendiente | null>(null);
  const [activoCuotas, setActivoCuotas] = useState<PresupuestoPendiente | null>(null);
  const [activoDevolucion, setActivoDevolucion] = useState<PresupuestoPendiente | null>(null);
  const [showCerrarCaja, setShowCerrarCaja] = useState(false);
  const [showMovimientoLibre, setShowMovimientoLibre] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const openId = searchParams.get("openCuotas") || searchParams.get("presupuestoId");
    if (openId) {
      const newUrl = window.location.pathname;
      router.replace(newUrl, { scroll: false });

      import("../actions").then(({ getPresupuestoPorIdAction }) => {
        getPresupuestoPorIdAction(openId).then((p) => {
          if (p) {
            setQuery(p.paciente_nombre);
            setPendientesBuscados([p]);
          }
        });
      });
    }
  }, [searchParams, router]);

  useEffect(() => {
    setDashboard(initialDashboard);
  }, [initialDashboard]);

  // Pendientes de Cobro: por defecto se muestran TODOS los pendientes de la
  // sede (antes solo aparecían al buscar). La búsqueda sigue funcionando
  // igual (debounce + acción server-side), pero cuando el campo está vacío
  // usamos este listado completo en vez de un array vacío.
  const [allPendientes, setAllPendientes] = useState<PresupuestoPendiente[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(true);

  async function loadAllPendientes() {
    setLoadingPendientes(true);
    try {
      const { getPendientesCobroSedeAction } = await import("../actions");
      const res = await getPendientesCobroSedeAction();
      setAllPendientes(res);
    } catch (err) {
      console.error("Error cargando pendientes de cobro: ", err);
    } finally {
      setLoadingPendientes(false);
    }
  }

  useEffect(() => {
    loadAllPendientes();
  }, []);

  function updatePendienteLocal(presupuestoId: string, updater: (p: PresupuestoPendiente) => PresupuestoPendiente | null) {
    const apply = (prev: PresupuestoPendiente[]) =>
      prev.reduce<PresupuestoPendiente[]>((acc, p) => {
        if (p.id !== presupuestoId) { acc.push(p); return acc; }
        const next = updater(p);
        if (next) acc.push(next);
        return acc;
      }, []);
    setAllPendientes(apply);
    setPendientesBuscados(apply);
  }

  useEffect(() => {
    if (!sede?.id) return;
    const supabase = createClient();
    
    // Escuchar actualizaciones de validaciones
    const channelValidaciones = supabase.channel(`pagos_validaciones_${sede.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "solicitud_validacion",
        filter: `sede_id=eq.${sede.id}`
      }, (payload) => {
        if (payload.new.estado === "aprobada") {
          startTransition(() => {
            router.refresh();
          });
        }
      })
      .subscribe();

    // Escuchar nuevos movimientos de caja en tiempo real
    const channelMovimientos = supabase.channel(`pagos_movimientos_${sede.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "movimiento_caja",
      }, () => {
        import("../actions").then(({ getPagosDashboardSedeAction }) => {
          getPagosDashboardSedeAction().then((fresh) => {
            if (fresh) setDashboard(fresh);
          });
        });
        loadAllPendientes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelValidaciones);
      supabase.removeChannel(channelMovimientos);
    };
  }, [sede?.id, router]);

  const [pendientesBuscados, setPendientesBuscados] = useState<PresupuestoPendiente[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // When search changes, fetch results
  useEffect(() => {
    if (!query.trim()) {
      setPendientesBuscados([]);
      return;
    }

    const q = query.trim();
    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const { buscarPresupuestosPendientesAction } = await import("../actions");
        const res = await buscarPresupuestosPendientesAction(q);
        setPendientesBuscados(res);
      } catch (err) {
        console.error("Error buscando presupuestos: ", err);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const pendientesFiltrados = query.trim() ? pendientesBuscados : allPendientes;

  function handlePagoRegistrado(presupuestoId: string, nuevoSaldo: number, montoPagado: number, medioNombre: string) {
    const pacienteNombre = activo?.paciente_nombre || "Paciente";
    const monedaPago = activo?.moneda || "PEN";

    updatePendienteLocal(presupuestoId, (p) =>
      nuevoSaldo <= 0.009 ? null : { ...p, saldo: nuevoSaldo, pagado: p.total_neto - nuevoSaldo }
    );

    setDashboard((prev) => {
      const metodosPago = (() => {
        const acc = new Map(prev.metodosPago.map((m) => [m.nombre, m.monto]));
        acc.set(medioNombre, (acc.get(medioNombre) ?? 0) + montoPagado);
        const total = Array.from(acc.values()).reduce((a, b) => a + b, 0);
        return Array.from(acc.entries())
          .map(([nombre, monto]) => ({ nombre, monto, porcentaje: total > 0 ? Math.round((monto / total) * 100) : 0 }))
          .sort((a, b) => b.monto - a.monto);
      })();

      const nuevoHistorial = [
        {
          id: `local-${Date.now()}`,
          paciente_nombre: pacienteNombre,
          monto: montoPagado,
          medio_pago_nombre: medioNombre,
          fecha_pago: new Date().toISOString(),
          moneda: monedaPago,
        },
        ...prev.historial.slice(0, 7),
      ];

      return {
        ...prev,
        metodosPago,
        ingresosHoy: prev.ingresosHoy + montoPagado,
        comprobantesHoy: prev.comprobantesHoy + 1,
        historial: nuevoHistorial,
      };
    });
    setActivo(null);
  }

  function handleMovimientoLibreRegistrado(monto: number, tipo: "I" | "E", medioNombre: string, concepto: string) {
    setDashboard((prev) => {
      const metodosPago = (() => {
        if (tipo === "E") return prev.metodosPago;
        const acc = new Map(prev.metodosPago.map((m) => [m.nombre, m.monto]));
        acc.set(medioNombre, (acc.get(medioNombre) ?? 0) + monto);
        const total = Array.from(acc.values()).reduce((a, b) => a + b, 0);
        return Array.from(acc.entries())
          .map(([nombre, m]) => ({ nombre, monto: m, porcentaje: total > 0 ? Math.round((m / total) * 100) : 0 }))
          .sort((a, b) => b.monto - a.monto);
      })();

      const nuevoHistorial = [
        {
          id: `local-${Date.now()}`,
          paciente_nombre: concepto,
          monto: monto,
          tipo: tipo,
          medio_pago_nombre: medioNombre,
          fecha_pago: new Date().toISOString(),
          moneda: "PEN",
        },
        ...prev.historial.slice(0, 7),
      ];

      return {
        ...prev,
        metodosPago,
        ingresosHoy: tipo === "I" ? prev.ingresosHoy + monto : prev.ingresosHoy,
        egresosHoy: tipo === "E" ? prev.egresosHoy + monto : prev.egresosHoy,
        comprobantesHoy: prev.comprobantesHoy + 1,
        historial: nuevoHistorial,
      };
    });
  }

  function handleCuotasActualizadas(presupuestoId: string, cuotas: any[]) {
    updatePendienteLocal(presupuestoId, (p) => ({ ...p, cuotas }));
    if (activoCuotas && activoCuotas.id === presupuestoId) {
      setActivoCuotas(prev => prev ? { ...prev, cuotas } : null);
    }
  }

  const [exportingId, setExportingId] = useState<string | null>(null);

  async function handleExportarComprobante(movimientoId: string, mode: "print" | "pdf") {
    if (exportingId) return;
    setExportingId(movimientoId);
    try {
      const { getComprobantePagoDetalleAction } = await import("../actions");
      const detalle = await getComprobantePagoDetalleAction(movimientoId);
      if (!detalle) {
        alert("No se pudo obtener el detalle del comprobante.");
        return;
      }

      const { buildVoucherHtml } = await import("../voucherText");
      const { printHtml, downloadHtmlAsPaginatedPdf } = await import("@/lib/reportExport");

      const html = buildVoucherHtml({
        clinica: detalle.sede || sede,
        numeroComprobante: detalle.comprobante_id || detalle.id,
        tipoComprobante: detalle.tipo_comprobante,
        pacienteNombre: detalle.paciente_nombre,
        pagadorNombre: detalle.pagador_nombre,
        pagadorDocumento: detalle.pagador_documento,
        esTercero: detalle.es_tercero,
        monto: detalle.monto,
        moneda: detalle.moneda,
        medioPago: detalle.medio_pago,
        referencia: detalle.referencia,
        observaciones: detalle.observacion,
        fecha: new Date(detalle.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        cuota: detalle.cuota,
        presupuesto: detalle.presupuesto,
      });

      if (mode === "print") {
        await printHtml(html, `Comprobante #${detalle.comprobante_id}`);
      } else {
        await downloadHtmlAsPaginatedPdf(html, `comprobante_${detalle.comprobante_id}.pdf`, 800);
      }
    } catch (err) {
      console.error("Error exportando comprobante: ", err);
    } finally {
      setExportingId(null);
    }
  }

  const monedaBase = dashboard.pendientes[0]?.moneda ?? dashboard.historial[0]?.moneda ?? "PEN";

  return (
 <div className="flex flex-col h-full overflow-hidden bg-slate-50">
 <div className="shrink-0 px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border-b border-slate-200">
        <div>
 <h1 className="text-[15px] font-bold text-slate-900">Panel de Pagos</h1>
 <p className="text-[11.5px] text-slate-500">
            {sede?.nombre_clinica ?? "Sede"} · Cobros y movimientos de caja en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowMovimientoLibre(true)}
 className="flex items-center justify-center h-[38px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[13px] font-semibold transition-colors shrink-0 gap-1.5"
            title="Registrar Ingreso/Egreso"
          >
            <Icon name="swap_vert" size={18} />
            <span className="hidden sm:inline">Movimiento Libre</span>
          </button>
          <div className="relative flex-1 sm:w-64">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente…"
 className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-[13px] pr-9 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
 <Icon name="search" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          </div>
          <button
            onClick={() => setShowCerrarCaja(true)}
            className="flex items-center justify-center h-[38px] px-3.5 bg-slate-100 text-slate-700 hover:bg-red-600 hover:text-white active:bg-red-700 active:text-white rounded-xl text-[13px] font-semibold transition-colors shrink-0 gap-1.5"
            title="Cerrar turno de caja"
          >
            <Icon name="point_of_sale" size={17} />
            <span className="hidden sm:inline">Cerrar Caja</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Pendientes de cobro */}
 <div className="xl:col-span-2 xl:self-start bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
 <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Icon name="payments" size={16} />
                </div>
 <h2 className="text-[14px] font-semibold text-slate-800">Pendientes de Cobro</h2>
              </div>
 <span className="text-[10.5px] font-medium px-2 py-1 rounded-full bg-amber-50/60 text-amber-600">
                {pendientesFiltrados.length} pendiente{pendientesFiltrados.length !== 1 ? "s" : ""}
              </span>
            </div>

            {(isSearching || (loadingPendientes && !query.trim())) ? (
 <div className="py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-[12.5px]">{isSearching ? "Buscando pacientes..." : "Cargando pendientes..."}</p>
              </div>
            ) : pendientesFiltrados.length === 0 ? (
              <EmptyState icon="search" title={!query.trim() ? "No hay pendientes de cobro" : "Sin resultados para tu búsqueda"} size="sm" />
            ) : (
              <>
                {/* Desktop/Tablet — tabla, mismo diseño que Personal. Crece
                    con el contenido hasta ~10 registros (self-start en la
                    card evita que la estire el grid); de ahí en más scroll
                    interno oculto en vez de seguir creciendo. */}
                <div className="hidden md:block overflow-auto no-scrollbar" style={{ maxHeight: 620 }}>
                  <table className="w-full text-left text-[13px]" style={{ minWidth: 640 }}>
                    <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Paciente</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Fecha</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 text-right">Monto</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 text-center">Estado</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendientesFiltrados.map((p) => {
                        const isPagado = p.esPagado || p.estado === "pagado";
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar name={p.paciente_nombre} size="sm" />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 truncate">{p.paciente_nombre}</p>
                                  <p className="text-[12px] text-slate-500 truncate">{p.tratamiento}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-500 text-[11.5px] whitespace-nowrap">
                              {fmtFechaRelativa(p.fecha_emision)}
                            </td>
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              <span className="text-[13.5px] text-slate-900">
                                {simbolo(p.moneda)} {(isPagado ? p.total_neto : p.saldo).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                                isPagado ? "bg-emerald-50 text-emerald-600" : "bg-amber-50/60 text-amber-600"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isPagado ? "bg-emerald-500" : "bg-amber-400"}`} />
                                {isPagado ? "Pagado" : "Pendiente"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {isPagado ? (
                                <button
                                  onClick={() => setActivoDevolucion(p)}
                                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-transparent hover:bg-cyan-500/5 text-cyan-600 text-[11.5px] font-semibold transition-colors border border-cyan-500/40 whitespace-nowrap"
                                  title="Solicitar devolución de dinero y anulación del presupuesto"
                                >
                                  <Icon name="undo" size={14} />
                                  Devolución
                                </button>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setActivoCuotas(p)}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                                    title="Gestionar cuotas"
                                  >
                                    <Icon name="splitscreen" size={16} />
                                  </button>
                                  <button
                                    onClick={() => setActivo(p)}
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11.5px] font-semibold transition-colors whitespace-nowrap shrink-0"
                                  >
                                    <Icon name="description" size={13} />
                                    Registrar pago
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile — tarjetas individuales, mismo diseño que Personal.
                    Mismo tope de altura + scroll oculto que la tabla. */}
                <div className="md:hidden bg-white p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar" style={{ maxHeight: 620 }}>
                  {pendientesFiltrados.map((p) => {
                    const isPagado = p.esPagado || p.estado === "pagado";
                    return (
                      <div key={p.id} className="bg-white rounded-xl border border-slate-200 flex flex-col">
                        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                          <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400">
                            <Icon name="event" size={11} /> {fmtFechaRelativa(p.fecha_emision)}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            isPagado ? "bg-emerald-50 text-emerald-600" : "bg-amber-50/60 text-amber-600"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPagado ? "bg-emerald-500" : "bg-amber-400"}`} />
                            {isPagado ? "Pagado" : "Pendiente"}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 p-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={p.paciente_nombre} size="md" />
                            <div className="min-w-0">
                              <p className="font-bold text-[13px] text-slate-800 truncate">{p.paciente_nombre}</p>
                              <p className="text-[12px] text-slate-500 truncate">{p.tratamiento}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <span className="text-[13px] text-slate-900">
                              {simbolo(p.moneda)} {(isPagado ? p.total_neto : p.saldo).toFixed(2)}
                            </span>
                            {isPagado ? (
                              <button
                                onClick={() => setActivoDevolucion(p)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-transparent hover:bg-cyan-500/5 text-cyan-600 text-[11.5px] font-semibold transition-colors border border-cyan-500/40 whitespace-nowrap"
                                title="Solicitar devolución de dinero y anulación del presupuesto"
                              >
                                <Icon name="undo" size={14} />
                                Devolución
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => setActivoCuotas(p)}
                                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
                                  title="Gestionar cuotas"
                                >
                                  <Icon name="splitscreen" size={16} />
                                </button>
                                <button
                                  onClick={() => setActivo(p)}
                                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11.5px] font-semibold transition-colors whitespace-nowrap shrink-0"
                                >
                                  <Icon name="description" size={13} />
                                  Registrar pago
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </>
            )}
          </div>

          {/* Panel lateral */}
          <div className="flex flex-col gap-4">
            {/* 3 Tarjetas Métricas */}
            <div className="grid grid-cols-3 gap-2.5">
 <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-1.5">
 <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Icon name="payments" size={14} />
                </div>
                <div className="min-w-0">
 <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate">Ingresos Hoy</p>
 <p className="text-[14px] font-bold text-slate-800 truncate">{simbolo(monedaBase)} {dashboard.ingresosHoy.toFixed(2)}</p>
                </div>
              </div>
 <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-1.5">
 <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <Icon name="trending_down" size={14} />
                </div>
                <div className="min-w-0">
 <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate">Egresos Hoy</p>
 <p className="text-[14px] font-bold text-slate-800 truncate">{simbolo(monedaBase)} {dashboard.egresosHoy.toFixed(2)}</p>
                </div>
              </div>
 <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-1.5">
 <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
                  <Icon name="description" size={14} />
                </div>
                <div className="min-w-0">
 <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate">Comprobantes</p>
 <p className="text-[14px] font-bold text-slate-800">{dashboard.comprobantesHoy}</p>
                </div>
              </div>
            </div>

            {/* Métodos de Cobro */}
 <div className="bg-white border border-slate-200 rounded-2xl p-4">
 <h3 className="text-[13px] font-semibold text-slate-800 mb-3">Métodos de Cobro</h3>
              {dashboard.metodosPago.length === 0 ? (
 <p className="text-[11.5px] text-slate-400">Sin pagos registrados aún.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {dashboard.metodosPago.map((m) => (
                    <div key={m.nombre}>
                      <div className="flex items-center justify-between mb-1">
 <span className="text-[11.5px] font-medium text-slate-600 truncate">{m.nombre}</span>
 <span className="text-[11.5px] font-bold text-slate-800 shrink-0">{m.porcentaje}%</span>
                      </div>
 <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-cyan-600 rounded-full transition-all" style={{ width: `${m.porcentaje}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial Reciente con Acciones de Comprobante PDF / Imprimir */}
 <div className="bg-white border border-slate-200 rounded-2xl p-4">
 <h3 className="text-[13px] font-semibold text-slate-800 mb-3">Historial Reciente</h3>
              {dashboard.historial.length === 0 ? (
 <p className="text-[11.5px] text-slate-400">Sin movimientos registrados aún.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {dashboard.historial.map((h) => {
                    const isEgreso = h.tipo === "E";
                    const isExporting = exportingId === h.id;

                    return (
 <div key={h.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100 transition-colors">
                        <div className="min-w-0 flex-1">
 <p className="text-[12px] font-semibold text-slate-800 truncate">{h.paciente_nombre}</p>
 <p className="text-[10.5px] text-slate-400 truncate">
                            {h.medio_pago_nombre} {h.categoria_nombre ? `· ${h.categoria_nombre}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
 <span className={`text-[12px] font-bold ${isEgreso ? "text-red-600" : "text-emerald-600"}`}>
                            {isEgreso ? "-" : "+"}{simbolo(h.moneda)} {h.monto.toFixed(2)}
                          </span>
                          
                          {/* Botones de Comprobante PDF / Imprimir */}
 <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                            <button
                              onClick={() => handleExportarComprobante(h.id, "print")}
                              disabled={isExporting}
                              title="Imprimir Comprobante"
 className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-cyan-600 hover:border-cyan-400 transition-colors disabled:opacity-50"
                            >
                              <Icon name="print" size={13} />
                            </button>
                            <button
                              onClick={() => handleExportarComprobante(h.id, "pdf")}
                              disabled={isExporting}
                              title="Descargar Comprobante PDF"
 className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-cyan-600 hover:border-cyan-400 transition-colors disabled:opacity-50"
                            >
                              <Icon name="download" size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activo && (
          <RegistrarPagoSheet
            key="registrar-pago"
            presupuesto={activo}
            mediosPago={mediosPago}
            categoriasIngreso={categoriasIngreso}
            tiposMoneda={tiposMoneda}
            sede={sede}
            cajaAbiertaId={cajaAbiertaId}
            onClose={() => setActivo(null)}
            onSaved={handlePagoRegistrado}
          />
        )}
        {activoDevolucion && (
          <SolicitarDevolucionSheet
            key="solicitar-devolucion"
            presupuesto={activoDevolucion}
            onClose={() => setActivoDevolucion(null)}
            onSuccess={() => {
              updatePendienteLocal(activoDevolucion.id, () => null);
            }}
          />
        )}
        {showCerrarCaja && (
          <CerrarCajaSheet
            key="cerrar-caja"
            cajaId={cajaAbiertaId}
            mediosPago={mediosPago}
            onClose={() => setShowCerrarCaja(false)}
          />
        )}
        {showMovimientoLibre && (
          <MovimientoLibreSheet
            key="movimiento-libre"
            cajaId={cajaAbiertaId}
            categoriasIngreso={categoriasIngreso}
            categoriasEgreso={categoriasEgreso}
            mediosPago={mediosPago}
            tiposMoneda={tiposMoneda}
            onClose={() => setShowMovimientoLibre(false)}
            onSaved={handleMovimientoLibreRegistrado}
          />
        )}
        {activoCuotas && (
          <CuotasSheet
            key="cuotas-sheet"
            presupuesto={activoCuotas}
            onClose={() => setActivoCuotas(null)}
            onRefresh={() => {
              startTransition(() => {
                router.refresh();
              });
            }}
            onCuotasActualizadas={(cuotas) => handleCuotasActualizadas(activoCuotas.id, cuotas)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
