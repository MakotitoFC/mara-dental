import { esc, fmtGenerado, buildLetterheadHeader, buildLetterheadFooter, wrapDocument, type ClinicaInfo } from "@/lib/reportExport";

const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${n.toFixed(2)}`;

/** Comprobante de pago con el mismo rótulo/letterhead que ya usa el presupuesto
 * (logo + datos de la sede) — para imprimir/descargar, análogo a buildPresupuestoHtml
 * en PresupuestoPhase.tsx pero para un pago individual. */
export function buildVoucherHtml(opts: {
  clinica: ClinicaInfo | null;
  numeroComprobante: string;
  pacienteNombre: string;
  monto: number;
  medioPago: string;
  referencia?: string | null;
  observaciones?: string | null;
  fecha: string;
  saldoRestante: number;
  moneda: string;
}): string {
  const { clinica, numeroComprobante, pacienteNombre, monto, medioPago, referencia, observaciones, fecha, saldoRestante, moneda } = opts;

  const docCode = `Comprobante #${numeroComprobante}`;
  const header = buildLetterheadHeader({
    clinica,
    docLabel: "Comprobante de Pago",
    docCode,
    pacienteNombre,
    generado: fmtGenerado(),
  });

  const body = `
    <div style="padding:24px;">
      <div style="text-align:center;padding:20px 0;border:1px dashed #cbd5e1;border-radius:12px;margin-bottom:18px;">
        <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Monto pagado</div>
        <div style="font-size:32px;font-weight:800;color:#059669;margin-top:4px;">${esc(money(monto, moneda))}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 4px;font-size:11.5px;color:#94a3b8;">Paciente</td>
          <td style="padding:8px 4px;font-size:12.5px;font-weight:600;color:#1e293b;text-align:right;">${esc(pacienteNombre)}</td>
        </tr>
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 4px;font-size:11.5px;color:#94a3b8;">Fecha</td>
          <td style="padding:8px 4px;font-size:12.5px;font-weight:600;color:#1e293b;text-align:right;">${esc(fecha)}</td>
        </tr>
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 4px;font-size:11.5px;color:#94a3b8;">Medio de pago</td>
          <td style="padding:8px 4px;font-size:12.5px;font-weight:600;color:#1e293b;text-align:right;">${esc(medioPago)}</td>
        </tr>
        ${referencia ? `
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 4px;font-size:11.5px;color:#94a3b8;">Referencia</td>
          <td style="padding:8px 4px;font-size:12.5px;font-weight:600;color:#1e293b;text-align:right;">${esc(referencia)}</td>
        </tr>` : ""}
        ${observaciones ? `
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 4px;font-size:11.5px;color:#94a3b8;">Observaciones</td>
          <td style="padding:8px 4px;font-size:12.5px;font-weight:600;color:#1e293b;text-align:right;">${esc(observaciones)}</td>
        </tr>` : ""}
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:8px 4px;font-size:11.5px;color:#94a3b8;">Saldo restante</td>
          <td style="padding:8px 4px;font-size:12.5px;font-weight:800;color:${saldoRestante > 0.009 ? "#d97706" : "#059669"};text-align:right;">
            ${saldoRestante > 0.009 ? esc(money(saldoRestante, moneda)) : "Cancelado en su totalidad"}
          </td>
        </tr>
      </table>
    </div>
  `;

  return wrapDocument(`${header}${body}${buildLetterheadFooter({ clinica, pacienteNombre, docCode })}`, 640);
}

// Comprobante de pago enviado por Telegram — texto plano simple, sin
// generación de imagen/PDF (no existe nada parecido en el resto de la app).
export function buildVoucherTexto(params: {
  clinica: string;
  pacienteNombre: string;
  monto: number;
  medioPago: string;
  fecha: string;
  saldoRestante: number;
  moneda: string;
}): string {
  const { clinica, pacienteNombre, monto, medioPago, fecha, saldoRestante, moneda } = params;
  const fmt = (n: number) => `${moneda === "PEN" ? "S/" : moneda} ${n.toFixed(2)}`;
  return [
    `🧾 ${clinica}`,
    ``,
    `Hola ${pacienteNombre}, registramos tu pago:`,
    `Monto: ${fmt(monto)}`,
    `Medio de pago: ${medioPago}`,
    `Fecha: ${fecha}`,
    saldoRestante > 0.009 ? `Saldo pendiente: ${fmt(saldoRestante)}` : `Tu presupuesto quedó totalmente cancelado. ¡Gracias!`,
  ].join("\n");
}
