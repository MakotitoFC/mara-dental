"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { generarCuotasAction, eliminarCuotasAction, solicitarValidacionAction, getSolicitudValidacionAction } from "../cuotas.actions";
import type { PresupuestoPendiente } from "../actions";
import { createClient } from "@/lib/supabase/client";

export function CuotasSheet({
  presupuesto, onClose, onRefresh, onCuotasActualizadas
}: {
  presupuesto: PresupuestoPendiente;
  onClose: () => void;
  onRefresh: () => void;
  onCuotasActualizadas?: (cuotas: any[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // States for generation
  const [numCuotas, setNumCuotas] = useState<number>(2);
  const [frecuencia, setFrecuencia] = useState<"semanal" | "quincenal" | "mensual" | "trimestral">("mensual");
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split("T")[0]);

  const existingCuotas = presupuesto.cuotas || [];
  const hasCuotas = existingCuotas.length > 0;

  const [solicitudEstado, setSolicitudEstado] = useState<any>(null);
  const [loadingEstado, setLoadingEstado] = useState(true);

  // Realtime para escuchar validaciones y carga inicial
  useEffect(() => {
    if (!hasCuotas) {
      setLoadingEstado(false);
      return;
    }

    let isMounted = true;
    getSolicitudValidacionAction(presupuesto.id, "eliminar_cuotas").then(s => {
      if (isMounted) {
        setSolicitudEstado(s);
        setLoadingEstado(false);
      }
    });

    const supabase = createClient();
    const channel = supabase.channel(`validaciones_cuotas_${presupuesto.id}`)
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "solicitud_validacion",
        filter: `referencia_id=eq.${presupuesto.id}`
      }, (payload) => {
        const estado = payload.new.estado;
        if (isMounted) {
          setSolicitudEstado(payload.new);
          if (estado === "aprobada") {
            setInfo("¡El administrador aprobó la eliminación! Las cuotas han sido eliminadas.");
            setError(null);
            if (onCuotasActualizadas) {
              onCuotasActualizadas([]);
            }
          } else if (estado === "rechazada") {
            setInfo(null);
          }
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [presupuesto.id, hasCuotas, onRefresh]);

  const handleGenerar = async () => {
    setLoading(true);
    setError(null);
    try {
      const amountPerQuota = Math.floor((presupuesto.saldo / numCuotas) * 10) / 10;
      let totalAssigned = 0;
      const cuotas = [];
      const startDate = new Date(fechaInicio);

      for (let i = 0; i < numCuotas; i++) {
        const isLast = i === numCuotas - 1;
        const monto = isLast ? Math.round((presupuesto.saldo - totalAssigned) * 10) / 10 : amountPerQuota;
        totalAssigned += monto;

        const vDate = new Date(startDate);
        if (frecuencia === "semanal") vDate.setDate(vDate.getDate() + i * 7);
        else if (frecuencia === "quincenal") vDate.setDate(vDate.getDate() + i * 15);
        else if (frecuencia === "mensual") vDate.setMonth(vDate.getMonth() + i);
        else if (frecuencia === "trimestral") vDate.setMonth(vDate.getMonth() + i * 3);

        cuotas.push({
          numero_cuota: i + 1,
          monto,
          fecha_vencimiento: vDate.toISOString().split("T")[0]
        });
      }

      const res = await generarCuotasAction({
        presupuesto_id: presupuesto.id,
        cuotas,
        paciente_id: presupuesto.paciente_id
      });

      if (res.error) setError(res.error);
      else {
        setInfo("Cuotas generadas correctamente.");
        if (onCuotasActualizadas) {
          onCuotasActualizadas(cuotas);
        }
        // No llamamos onRefresh() para evitar el re-render de la página entera
        // que causaba el error de Turbopack al interrumpir el stream.
      }
    } catch (e) {
      setError("Error generando cuotas");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await solicitarValidacionAction(presupuesto.id, "eliminar_cuotas");
      if (res.error) {
        setError(res.error);
      } else {
        setInfo("Se ha enviado la solicitud al administrador. Espere su aprobación para eliminar las cuotas.");
        setSolicitudEstado({ estado: "pendiente" }); // Optimistic
      }
    } catch (e) {
      setError("Error procesando la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Gestión de Cuotas"
      footer={
        <div className="flex w-full">
          <button onClick={onClose} className="w-full h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-[13px]">
            Cerrar
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[12px] font-medium flex items-center gap-2">
            <Icon name="warning" size={16} /> {error}
          </div>
        )}
        {info && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[12px] font-medium flex items-center gap-2">
            <Icon name="check_circle" size={16} /> {info}
          </div>
        )}

        {hasCuotas ? (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Cuotas Generadas</h3>
              {!loadingEstado && solicitudEstado?.estado !== "pendiente" && (
                <button onClick={handleEliminar} disabled={loading} className="text-red-500 hover:text-red-600 text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50">
                  <Icon name="delete" size={14} /> Eliminar Cuotas
                </button>
              )}
            </div>

            {!loadingEstado && solicitudEstado?.estado === "pendiente" && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-xl text-[12px] font-medium flex items-center gap-2">
                <Icon name="warning" size={16} /> Solicitud de eliminación pendiente de aprobación.
              </div>
            )}

            {!loadingEstado && solicitudEstado?.estado === "rechazada" && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl text-[12px] font-medium flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Icon name="warning" size={16} className="mt-0.5 shrink-0" />
                  <span>El administrador rechazó su solicitud: <strong>{solicitudEstado.comentarios || "Sin comentarios"}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={handleEliminar} disabled={loading} className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                    Volver a solicitar
                  </button>
                  <button onClick={() => setSolicitudEstado(null)} disabled={loading} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
              {existingCuotas.map(c => (
                <div key={c.id || c.numero_cuota} className="flex justify-between items-center p-3 text-[12.5px]">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Cuota {c.numero_cuota}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">Vence: {c.fecha_vencimiento}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{presupuesto.moneda} {c.monto.toFixed(2)}</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${c.estado === "pagado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {c.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50 dark:bg-cyan-900/20">
              <p className="text-[13px] text-cyan-800 dark:text-cyan-300 font-medium">
                Saldo a dividir: <span className="font-bold">{presupuesto.moneda} {presupuesto.saldo.toFixed(2)}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Cantidad</label>
                <input type="number" min="2" max="24" value={numCuotas} onChange={e => setNumCuotas(Number(e.target.value))} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[13px] dark:bg-slate-900 dark:text-white" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Frecuencia</label>
                <select value={frecuencia} onChange={e => setFrecuencia(e.target.value as any)} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[13px] dark:bg-slate-900 dark:text-white">
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase">Inicio de pagos</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[13px] dark:bg-slate-900 dark:text-white" />
            </div>

            <button onClick={handleGenerar} disabled={loading} className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 mt-2">
              <Icon name="calendar_month" size={16} /> Generar Cuotas Equitativas
            </button>
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
