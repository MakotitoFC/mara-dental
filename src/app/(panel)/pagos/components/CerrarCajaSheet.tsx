"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { cerrarCajaAction, getMontosEsperadosCajaAction } from "../caja.actions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function CerrarCajaSheet({
  cajaId, mediosPago, onClose
}: {
  cajaId: string;
  mediosPago: { id: number; nombre: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [esperados, setEsperados] = useState<Record<number, number>>({});
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMontosEsperadosCajaAction(cajaId).then(data => {
      const map: Record<number, number> = {};
      data.forEach(d => map[d.medio_pago_id] = d.monto);
      setEsperados(map);
    });
  }, [cajaId]);

  const handleCerrar = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = mediosPago.map(m => ({
        medio_pago_id: m.id,
        monto: Number(montos[m.id] || 0)
      }));

      for (const m of payload) {
        const esperado = esperados[m.medio_pago_id] || 0;
        if (m.monto < esperado) {
          setError(`El monto ingresado para el medio de pago debe ser mayor o igual a S/ ${esperado.toFixed(2)}`);
          setSaving(false);
          return;
        }
      }

      const res = await cerrarCajaAction(cajaId, payload);
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
  };

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Cerrar turno de caja"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p className="text-[11.5px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5">
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
              disabled={saving}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
            >
              <Icon name="logout" size={15} />
              {saving ? "Cerrando…" : "Cerrar Caja"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1 pb-2">
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[12.5px] leading-snug">
          Ingresa los saldos finales para el cuadre de caja de hoy. Esto bloqueará la opción de registrar nuevos pagos.
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">Saldos finales por medio de pago</h3>
          {mediosPago.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="w-1/2 flex flex-col">
                <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">{m.nombre}</span>
                <span className="text-[10.5px] text-slate-500">Esperado: S/ {(esperados[m.id] || 0).toFixed(2)}</span>
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">S/</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montos[m.id] || ""}
                  onChange={(e) => setMontos(prev => ({ ...prev, [m.id]: e.target.value }))}
                  className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-lg focus:outline-none focus:border-cyan-400"
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ResponsiveSheet>
  );
}
