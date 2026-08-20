"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { responderValidacionAction, getValidacionesPendientesAction } from "@/app/(panel)/validaciones/actions";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ValidacionesView({ validaciones, sedeId }: { validaciones: any[], sedeId: number }) {
  const router = useRouter();
  const [localValidaciones, setLocalValidaciones] = useState<any[]>(validaciones);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [rechazarModal, setRechazarModal] = useState<string | null>(null);
  const [aprobarModal, setAprobarModal] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setLocalValidaciones(validaciones);
  }, [validaciones]);

  useEffect(() => {
    if (!sedeId) return;
    const supabase = createClient();

    async function reloadFullList() {
      try {
        const fullList = await getValidacionesPendientesAction(sedeId);
        setLocalValidaciones(fullList);
      } catch (e) {
        console.error("Error recargando validaciones:", e);
      }
    }

    const channel = supabase.channel("validaciones_view")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitud_validacion", filter: `sede_id=eq.${sedeId}` }, async (payload) => {
        console.log("[ValidacionesView] POSTGRES event received:", payload);
        if (payload.eventType === "DELETE") {
          setLocalValidaciones(prev => prev.filter(v => v.id !== payload.old.id));
        } else {
          reloadFullList();
        }
      })
      .on("broadcast", { event: "NEW_VALIDACION" }, (payload) => {
        console.log("[ValidacionesView] BROADCAST event received:", payload);
        if (!payload.payload?.sede_id || payload.payload?.sede_id === sedeId) {
          if (payload.payload?.presupuesto_info) {
            setLocalValidaciones(prev => {
              const existingIdx = prev.findIndex(v => v.id === payload.payload.id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = payload.payload;
                return next;
              }
              return [payload.payload, ...prev];
            });
          } else {
            reloadFullList();
          }
        }
      })
      .subscribe((status) => {
        console.log("[ValidacionesView] Realtime status:", status);
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sedeId]);

  async function handleAprobar(id: string) {
    if (procesando) return;
    
    setProcesando(id);
    const res = await responderValidacionAction(id, "aprobar");
    setProcesando(null);

    if (res?.error) {
      setErrorMsg("Error: " + res.error);
    } else {
      setAprobarModal(null);
      setErrorMsg("");
      setLocalValidaciones(prev => prev.filter(v => v.id !== id));
    }
  }

  async function handleRechazar(id: string) {
    if (!comentario.trim()) {
      setErrorMsg("Debe ingresar un comentario indicando la razón del rechazo.");
      return;
    }
    
    setProcesando(id);
    setErrorMsg("");
    const res = await responderValidacionAction(id, "rechazar", comentario);
    setProcesando(null);

    if (res?.error) {
      setErrorMsg("Error: " + res.error);
    } else {
      setRechazarModal(null);
      setComentario("");
      setLocalValidaciones(prev => prev.filter(v => v.id !== id));
    }
  }

  const selectedAprobar = localValidaciones.find(v => v.id === aprobarModal);
  const isDevolucionAprobar = selectedAprobar?.tipo_accion === "devolucion_presupuesto";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] sm:text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Validaciones Pendientes
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Aprueba o rechaza solicitudes operativas de la sede (eliminación de cuotas, devoluciones y anulaciones) con información en tiempo real.
        </p>
      </div>

      <div className="space-y-4 pb-20">
      {localValidaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <Icon name="check_circle" className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Todo al día</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">No hay validaciones pendientes de aprobación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {localValidaciones.map((v) => {
            const d = new Date(v.fecha_solicitud);
            const dateStr = !isNaN(d.getTime()) 
              ? `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`
              : "Fecha reciente";
            const isDeletingCuotas = v.tipo_accion === "eliminar_cuotas";
            const isDevolucion = v.tipo_accion === "devolucion_presupuesto";
            const pInfo = v.presupuesto_info;

            return (
              <div key={v.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3">
                  {/* Encabezado del tipo de solicitud */}
                  <div className="flex justify-between items-start gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                      isDevolucion
                        ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    }`}>
                      <Icon name={isDevolucion ? "undo" : "warning"} size={13} />
                      {isDevolucion ? "Devolución y Anulación" : isDeletingCuotas ? "Eliminación de Cuotas" : v.tipo_accion}
                    </span>
                    <span className="text-[11.5px] font-medium text-slate-400">
                      {dateStr}
                    </span>
                  </div>

                  {/* Información del Solicitante */}
                  <div className="flex items-center gap-2 text-[12.5px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                    <Icon name="badge" size={16} className="text-slate-400 shrink-0" />
                    <span>
                      Solicitado por: <strong className="text-slate-800 dark:text-slate-100">{v.solicitante?.nombre} {v.solicitante?.apellido}</strong>
                    </span>
                  </div>

                  {/* Motivo de la solicitud si existe */}
                  {v.comentarios && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] text-slate-700 dark:text-slate-300">
                      <strong className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">Motivo ingresado:</strong>
                      <span>{v.comentarios}</span>
                    </div>
                  )}

                  {/* Detalles del Presupuesto y Paciente */}
                  {pInfo ? (
                    <div className="flex flex-col gap-2.5 p-3.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100">
                            {pInfo.paciente_nombre}
                          </p>
                          {pInfo.paciente_dni && (
                            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                              DNI: {pInfo.paciente_dni}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[14px] font-extrabold text-cyan-700 dark:text-cyan-400">
                            {pInfo.moneda === "PEN" ? "S/" : pInfo.moneda} {pInfo.total_neto.toFixed(2)}
                          </span>
                          <p className="text-[11px] text-slate-400">Total presupuesto</p>
                        </div>
                      </div>

                      <p className="text-[12px] text-slate-600 dark:text-slate-300 font-medium">
                        Tratamiento: <span className="font-normal">{pInfo.tratamiento}</span>
                      </p>

                      {/* Información Específica para Devolución */}
                      {isDevolucion ? (
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/25 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-800 dark:text-rose-300 text-[12px] flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold uppercase text-[11px]">Monto Total a Devolver:</span>
                            <span className="text-[16px] font-extrabold text-rose-600 dark:text-rose-400">
                              {pInfo.moneda === "PEN" ? "S/" : pInfo.moneda} {pInfo.monto_pagado.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[11px] text-rose-700 dark:text-rose-300 opacity-90">
                            Al aprobar, se anularán los movimientos/comprobantes, se generará el egreso en caja por este monto y el presupuesto pasará a <strong>Rechazado</strong>.
                          </span>
                        </div>
                      ) : (
                        /* Estado crítico de pagos en eliminación de cuotas */
                        pInfo.tiene_pagos ? (
                          <div className="p-2.5 bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-800/60 rounded-lg text-red-700 dark:text-red-300 text-[12px] flex items-start gap-2">
                            <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                            <div>
                              <strong className="block font-bold">¡Atención! Ya se registraron pagos:</strong>
                              <span>Se han cobrado {pInfo.cuotas_pagadas_count} de {pInfo.cuotas_total} cuotas por un total de <strong>{pInfo.moneda === "PEN" ? "S/" : pInfo.moneda} {pInfo.monto_pagado.toFixed(2)}</strong>.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-emerald-700 dark:text-emerald-300 text-[12px] flex items-center gap-1.5">
                            <Icon name="check_circle" size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Ninguna cuota ha sido pagada (0/{pInfo.cuotas_total}). Es seguro eliminar.</span>
                          </div>
                        )
                      )}

                      {/* Desglose de Cuotas si existen */}
                      {pInfo.cuotas && pInfo.cuotas.length > 0 && (
                        <div className="mt-1 flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                          <p className="text-[11px] font-bold text-slate-500 uppercase">Cuotas generadas:</p>
                          <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                            {pInfo.cuotas.map((c: any) => (
                              <div key={c.id || c.numero_cuota} className="flex justify-between items-center px-2.5 py-1.5 text-[11.5px]">
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  Cuota {c.numero_cuota} ({pInfo.moneda === "PEN" ? "S/" : pInfo.moneda} {Number(c.monto).toFixed(2)})
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  c.movimiento_caja_id || c.estado === "pagado"
                                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" 
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                }`}>
                                  {c.movimiento_caja_id || c.estado === "pagado" ? "Pagado" : "Pendiente"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[12px] text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl">
                      Referencia ID: <code className="font-mono text-[11px]">{v.referencia_id}</code>
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setRechazarModal(v.id)}
                    disabled={procesando === v.id}
                    className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-700 dark:hover:bg-red-900/30 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 text-[13px] font-semibold transition-colors disabled:opacity-50"
                  >
                    <Icon name="close" size={16} />
                    Rechazar
                  </button>
                  <button
                    onClick={() => setAprobarModal(v.id)}
                    disabled={procesando === v.id}
                    className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-white text-[13px] font-semibold transition-colors shadow-sm disabled:opacity-50 ${
                      isDevolucion ? "bg-rose-600 hover:bg-rose-700" : "bg-cyan-600 hover:bg-cyan-700"
                    }`}
                  >
                    <Icon name={isDevolucion ? "undo" : "check"} size={16} />
                    {procesando === v.id
                      ? "Aprobando..."
                      : isDevolucion
                      ? "Aprobar Devolución"
                      : "Aprobar y Eliminar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Modal Aprobar */}
      <AnimatePresence>
        {aprobarModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDevolucionAprobar
                  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              }`}>
                <Icon name={isDevolucionAprobar ? "undo" : "check"} size={24} />
              </div>
              <h3 className="text-[18px] font-bold text-center text-slate-900 dark:text-slate-100 mb-2">
                {isDevolucionAprobar ? "Aprobar Devolución y Anulación" : "Aprobar Solicitud"}
              </h3>
              <p className="text-[13px] text-center text-slate-500 dark:text-slate-400 mb-6">
                {isDevolucionAprobar
                  ? "¿Está seguro de aprobar la devolución? Todos los pagos y comprobantes quedarán anulados, se registrará el egreso correspondiente en caja y el presupuesto pasará a rechazado."
                  : "¿Está seguro de aprobar la eliminación de cuotas de este presupuesto? Se eliminarán de inmediato para que el asistente pueda generar nuevas cuotas."}
              </p>

              {errorMsg && <p className="text-[12px] text-red-500 font-medium mb-3 text-center">{errorMsg}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => { setAprobarModal(null); setErrorMsg(""); }}
                  className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[13.5px] font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleAprobar(aprobarModal)}
                  disabled={procesando === aprobarModal}
                  className={`flex-1 h-11 rounded-xl text-white text-[13.5px] font-semibold transition-colors disabled:opacity-50 ${
                    isDevolucionAprobar ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {procesando === aprobarModal ? "Ejecutando..." : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Rechazar */}
      <AnimatePresence>
        {rechazarModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-slate-100 mb-2">
                Rechazar Solicitud
              </h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-4">
                El solicitante necesita saber por qué se rechaza esta acción.
              </p>

              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ej. La devolución no procede porque el tratamiento ya se inició..."
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-[13px] outline-none focus:border-red-400 mb-2 min-h-[80px]"
              />
              
              {errorMsg && <p className="text-[12px] text-red-500 font-medium mb-3">{errorMsg}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => { setRechazarModal(null); setComentario(""); setErrorMsg(""); }}
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[13px] font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRechazar(rechazarModal)}
                  disabled={procesando === rechazarModal}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                >
                  {procesando === rechazarModal ? "Rechazando..." : "Confirmar Rechazo"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
