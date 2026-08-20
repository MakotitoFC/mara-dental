import { esc, fmtGenerado, buildLetterheadHeader, buildLetterheadFooter, wrapDocument, type ClinicaInfo } from "@/lib/reportExport";

const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${n.toFixed(2)}`;

export interface VoucherHtmlParams {
  clinica: ClinicaInfo | null;
  numeroComprobante: string;
  tipoComprobante?: string; // boleta, factura, recibo, ticket_interno
  pacienteNombre?: string | null;
  pagadorNombre?: string | null;
  pagadorDocumento?: string | null;
  esTercero?: boolean;
  monto: number;
  moneda: string;
  medioPago: string;
  referencia?: string | null;
  observaciones?: string | null;
  fecha: string;
  saldoRestante?: number | null;
  cuota?: {
    numero_cuota: number;
    total_cuotas?: number;
    monto: number;
    fecha_vencimiento?: string;
  } | null;
  presupuesto?: {
    id: string;
    total?: number | null;
    tratamientos?: { nombre: string; precio?: number | null }[];
  } | null;
}

/** Comprobante de pago con membrete oficial de MaraDental (logo + datos de la sede,
 * detalle del paciente/pagador, desglose de presupuesto o cuota abonada y resumen financiero). */
export function buildVoucherHtml(opts: VoucherHtmlParams): string {
  const {
    clinica,
    numeroComprobante,
    tipoComprobante = "boleta",
    pacienteNombre,
    pagadorNombre,
    pagadorDocumento,
    esTercero,
    monto,
    moneda = "PEN",
    medioPago,
    referencia,
    observaciones,
    fecha,
    saldoRestante,
    cuota,
    presupuesto
  } = opts;

  const docLabelMap: Record<string, string> = {
    boleta: "Boleta de Venta",
    factura: "Factura",
    recibo: "Recibo de Egreso",
    ticket_interno: "Ticket de Pago Interno",
  };

  const labelDoc = docLabelMap[tipoComprobante] || "Comprobante de Pago";
  const docCode = `N° ${numeroComprobante.length > 8 ? numeroComprobante.slice(0, 8).toUpperCase() : numeroComprobante}`;

  const header = buildLetterheadHeader({
    clinica,
    docLabel: labelDoc,
    docCode,
    pacienteNombre: pacienteNombre || pagadorNombre,
    generado: fecha || fmtGenerado(),
  });

  const body = `
    <div style="padding:24px 28px;">
      <!-- Tarjeta Principal del Monto y Medio de Pago -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px 22px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">
            Monto Total Abonado
          </div>
          <div style="font-size:30px;font-weight:800;color:#059669;line-height:1.1;">
            ${esc(money(monto, moneda))}
          </div>
          <div style="font-size:11px;font-weight:600;color:#475569;margin-top:4px;">
            Moneda: ${esc(moneda === "PEN" ? "Soles (PEN)" : moneda === "USD" ? "Dólares (USD)" : moneda)}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">
            Medio de Pago
          </div>
          <div style="font-size:15px;font-weight:800;color:#0f172a;">
            ${esc(medioPago)}
          </div>
          ${referencia ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">Ref: ${esc(referencia)}</div>` : ""}
        </div>
      </div>

      <!-- Datos del Paciente / Pagador -->
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
          Información del Titular / Pagador
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${pacienteNombre ? `
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#64748b;width:140px;">Paciente:</td>
            <td style="padding:6px 0;font-size:12.5px;font-weight:700;color:#0f172a;">${esc(pacienteNombre)}</td>
          </tr>` : ""}
          ${esTercero && pagadorNombre ? `
          <tr style="border-top:1px solid #f1f5f9;">
            <td style="padding:6px 0;font-size:12px;color:#64748b;">Pagado por (Tercero):</td>
            <td style="padding:6px 0;font-size:12.5px;font-weight:700;color:#0f172a;">
              ${esc(pagadorNombre)} ${pagadorDocumento ? `· Doc: ${esc(pagadorDocumento)}` : ""}
            </td>
          </tr>` : ""}
          <tr style="border-top:1px solid #f1f5f9;">
            <td style="padding:6px 0;font-size:12px;color:#64748b;">Sede de Atención:</td>
            <td style="padding:6px 0;font-size:12.5px;font-weight:600;color:#334155;">
              ${esc(clinica?.nombre_clinica || "Sede MaraDental")} ${clinica?.direccion ? `(${esc(clinica.direccion)})` : ""}
            </td>
          </tr>
          <tr style="border-top:1px solid #f1f5f9;">
            <td style="padding:6px 0;font-size:12px;color:#64748b;">Fecha y Hora:</td>
            <td style="padding:6px 0;font-size:12.5px;font-weight:600;color:#334155;">${esc(fecha)}</td>
          </tr>
        </table>
      </div>

      <!-- Detalle del Pago: Cuota o Presupuesto -->
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:800;color:#0e7490;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">
          Concepto y Detalle del Presupuesto
        </div>
        
        ${cuota ? `
          <!-- Bloque de Cuota -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-size:13px;font-weight:800;color:#1e40af;">
                  Abono de Cuota N° ${esc(cuota.numero_cuota)}${cuota.total_cuotas ? ` de ${esc(cuota.total_cuotas)}` : ""}
                </span>
                ${cuota.fecha_vencimiento ? `<div style="font-size:11px;color:#3b82f6;margin-top:2px;">Fecha límite de vencimiento: ${esc(cuota.fecha_vencimiento)}</div>` : ""}
              </div>
              <div style="text-align:right;">
                <span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:800;padding:3px 8px;rounded:6px;text-transform:uppercase;">
                  Cuota Pagada
                </span>
              </div>
            </div>
          </div>
        ` : ""}

        ${presupuesto && presupuesto.tratamientos && presupuesto.tratamientos.length > 0 ? `
          <table style="width:100%;border-collapse:collapse;margin-top:8px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px 10px;font-size:11px;font-weight:700;color:#475569;text-align:left;border-radius:6px 0 0 6px;">Tratamiento / Servicio</th>
                <th style="padding:8px 10px;font-size:11px;font-weight:700;color:#475569;text-align:right;border-radius:0 6px 6px 0;">Referencia</th>
              </tr>
            </thead>
            <tbody>
              ${presupuesto.tratamientos.map((t, idx) => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:8px 10px;font-size:12px;font-weight:600;color:#1e293b;">
                    ${idx + 1}. ${esc(t.nombre)}
                  </td>
                  <td style="padding:8px 10px;font-size:12px;color:#64748b;text-align:right;">
                    ${t.precio ? esc(money(t.precio, moneda)) : "Incluido"}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : ""}

        ${observaciones ? `
          <div style="margin-top:10px;padding:8px 12px;background:#f8fafc;border-radius:8px;font-size:11.5px;color:#475569;">
            <strong>Observaciones:</strong> ${esc(observaciones)}
          </div>
        ` : ""}
      </div>

      <!-- Resumen de Saldos -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;">
        <table style="width:100%;border-collapse:collapse;">
          ${presupuesto && typeof presupuesto.total === "number" ? `
          <tr>
            <td style="padding:4px 0;font-size:12px;color:#64748b;">Total del Presupuesto:</td>
            <td style="padding:4px 0;font-size:12.5px;font-weight:700;color:#0f172a;text-align:right;">
              ${esc(money(presupuesto.total, moneda))}
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:4px 0;font-size:12px;color:#64748b;">Monto Pagado en esta Operación:</td>
            <td style="padding:4px 0;font-size:13px;font-weight:800;color:#059669;text-align:right;">
              ${esc(money(monto, moneda))}
            </td>
          </tr>
          ${typeof saldoRestante === "number" ? `
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:6px 0 0;font-size:12px;font-weight:700;color:#475569;">Saldo Pendiente Actual:</td>
            <td style="padding:6px 0 0;font-size:13px;font-weight:800;color:${saldoRestante > 0.009 ? "#d97706" : "#059669"};text-align:right;">
              ${saldoRestante > 0.009 ? esc(money(saldoRestante, moneda)) : "✓ Cancelado en su totalidad"}
            </td>
          </tr>` : ""}
        </table>
      </div>

      <!-- Mensaje de validez -->
      <div style="text-align:center;margin-top:24px;font-size:10.5px;color:#94a3b8;">
        Gracias por confiar en ${esc(clinica?.nombre_clinica || "MaraDental")}. Conserve este comprobante para cualquier consulta.
      </div>
    </div>
  `;

  return wrapDocument(`${header}${body}${buildLetterheadFooter({ clinica, pacienteNombre: pacienteNombre || pagadorNombre, docCode })}`, 680);
}

// Comprobante de pago enviado por Telegram
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
    `Hola ${pacienteNombre}, registramos tu pago con éxito:`,
    `Monto: ${fmt(monto)}`,
    `Medio de pago: ${medioPago}`,
    `Fecha: ${fecha}`,
    saldoRestante > 0.009 ? `Saldo pendiente: ${fmt(saldoRestante)}` : `Tu presupuesto quedó totalmente cancelado. ¡Muchas gracias!`,
  ].join("\n");
}
