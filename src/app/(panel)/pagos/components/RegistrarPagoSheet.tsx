"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { registrarPagoAction } from "../../pacientes/[id]/consulta.actions";
import { enviarVoucherPagoAction, type PresupuestoPendiente } from "../actions";
import { buildVoucherTexto, buildVoucherHtml } from "../voucherText";
import { printHtml, downloadHtmlAsPaginatedPdf, type ClinicaInfo } from "@/lib/reportExport";

type MedioPago = { id: number; nombre: string };

export function RegistrarPagoSheet({
  presupuesto, mediosPago, sede, onClose, onSaved,
}: {
  presupuesto: PresupuestoPendiente;
  mediosPago: MedioPago[];
  sede: ClinicaInfo | null;
  onClose: () => void;
  onSaved: (presupuestoId: string, nuevoSaldo: number, montoPagado: number, medioNombre: string) => void;
}) {
  const sedeNombre = sede?.nombre_clinica ?? "MaraDental";
  const [monto, setMonto] = useState(presupuesto.saldo > 0 ? presupuesto.saldo.toFixed(2) : "");
  const [medioId, setMedioId] = useState<string>(mediosPago[0] ? String(mediosPago[0].id) : "");
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [paso, setPaso] = useState<"form" | "resultado">("form");
  const [nuevoSaldo, setNuevoSaldo] = useState(0);
  const [voucherEstado, setVoucherEstado] = useState<"enviado" | "sin_telegram" | "fallido" | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherTexto, setVoucherTexto] = useState("");
  const [enviandoVoucher, setEnviandoVoucher] = useState(false);
  const [pagoInfo, setPagoInfo] = useState<{ monto: number; medioNombre: string; referencia: string; observaciones: string; fecha: string; saldoRestante: number } | null>(null);
  const [exportando, setExportando] = useState<"print" | "pdf" | null>(null);

  async function intentarEnviarVoucher(texto: string) {
    if (!presupuesto.telegram_chat_id) {
      setVoucherEstado("sin_telegram");
      return;
    }
    setEnviandoVoucher(true);
    const res = await enviarVoucherPagoAction(presupuesto.paciente_id, presupuesto.telegram_chat_id, texto);
    setEnviandoVoucher(false);
    if (res?.error) {
      setVoucherEstado("fallido");
      setVoucherError(res.error);
    } else {
      setVoucherEstado("enviado");
    }
  }

  async function guardar() {
    const m = Number(monto);
    if (!m || m <= 0) { setError("Ingresa un monto válido"); return; }
    setSaving(true);
    setError("");

    const res = await registrarPagoAction({
      presupuesto_id: presupuesto.id,
      monto: m,
      medio_pago_id: medioId || null,
      referencia: referencia || undefined,
      observaciones: observaciones || undefined,
      paciente_id: presupuesto.paciente_id,
    });
    if (res?.error) { setSaving(false); setError(res.error); return; }
    setSaving(false);

    const saldoRestante = Math.max(0, presupuesto.saldo - m);
    const medioNombre = mediosPago.find(mp => String(mp.id) === medioId)?.nombre ?? "—";
    const fecha = new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
    setNuevoSaldo(saldoRestante);
    setPagoInfo({ monto: m, medioNombre, referencia, observaciones, fecha, saldoRestante });
    onSaved(presupuesto.id, saldoRestante, m, medioNombre);

    const texto = buildVoucherTexto({
      clinica: sedeNombre,
      pacienteNombre: presupuesto.paciente_nombre,
      monto: m,
      medioPago: medioNombre,
      fecha,
      saldoRestante,
      moneda: presupuesto.moneda,
    });
    setVoucherTexto(texto);
    setPaso("resultado");

    intentarEnviarVoucher(texto);
  }

  async function handleExportarVoucher(mode: "print" | "pdf") {
    if (!pagoInfo) return;
    setExportando(mode);
    try {
      const html = buildVoucherHtml({
        clinica: sede,
        numeroComprobante: presupuesto.id,
        pacienteNombre: presupuesto.paciente_nombre,
        monto: pagoInfo.monto,
        medioPago: pagoInfo.medioNombre,
        referencia: pagoInfo.referencia || null,
        observaciones: pagoInfo.observaciones || null,
        fecha: pagoInfo.fecha,
        saldoRestante: pagoInfo.saldoRestante,
        moneda: presupuesto.moneda,
      });
      if (mode === "print") await printHtml(html, `Comprobante de pago #${presupuesto.id}`);
      else await downloadHtmlAsPaginatedPdf(html, `comprobante_${presupuesto.id}.pdf`, 800);
    } catch (err) {
      console.error("Error exportando comprobante:", err);
    } finally {
      setExportando(null);
    }
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title={paso === "form" ? "Registrar pago" : "Pago registrado"}
      footer={
        paso === "form" ? (
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
                onClick={guardar}
                disabled={saving}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors"
              >
                <Icon name="check_circle" size={15} />
                {saving ? "Guardando…" : "Confirmar pago"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[13px] font-semibold transition-colors"
          >
            Listo
          </button>
        )
      }
    >
      {paso === "form" ? (
        <div className="flex flex-col gap-4 pt-1 pb-2">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">{presupuesto.paciente_nombre}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Saldo pendiente</p>
            </div>
            <span className="text-[15px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
              {presupuesto.moneda === "PEN" ? "S/" : presupuesto.moneda} {presupuesto.saldo.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Monto</label>
              <input
                type="number" step="0.01" min="0"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Medio de pago</label>
              <Select
                value={medioId}
                onChange={setMedioId}
                options={mediosPago.map(mp => ({ value: String(mp.id), label: mp.nombre }))}
                placeholder="Seleccionar…"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Referencia</label>
            <input
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder="Referencia (operación, voucher…)"
              className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas internas del pago…"
              className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 resize-none"
            />
          </div>

          {!presupuesto.telegram_chat_id && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              <Icon name="info" size={13} className="shrink-0" />
              Este paciente no tiene Telegram configurado — no se podrá enviar el comprobante automáticamente.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-1 pb-2">
          <div className="flex flex-col items-center text-center gap-2 py-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Icon name="check_circle" size={28} />
            </div>
            <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">Pago registrado</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {nuevoSaldo > 0.009
                ? `Saldo restante: ${presupuesto.moneda === "PEN" ? "S/" : presupuesto.moneda} ${nuevoSaldo.toFixed(2)}`
                : "Presupuesto totalmente cancelado"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-3">
            {enviandoVoucher ? (
              <p className="flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 animate-spin shrink-0" />
                Enviando comprobante por Telegram…
              </p>
            ) : voucherEstado === "enviado" ? (
              <p className="flex items-center gap-2 text-[12.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Icon name="send" size={15} /> Comprobante enviado por Telegram
              </p>
            ) : voucherEstado === "sin_telegram" ? (
              <p className="flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                <Icon name="info" size={15} /> Paciente sin Telegram configurado — comprobante no enviado
              </p>
            ) : voucherEstado === "fallido" ? (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-[12.5px] text-red-600 dark:text-red-400 font-medium">
                  <Icon name="warning" size={15} /> No se pudo enviar el comprobante{voucherError ? `: ${voucherError}` : ""}
                </p>
                <button
                  onClick={() => intentarEnviarVoucher(voucherTexto)}
                  className="self-start text-[11.5px] font-semibold text-cyan-700 dark:text-cyan-400 hover:underline"
                >
                  Reintentar envío
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExportarVoucher("print")}
              disabled={exportando !== null}
              className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <Icon name="print" size={14} /> Imprimir comprobante
            </button>
            <button
              onClick={() => handleExportarVoucher("pdf")}
              disabled={exportando !== null}
              className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <Icon name="download" size={14} /> Descargar PDF
            </button>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}
