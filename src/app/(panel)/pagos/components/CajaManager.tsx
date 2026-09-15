"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { TextInput } from "@/components/ui/TextInput";
import { abrirCajaAction, getUltimoCierreCajaAction } from "../caja.actions";
import { useRouter } from "next/navigation";

export function CajaManager({
  mediosPago,
  initialCierreAnterior,
}: {
  mediosPago: { id: number; nombre: string }[];
  initialCierreAnterior?: { esPrimeraVez: boolean; montos: Record<number, number>; fecha_cierre: string | null };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cierreInfo, setCierreInfo] = useState(initialCierreAnterior ?? null);
  const [cargandoCierre, setCargandoCierre] = useState(!initialCierreAnterior);
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialCierreAnterior) {
      setCargandoCierre(true);
      getUltimoCierreCajaAction().then((info) => {
        setCierreInfo(info);
        setCargandoCierre(false);
      });
    }
  }, [initialCierreAnterior]);

  // Inicializar montos cuando cierreInfo esté listo
  useEffect(() => {
    if (!cierreInfo) return;
    const initialMap: Record<number, string> = {};
    mediosPago.forEach((m) => {
      if (cierreInfo.esPrimeraVez) {
        initialMap[m.id] = "0.00";
      } else {
        const val = cierreInfo.montos[m.id] ?? 0;
        initialMap[m.id] = val.toFixed(2);
      }
    });
    setMontos(initialMap);
  }, [cierreInfo, mediosPago]);

  const esPrimeraVez = cierreInfo?.esPrimeraVez ?? true;

  // Detectar si hay diferencias con respecto al cierre anterior
  const diferencias = mediosPago.map((m) => {
    const anterior = cierreInfo?.montos[m.id] ?? 0;
    const actual = Number(montos[m.id] || 0);
    const diff = Number((actual - anterior).toFixed(2));
    return {
      id: m.id,
      nombre: m.nombre,
      anterior,
      actual,
      diff,
      hayDiferencia: !esPrimeraVez && Math.abs(diff) > 0.009,
    };
  });

  const hayAlgunaDiferencia = diferencias.some((d) => d.hayDiferencia);

  const handleAbrirCaja = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = mediosPago.map((m) => ({
        medio_pago_id: m.id,
        monto: Number(montos[m.id] || 0),
      }));

      const res = await abrirCajaAction(payload);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch {
      setError("Error inesperado al abrir la caja.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 min-h-screen">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4">
          <Icon name="point_of_sale" size={24} />
        </div>
        <h2 className="text-xl font-bold text-center text-slate-900 mb-2">Turno de Caja Cerrado</h2>
        <p className="text-[13px] text-center text-slate-500 mb-5">
          Para comenzar a registrar pagos y gestionar comprobantes, debes aperturar tu turno de caja.
        </p>

        {/* Mensaje informativo sobre el cierre anterior */}
        {cargandoCierre ? (
          <div className="py-3 text-center text-slate-400 text-[12px] flex items-center justify-center gap-2 mb-4">
            <Icon name="progress_activity" size={15} className="animate-spin" />
            <span>Consultando saldo del cierre anterior...</span>
          </div>
        ) : !esPrimeraVez ? (
          <div className="p-3 bg-cyan-50/80 border border-cyan-200/70 rounded-xl text-[12px] text-cyan-900 flex items-start gap-2.5 mb-5">
            <Icon name="history" size={17} className="shrink-0 text-cyan-600 mt-0.5" />
            <div>
              <p className="font-bold">Montos de cierre anterior precargados</p>
              <p className="text-[11.5px] text-cyan-800 mt-0.5 leading-relaxed">
                Tu caja anterior cerró con estos montos. Si ingresas un número mayor o menor, el sistema te obligará a registrar el movimiento de ajuste (ingreso o egreso) para mantener la caja cuadrada.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] text-slate-600 flex items-start gap-2.5 mb-5">
            <Icon name="info" size={16} className="shrink-0 text-slate-500 mt-0.5" />
            <div>
              <p className="font-semibold">Primera apertura de caja</p>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                No hay turnos anteriores cerrados registrados. Los saldos iniciales parten en cero para que ingreses los montos de apertura.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center pb-1 border-b border-slate-100">
            <h3 className="text-[13px] font-semibold text-slate-800">Saldos iniciales de apertura</h3>
            {!esPrimeraVez && (
              <span className="text-[10.5px] font-medium text-slate-400">Cierre anterior</span>
            )}
          </div>

          {mediosPago.map((m) => {
            const anterior = cierreInfo?.montos[m.id] ?? 0;
            const actual = Number(montos[m.id] || 0);
            const diff = Number((actual - anterior).toFixed(2));
            const hayDiff = !esPrimeraVez && Math.abs(diff) > 0.009;

            return (
              <div key={m.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="w-1/2 flex flex-col">
                    <span className="text-[13px] font-medium text-slate-700">{m.nombre}</span>
                    {!esPrimeraVez && (
                      <span className="text-[10.5px] text-slate-400">
                        Cerró en: S/ {anterior.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">
                      S/
                    </span>
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={montos[m.id] ?? ""}
                      onChange={(e) =>
                        setMontos((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="pl-8 pr-3 font-semibold text-slate-800"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {hayDiff && (
                  <div className="text-[11px] font-medium px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-between">
                    <span>
                      Diferencia: {diff > 0 ? `+S/ ${diff.toFixed(2)}` : `−S/ ${Math.abs(diff).toFixed(2)}`}
                    </span>
                    <span className="font-bold">
                      {diff > 0 ? "Ajuste de Ingreso" : "Ajuste de Egreso"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hayAlgunaDiferencia && (
          <div className="mb-4 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-[12px] text-amber-800 flex items-start gap-2">
            <Icon name="warning" size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Discrepancias detectadas</p>
              <p className="text-[11.5px] text-amber-700 mt-0.5 leading-relaxed">
                Al abrir la caja, el sistema te solicitará obligatoriamente registrar el movimiento de ajuste para justificar la diferencia antes de permitir otras operaciones.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-[12px] font-medium text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleAbrirCaja}
          disabled={loading || cargandoCierre}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
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
