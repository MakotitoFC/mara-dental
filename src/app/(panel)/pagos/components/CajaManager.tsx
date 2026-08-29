"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { abrirCajaAction } from "../caja.actions";
import { useRouter } from "next/navigation";

export function CajaManager({ mediosPago }: { mediosPago: { id: number; nombre: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleAbrirCaja = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = mediosPago.map(m => ({
        medio_pago_id: m.id,
        monto: Number(montos[m.id] || 0)
      }));

      const res = await abrirCajaAction(payload);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError("Error inesperado al abrir la caja.");
    } finally {
      setLoading(false);
    }
  };

  return (
 <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6">
 <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
 <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4">
          <Icon name="point_of_sale" size={24} />
        </div>
 <h2 className="text-xl font-bold text-center text-slate-900 mb-2">Turno de Caja Cerrado</h2>
 <p className="text-[13px] text-center text-slate-500 mb-6">
          Para comenzar a registrar pagos y gestionar comprobantes, debes aperturar tu turno de caja.
        </p>

        <div className="space-y-4 mb-6">
 <h3 className="text-[13px] font-semibold text-slate-800">Saldos iniciales por medio de pago</h3>
          {mediosPago.map(m => (
            <div key={m.id} className="flex items-center gap-3">
 <span className="w-1/2 text-[13px] text-slate-600">{m.nombre}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">S/</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montos[m.id] || ""}
                  onChange={(e) => setMontos(prev => ({ ...prev, [m.id]: e.target.value }))}
 className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-cyan-400"
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
        </div>

        {error && (
 <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-[12px] font-medium text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleAbrirCaja}
          disabled={loading}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <Icon name="progress_activity" size={16} className="animate-spin" />
          ) : (
            <Icon name="lock_open" size={16} />
          )}
          Abrir Turno de Caja
        </button>
      </div>
    </div>
  );
}
