"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PresupuestoSkeleton } from "@/components/ui/ConsultaSkeletons";
import { PresupuestoPhase } from "../consulta/PresupuestoPhase";
import { getPresupuestoActivoAction, getPresupuestosPacienteAction, getMediosPagoAction } from "../../consulta.actions";

function PresupuestosAnteriores({ items, pacienteId, paciente, mediosPago, onSaved }: {
  items: any[]; pacienteId: string; paciente: any; mediosPago: { id: number; nombre: string }[]; onSaved: () => void;
}) {
  if (items.length <= 1) return null;
  const anteriores = items.slice(1);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
          <Icon name="history" size={18} />
        </div>
        <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Presupuestos anteriores</h2>
      </div>
      <div className="flex flex-col gap-4">
        {anteriores.map((p) => (
          <PresupuestoPhase
            key={p.id}
            consultaId={"0"}
            pacienteId={String(pacienteId)}
            paciente={paciente}
            presupuesto={p}
            mediosPago={mediosPago}
            onSaved={onSaved}
          />
        ))}
      </div>
    </div>
  );
}

export function PresupuestoTab({ paciente, consultaId, data, loading, refetch }: {
  paciente: any;
  consultaId?: string | null;
  data: any;
  loading: boolean;
  refetch: () => void;
}) {
  const pacienteId = Number(paciente.id);

  // Sin consulta activa: el presupuesto del paciente sigue siendo consultable/gestionable
  // (no está scoped por consulta en BD), así que este tab hace su propio fetch en ese caso.
  const [own, setOwn] = useState<{ presupuesto: any; mediosPago: any[] } | null>(null);
  const [ownLoading, setOwnLoading] = useState(!consultaId);
  const [historial, setHistorial] = useState<any[]>([]);

  const fetchOwn = useCallback(async () => {
    setOwnLoading(true);
    const [presupuesto, mediosPago] = await Promise.all([
      getPresupuestoActivoAction(String(pacienteId)),
      getMediosPagoAction(),
    ]);
    setOwn({ presupuesto, mediosPago });
    setOwnLoading(false);
  }, [pacienteId]);

  const fetchHistorial = useCallback(async () => {
    setHistorial(await getPresupuestosPacienteAction(String(pacienteId)));
  }, [pacienteId]);

  useEffect(() => {
    if (!consultaId) fetchOwn();
    fetchHistorial();
  }, [consultaId, fetchOwn, fetchHistorial]);

  const isLoading = consultaId ? loading || !data : ownLoading;

  if (isLoading) return <PresupuestoSkeleton />;

  const presupuesto = consultaId ? data.presupuesto : own?.presupuesto ?? null;
  const mediosPago = consultaId ? (data.mediosPago ?? []) : (own?.mediosPago ?? []);
  const onSaved = consultaId ? refetch : fetchOwn;

  if (!presupuesto && !consultaId) {
    return (
      <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
        <Icon name="info" size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Este paciente no tiene presupuesto registrado. Inicia una consulta desde Timeline para generar uno.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PresupuestoPhase
        consultaId={consultaId ?? "0"}
        pacienteId={String(pacienteId)}
        paciente={paciente}
        presupuesto={presupuesto}
        mediosPago={mediosPago}
        onSaved={onSaved}
      />
      <PresupuestosAnteriores items={historial} pacienteId={String(pacienteId)} paciente={paciente} mediosPago={mediosPago} onSaved={() => { onSaved(); fetchHistorial(); }} />
    </div>
  );
}
