"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { responderValidacionAction } from "@/app/(panel)/validaciones/actions";
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
    const channel = supabase.channel("validaciones_view")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitud_validacion", filter: `sede_id=eq.${sedeId}` }, async (payload) => {
        console.log("[ValidacionesView] POSTGRES event received:", payload);
        handleNewPayload(payload);
      })
      .on("broadcast", { event: "NEW_VALIDACION" }, (payload) => {
        console.log("[ValidacionesView] BROADCAST event received:", payload);
        // Simulamos un payload de postgres_changes
        handleNewPayload({
          eventType: "INSERT",
          new: payload.payload
        } as any);
      })
      .subscribe((status) => {
        console.log("[ValidacionesView] Realtime status:", status);
      });

    function handleNewPayload(payload: any) {
      if (payload.eventType === "INSERT") {
        let nombre = payload.new.solicitante_nombre || "Usuario";
        let apellido = payload.new.solicitante_apellido || "Desconocido";

        setLocalValidaciones(prev => {
          if (prev.some(v => v.id === payload.new.id)) {
            console.log("Ignorando duplicado:", payload.new.id);
            return prev;
          }
          const newState = [{ ...payload.new, solicitante: { nombre, apellido } }, ...prev];
          console.log("Nuevo estado localValidaciones:", newState);
          return newState;
        });
      } else if (payload.eventType === "UPDATE") {
        setLocalValidaciones(prev => prev.map(v => v.id === payload.new.id ? { ...v, ...payload.new } : v));
      } else if (payload.eventType === "DELETE") {
        setLocalValidaciones(prev => prev.filter(v => v.id !== payload.old.id));
      }
    }
      
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
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] sm:text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Validaciones Pendientes
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Aprueba o rechaza solicitudes operativas de la sede.
        </p>
      </div>

      <div className="space-y-4 pb-20">
      {localValidaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <Icon name="CheckCircle" className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Todo al día</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">No hay validaciones pendientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localValidaciones.map((v) => {
            const d = new Date(v.fecha_solicitud);
            const dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
            const isDeletingCuotas = v.tipo_accion === "eliminar_cuotas";

            return (
              <div key={v.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider mb-2">
                      <Icon name="warning" size={12} />
                      {isDeletingCuotas ? "Eliminación de Cuotas" : v.tipo_accion}
                    </span>
                    <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                      Ref: {v.referencia_id}
                    </p>
                    <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
                      Solicitado por: <span className="font-medium text-slate-700 dark:text-slate-300">{v.solicitante?.nombre} {v.solicitante?.apellido}</span>
                    </p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">
                      {dateStr}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setRechazarModal(v.id)}
                    disabled={procesando === v.id}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 text-[12.5px] font-semibold transition-colors disabled:opacity-50"
                  >
                    <Icon name="close" size={16} />
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleAprobar(v.id)}
                    disabled={procesando === v.id}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Icon name="check" size={16} />
                    {procesando === v.id ? "Aprobando..." : "Aprobar y Ejecutar"}
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
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="check" size={24} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-[18px] font-bold text-center text-slate-900 dark:text-slate-100 mb-2">
                Aprobar Solicitud
              </h3>
              <p className="text-[14px] text-center text-slate-500 mb-6">
                ¿Está seguro de aprobar esta solicitud? Se ejecutará la acción de inmediato y de forma irreversible.
              </p>

              {errorMsg && <p className="text-[12px] text-red-500 font-medium mb-3 text-center">{errorMsg}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => { setAprobarModal(null); setErrorMsg(""); }}
                  className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[14px] font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleAprobar(aprobarModal)}
                  disabled={procesando === aprobarModal}
                  className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[14px] font-semibold transition-colors disabled:opacity-50"
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
              <p className="text-[13px] text-slate-500 mb-4">
                El solicitante necesita saber por qué se rechaza esta acción.
              </p>

              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ej. Las cuotas ya fueron pagadas, no se pueden eliminar..."
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-[13px] outline-none focus:border-red-400 mb-2 min-h-[80px]"
              />
              
              {errorMsg && <p className="text-[12px] text-red-500 font-medium mb-3">{errorMsg}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => { setRechazarModal(null); setComentario(""); setErrorMsg(""); }}
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRechazar(rechazarModal)}
                  disabled={procesando === rechazarModal}
                  className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
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
