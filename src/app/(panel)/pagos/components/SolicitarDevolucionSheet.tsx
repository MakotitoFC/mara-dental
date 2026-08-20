"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { solicitarDevolucionPresupuestoAction, type PresupuestoPendiente } from "../actions";

export function SolicitarDevolucionSheet({
  presupuesto,
  onClose,
  onSuccess,
}: {
  presupuesto: PresupuestoPendiente;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  const simbolo = presupuesto.moneda === "PEN" ? "S/" : presupuesto.moneda;
  const montoDevolver = presupuesto.pagado > 0 ? presupuesto.pagado : presupuesto.total_neto;

  async function handleSolicitar() {
    if (!motivo.trim()) {
      setError("Debe ingresar el motivo detallado de la devolución.");
      return;
    }

    setEnviando(true);
    setError("");

    const res = await solicitarDevolucionPresupuestoAction(presupuesto.id, motivo);
    setEnviando(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setEnviado(true);
      if (onSuccess) onSuccess();
    }
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title={enviado ? "Solicitud enviada" : "Solicitar Devolución"}
      footer={
        enviado ? (
          <button
            onClick={onClose}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[13px] font-semibold transition-colors"
          >
            Entendido
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {error && (
              <p className="text-[11.5px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5">
                <Icon name="warning" size={13} /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={enviando}
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSolicitar}
                disabled={enviando || !motivo.trim()}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors shadow-sm"
              >
                <Icon name="send" size={15} />
                {enviando ? "Enviando…" : "Enviar Solicitud"}
              </button>
            </div>
          </div>
        )
      }
    >
      {enviado ? (
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Icon name="check_circle" size={28} />
          </div>
          <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
            Solicitud enviada al Administrador
          </p>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400 max-w-sm">
            El Administrador de la sede ha recibido la solicitud de devolución por <strong>{simbolo} {montoDevolver.toFixed(2)}</strong>. Una vez aprobada, se registrará el egreso y se anularán los comprobantes automáticamente.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-1 pb-2">
          {/* Tarjeta de Resumen del Presupuesto */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 truncate">{presupuesto.paciente_nombre}</p>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{presupuesto.tratamiento}</p>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[16px] font-bold text-rose-600 dark:text-rose-400">
                {simbolo} {montoDevolver.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mt-0.5">
                Total Pagado
              </span>
            </div>
          </div>

          {/* Advertencia informativa */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-[12px] flex items-start gap-2.5">
            <Icon name="info" size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block font-bold">Proceso de Devolución y Anulación:</strong>
              <span>
                Esta acción requiere validación del administrador. Al ser aprobada, todos los pagos y comprobantes de este presupuesto quedarán anulados, se generará el egreso correspondiente por <strong>{simbolo} {montoDevolver.toFixed(2)}</strong> y el presupuesto pasará a estado <em>rechazado</em>.
              </span>
            </div>
          </div>

          {/* Campo de Motivo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              Motivo de la devolución y anulación <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ejemplo: Paciente desiste del tratamiento por motivos personales / viaje y solicita la devolución total..."
              className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl p-3 text-[13px] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-900/40 resize-none"
            />
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}
