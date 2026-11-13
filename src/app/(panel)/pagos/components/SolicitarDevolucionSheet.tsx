"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { Textarea } from "@/components/ui/TextInput";
import { useAuth } from "@/components/layout/AuthProvider";
import {
  solicitarDevolucionPresupuestoAction,
  ejecutarDevolucionPresupuestoDirectaAction,
  devolverSaldoAFavorAction,
  solicitarDevolucionSaldoAFavorAction,
  type PresupuestoPendiente,
} from "../actions";

export function SolicitarDevolucionSheet({
  presupuesto,
  onClose,
  onSuccess,
}: {
  presupuesto: PresupuestoPendiente;
  onClose: () => void;
  onSuccess?: (modo?: "saldo_favor" | "anulacion_total") => void;
}) {
  const { user } = useAuth();
  const isDirectAdmin = user?.rol === "doctor_admin" || user?.rol === "admin" || user?.rol === "superadmin";
  const tieneSaldoAFavor = (presupuesto.saldo_a_favor || 0) > 0.009;

  const [modo, setModo] = useState<"saldo_favor" | "anulacion_total">(tieneSaldoAFavor ? "saldo_favor" : "anulacion_total");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  const simbolo = presupuesto.moneda === "PEN" ? "S/" : presupuesto.moneda;
  const montoDevolver = modo === "saldo_favor"
    ? Number(presupuesto.saldo_a_favor || 0)
    : (presupuesto.pagado > 0 ? presupuesto.pagado : presupuesto.total_neto);

  async function handleSolicitar() {
    if (!motivo.trim()) {
      setError("Debe ingresar el motivo detallado de la devolución.");
      return;
    }

    setEnviando(true);
    setError("");

    let res: any;
    if (modo === "saldo_favor") {
      res = isDirectAdmin
        ? await devolverSaldoAFavorAction(presupuesto.id, motivo)
        : await solicitarDevolucionSaldoAFavorAction(presupuesto.id, motivo);
    } else {
      res = isDirectAdmin
        ? await ejecutarDevolucionPresupuestoDirectaAction(presupuesto.id, motivo)
        : await solicitarDevolucionPresupuestoAction(presupuesto.id, motivo);
    }
    setEnviando(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setEnviado(true);
      if (onSuccess) onSuccess(modo);
    }
  }

  const sheetTitle = enviado
    ? (isDirectAdmin ? "Devolución procesada" : "Solicitud enviada")
    : (modo === "saldo_favor"
      ? (isDirectAdmin ? "Devolver Saldo a Favor" : "Solicitar Devolución de Saldo a Favor")
      : (isDirectAdmin ? "Procesar Devolución" : "Solicitar Devolución"));

  return (
    <ResponsiveSheet
      onClose={onClose}
      title={sheetTitle}
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
 <p className="text-[11.5px] text-red-600 font-medium flex items-center gap-1.5">
                <Icon name="warning" size={13} /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={enviando}
 className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSolicitar}
                disabled={enviando || !motivo.trim()}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors shadow-sm"
              >
                <Icon name={isDirectAdmin ? "check" : "send"} size={15} />
                {enviando ? "Procesando…" : (isDirectAdmin ? "Procesar Devolución" : "Enviar Solicitud")}
              </button>
            </div>
          </div>
        )
      }
    >
      {enviado ? (
        <div className="flex flex-col items-center text-center gap-3 py-6">
 <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon name="check_circle" size={28} />
          </div>
          <p className="text-[15px] font-bold text-slate-900">
            {isDirectAdmin ? "Devolución procesada con éxito" : "Solicitud enviada al Administrador"}
          </p>
          <p className="text-[12.5px] text-slate-500 max-w-sm">
            {modo === "saldo_favor"
              ? (isDirectAdmin
                ? <>Se ha registrado el egreso por devolución de saldo a favor de <strong>{simbolo} {montoDevolver.toFixed(2)}</strong>. El presupuesto permanece activo y pagado.</>
                : <>El Administrador de la sede ha recibido la solicitud de devolución de saldo a favor por <strong>{simbolo} {montoDevolver.toFixed(2)}</strong>.</>)
              : (isDirectAdmin
                ? <>Se ha registrado el egreso por devolución de <strong>{simbolo} {montoDevolver.toFixed(2)}</strong> y se han anulado los comprobantes y el presupuesto automáticamente.</>
                : <>El Administrador de la sede ha recibido la solicitud de devolución por <strong>{simbolo} {montoDevolver.toFixed(2)}</strong>. Una vez aprobada, se registrará el egreso y se anularán los comprobantes automáticamente.</>)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-1 pb-2">
          {tieneSaldoAFavor && (
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setModo("saldo_favor")}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                  modo === "saldo_favor" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Solo saldo a favor ({simbolo} {presupuesto.saldo_a_favor.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => setModo("anulacion_total")}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                  modo === "anulacion_total" ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Anulación total
              </button>
            </div>
          )}

          {/* Tarjeta de Resumen del Presupuesto */}
 <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3.5">
            <div className="min-w-0">
 <p className="text-[13.5px] font-bold text-slate-900 truncate">{presupuesto.paciente_nombre}</p>
 <p className="text-[11.5px] text-slate-500 truncate mt-0.5">{presupuesto.tratamiento}</p>
            </div>
            <div className="flex flex-col items-end shrink-0">
 <span className="text-[16px] font-bold text-slate-900">
                {simbolo} {montoDevolver.toFixed(2)}
              </span>
 <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/5 text-cyan-600 border border-cyan-500/40 mt-0.5">
                {modo === "saldo_favor" ? "Saldo a favor" : "Total pagado"}
              </span>
            </div>
          </div>

          {/* Advertencia informativa */}
 <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-amber-700 text-[12px] flex items-start gap-2.5">
 <Icon name="info" size={16} className="text-amber-500 mt-0.5 shrink-0"/>
            <div>
              <strong className="block font-bold">
                {modo === "saldo_favor" ? "Devolución de Excedente por Descuento:" : "Proceso de Devolución y Anulación:"}
              </strong>
              <span>
                {modo === "saldo_favor"
                  ? <>Se registrará un egreso de caja por <strong>{simbolo} {montoDevolver.toFixed(2)}</strong> correspondiente al excedente pagado. El presupuesto y sus tratamientos seguirán vigentes como <em>pagados</em>.</>
                  : <>Esta acción requiere validación del administrador. Al ser aprobada, todos los pagos y comprobantes de este presupuesto quedarán anulados, se generará el egreso correspondiente por <strong>{simbolo} {montoDevolver.toFixed(2)}</strong> y el presupuesto pasará a estado <em>rechazado</em>.</>}
              </span>
            </div>
          </div>

          {/* Campo de Motivo */}
          <div className="flex flex-col gap-1.5">
 <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Motivo de la devolución y anulación <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={3}
              variant="red"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ejemplo: Paciente desiste del tratamiento por motivos personales / viaje y solicita la devolución total..."
              className="p-3 resize-none"
            />
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}
