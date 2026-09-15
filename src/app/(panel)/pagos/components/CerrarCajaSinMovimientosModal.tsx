"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { cerrarCajaSinMovimientosAction, getDetalleCierreCajaAction, type ResumenMedioCierre } from "../caja.actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface CerrarCajaSinMovimientosModalProps {
  cajaId: string;
  onClose: () => void;
  onClosed?: () => void;
}

export function CerrarCajaSinMovimientosModal({
  cajaId,
  onClose,
  onClosed,
}: CerrarCajaSinMovimientosModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediosApertura, setMediosApertura] = useState<ResumenMedioCierre[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const detalle = await getDetalleCierreCajaAction(cajaId);
      if (detalle) {
        setMediosApertura(detalle.resumen_medios);
      }
      setLoading(false);
    }
    load();
  }, [cajaId]);

  const handleConfirmar = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await cerrarCajaSinMovimientosAction(cajaId);
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Caja cerrada correctamente con los montos de apertura.");
        router.refresh();
        onClosed?.();
        onClose();
      }
    } catch {
      setError("Error inesperado al cerrar la caja.");
    } finally {
      setSaving(false);
    }
  };

  const totalApertura = mediosApertura.reduce((acc, m) => acc + (m.apertura || 0), 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-100 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ícono de información */}
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-3.5">
            <Icon name="point_of_sale" size={24} />
          </div>

          <h3 className="text-[16px] font-bold text-slate-800 text-center mb-1.5">
            Cierre de Caja sin Movimientos
          </h3>

          <p className="text-[12.5px] text-slate-500 text-center mb-4 leading-relaxed">
            No se ha registrado ningún movimiento durante este turno de caja. Al no haber transacciones, la caja se cerrará con los montos de apertura intactos.
          </p>

          {/* Desglose de montos de apertura */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 mb-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Medio de Pago
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Monto de Apertura
              </span>
            </div>

            {loading ? (
              <div className="py-4 text-center text-slate-400 text-[12px] flex items-center justify-center gap-2">
                <Icon name="progress_activity" size={16} className="animate-spin" />
                Cargando montos de apertura...
              </div>
            ) : mediosApertura.length === 0 ? (
              <p className="text-[12px] text-slate-400 text-center py-2">Sin montos registrados.</p>
            ) : (
              <div className="space-y-1.5">
                {mediosApertura.map((m) => (
                  <div key={m.medio_pago_id} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-slate-600 font-medium">{m.nombre}</span>
                    <span className="font-semibold text-slate-800">
                      S/ {Number(m.apertura || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[13px] font-bold text-slate-900">
                  <span>Total Apertura:</span>
                  <span className="text-cyan-700">S/ {totalApertura.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-2.5 bg-red-50 text-red-600 rounded-lg text-[12px] font-medium flex items-center gap-2">
              <Icon name="warning" size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={saving || loading}
              className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  <span>Cerrando...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  <span>Confirmar Cierre</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
