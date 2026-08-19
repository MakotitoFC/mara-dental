"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { resolverPeticionAction } from "../../../pagos/cuotas.actions";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function ValidacionView({ initialPeticiones }: { initialPeticiones: any[] }) {
  const router = useRouter();
  const [peticiones, setPeticiones] = useState(initialPeticiones);
  const [loading, setLoading] = useState<string | null>(null);
  
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("realtime_solicitudes")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitud_validacion" }, (payload) => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    setPeticiones(initialPeticiones);
  }, [initialPeticiones]);

  const handleResolver = async (id: string, aprobado: boolean) => {
    setLoading(id);
    try {
      await resolverPeticionAction(id, aprobado);
      setPeticiones(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 md:p-6 flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Icon name="verified_user" size={20} className="text-cyan-600 dark:text-cyan-400" />
          Solicitudes Pendientes
        </h2>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
          Aprueba o rechaza acciones críticas solicitadas por el rol Asistente (ej. eliminación de cuotas).
        </p>
      </div>

      {peticiones.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
          <Icon name="task_alt" size={40} className="opacity-30 mb-3" />
          <p className="text-[14px] font-medium text-slate-600 dark:text-slate-300">No hay solicitudes pendientes</p>
          <p className="text-[12px]">Todo está al día.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {peticiones.map(p => (
            <div key={p.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    Requiere Validación
                  </span>
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mt-2">
                    {p.tipo_accion === "eliminar_cuotas" ? "Eliminación de Cuotas" : p.tipo_accion}
                  </h3>
                </div>
                <Icon name="priority_high" size={20} className="text-amber-500" />
              </div>
              <div className="text-[12.5px] text-slate-500 dark:text-slate-400 flex flex-col gap-1">
                <p><strong>Solicitante:</strong> {p.solicitante_nombre}</p>
                <p><strong>Referencia:</strong> Presupuesto #{p.referencia_id.slice(0, 8)}</p>
                <p><strong>Fecha:</strong> {new Date(p.fecha_solicitud).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleResolver(p.id, false)}
                  disabled={loading !== null}
                  className="flex-1 h-9 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[12px] font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => handleResolver(p.id, true)}
                  disabled={loading !== null}
                  className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[12px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  {loading === p.id ? <Icon name="progress_activity" size={14} className="animate-spin" /> : <Icon name="check" size={14} />}
                  Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
