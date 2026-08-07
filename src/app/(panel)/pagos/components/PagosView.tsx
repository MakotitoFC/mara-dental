"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { PagosDashboardSede, PresupuestoPendiente } from "../actions";
import { RegistrarPagoSheet } from "./RegistrarPagoSheet";
import type { ClinicaInfo } from "@/lib/reportExport";

// Mismo patrón de avatar determinístico por id que ya usa PacientesView.tsx.
const AVATAR_PALETTE = [
  { bg: "bg-cyan-50 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-400" },
  { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" },
] as const;

function avatarStyle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
function initials(nombre: string) {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}
function fmtFechaRelativa(iso: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diffDias = Math.round((hoy.getTime() - d.getTime()) / 86400000);
  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Ayer";
  if (diffDias > 1) return `Hace ${diffDias} días`;
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}
function simbolo(moneda: string) {
  return moneda === "PEN" ? "S/" : moneda;
}

export function PagosView({ initialDashboard, mediosPago, sede }: {
  initialDashboard: PagosDashboardSede;
  mediosPago: { id: number; nombre: string }[];
  sede: ClinicaInfo | null;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [query, setQuery] = useState("");
  const [activo, setActivo] = useState<PresupuestoPendiente | null>(null);

  const pendientesFiltrados = useMemo(() => {
    if (!query.trim()) return dashboard.pendientes;
    const q = query.trim().toLowerCase();
    return dashboard.pendientes.filter((p) => p.paciente_nombre.toLowerCase().includes(q));
  }, [dashboard.pendientes, query]);

  function handlePagoRegistrado(presupuestoId: string, nuevoSaldo: number, montoPagado: number, medioNombre: string) {
    setDashboard((prev) => {
      const pendientes = nuevoSaldo <= 0.009
        ? prev.pendientes.filter((p) => p.id !== presupuestoId)
        : prev.pendientes.map((p) => (p.id === presupuestoId ? { ...p, saldo: nuevoSaldo, pagado: p.total_neto - nuevoSaldo } : p));

      const metodosPago = (() => {
        const acc = new Map(prev.metodosPago.map((m) => [m.nombre, m.monto]));
        acc.set(medioNombre, (acc.get(medioNombre) ?? 0) + montoPagado);
        const total = Array.from(acc.values()).reduce((a, b) => a + b, 0);
        return Array.from(acc.entries())
          .map(([nombre, monto]) => ({ nombre, monto, porcentaje: total > 0 ? Math.round((monto / total) * 100) : 0 }))
          .sort((a, b) => b.monto - a.monto);
      })();

      return {
        ...prev,
        pendientes,
        metodosPago,
        ingresosHoy: prev.ingresosHoy + montoPagado,
        comprobantesHoy: prev.comprobantesHoy + 1,
        esMock: false,
      };
    });
    setActivo(null);
  }

  const monedaBase = dashboard.pendientes[0]?.moneda ?? dashboard.historial[0]?.moneda ?? "PEN";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900/50">
      <div className="shrink-0 px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Panel de Pagos</h1>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">Gestiona cobros, genera comprobantes y revisa las transacciones recientes.</p>
        </div>
        <div className="relative sm:w-64">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paciente…"
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-[13px] pr-9 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
          />
          <Icon name="search" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      {dashboard.esMock && (
        <div className="shrink-0 flex items-center gap-2 px-4 md:px-6 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
          <Icon name="info" size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[11.5px] text-amber-700 dark:text-amber-400 font-medium">
            Mostrando datos de ejemplo — tu sede todavía no tiene presupuestos ni pagos registrados.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Pendientes de cobro */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Icon name="payments" size={16} />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Pendientes de Cobro</h2>
              </div>
              <span className="text-[10.5px] font-bold px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                {pendientesFiltrados.length} pendiente{pendientesFiltrados.length !== 1 ? "s" : ""}
              </span>
            </div>

            {pendientesFiltrados.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                <Icon name="payments" size={30} className="opacity-30 mx-auto mb-2" />
                <p className="text-[12.5px]">{dashboard.pendientes.length === 0 ? "Sin pagos pendientes" : "Sin resultados para tu búsqueda"}</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
                {pendientesFiltrados.map((p) => {
                  const av = avatarStyle(p.paciente_id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
                      <div className={`w-11 h-11 rounded-full ${av.bg} flex items-center justify-center font-bold text-[13px] ${av.text} shrink-0`}>
                        {initials(p.paciente_nombre)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">{p.paciente_nombre}</p>
                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">{p.tratamiento}</p>
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                          <Icon name="event" size={11} /> {fmtFechaRelativa(p.fecha_emision)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                          {simbolo(p.moneda)} {p.saldo.toFixed(2)}
                        </span>
                        <button
                          onClick={() => setActivo(p)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[11.5px] font-semibold transition-colors"
                        >
                          <Icon name="description" size={13} />
                          Registrar pago
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel lateral */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Icon name="payments" size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">Ingresos de hoy</p>
                  <p className="text-[16px] font-bold text-slate-900 dark:text-slate-100 truncate">{simbolo(monedaBase)} {dashboard.ingresosHoy.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Icon name="description" size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">Comprobantes hoy</p>
                  <p className="text-[16px] font-bold text-slate-900 dark:text-slate-100">{dashboard.comprobantesHoy}</p>
                </div>
              </div>
            </div>

            {/* Métodos de pago */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mb-3">Métodos de Pago</h3>
              {dashboard.metodosPago.length === 0 ? (
                <p className="text-[11.5px] text-slate-400 dark:text-slate-500">Sin pagos registrados aún.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {dashboard.metodosPago.map((m) => (
                    <div key={m.nombre}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11.5px] font-medium text-slate-600 dark:text-slate-300 truncate">{m.nombre}</span>
                        <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 shrink-0">{m.porcentaje}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full bg-cyan-600 rounded-full transition-all" style={{ width: `${m.porcentaje}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial reciente */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 mb-3">Historial Reciente</h3>
              {dashboard.historial.length === 0 ? (
                <p className="text-[11.5px] text-slate-400 dark:text-slate-500">Sin pagos registrados aún.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {dashboard.historial.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">{h.paciente_nombre}</p>
                        <p className="text-[10.5px] text-slate-400 dark:text-slate-500">{h.medio_pago_nombre}</p>
                      </div>
                      <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {simbolo(h.moneda)} {h.monto.toFixed(2)}
                      </span>
                    </div>
                  ))}
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
            sede={sede}
            onClose={() => setActivo(null)}
            onSaved={handlePagoRegistrado}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
