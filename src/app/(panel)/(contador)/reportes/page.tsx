"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { getReporteFinancieroAction } from "../contador.actions";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function ReportesPage() {
  const toast = useToast();
  
  // Rango de fechas por defecto: Mes actual
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [isGenerating, setIsGenerating] = useState(false);

  function setRango(tipo: 'hoy' | 'semana' | 'mes') {
    const today = new Date();
    if (tipo === 'hoy') {
      setStartDate(format(today, "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (tipo === 'semana') {
      setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (tipo === 'mes') {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
    }
  }

  async function handleGenerateExcel() {
    if (!startDate || !endDate) {
      toast.error("Seleccione un rango de fechas");
      return;
    }
    
    setIsGenerating(true);
    try {
      const { movimientos, comprobantes } = await getReporteFinancieroAction(startDate, endDate);
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Clínica Dental MaraDental";
      workbook.created = new Date();

      // Cálculos Financieros
      const movsActivos = movimientos.filter((m: any) => m.estado !== "anulado");
      const movsAnulados = movimientos.filter((m: any) => m.estado === "anulado");

      let ingresosConfirmados = 0;
      let egresosOperativos = 0;
      let devolucionesTotal = 0;

      // Agrupación por medio de pago
      const porMedioPago: Record<string, { ingresos: number; egresos: number; devoluciones: number }> = {};

      movsActivos.forEach((m: any) => {
        const rawMonto = Number(m.monto);
        const montoAbs = Math.abs(rawMonto);
        const medio = m.medio_pago?.nombre || "Efectivo";

        if (!porMedioPago[medio]) {
          porMedioPago[medio] = { ingresos: 0, egresos: 0, devoluciones: 0 };
        }

        if (m.es_devolucion) {
          devolucionesTotal += montoAbs;
          porMedioPago[medio].devoluciones += montoAbs;
        } else if (m.categoria?.tipo === "I" && rawMonto > 0) {
          ingresosConfirmados += montoAbs;
          porMedioPago[medio].ingresos += montoAbs;
        } else if (m.categoria?.tipo === "E" || rawMonto < 0) {
          egresosOperativos += montoAbs;
          porMedioPago[medio].egresos += montoAbs;
        }
      });

      const balanceNeto = ingresosConfirmados - egresosOperativos - devolucionesTotal;

      // -----------------------------------------------------------------------
      // TAB 1: RESUMEN FINANCIERO (Estético y Detallado)
      // -----------------------------------------------------------------------
      const wsResumen = workbook.addWorksheet("Resumen", { properties: { tabColor: { argb: 'FF10B981' } } });
      
      wsResumen.columns = [
        { width: 28 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }
      ];

      // Título
      wsResumen.mergeCells('A1:E2');
      const titleCell = wsResumen.getCell('A1');
      titleCell.value = `Reporte Financiero: ${format(new Date(startDate), "dd/MM/yyyy")} al ${format(new Date(endDate), "dd/MM/yyyy")}`;
      titleCell.font = { size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // KPIs Principales
      wsResumen.addRow([]);
      wsResumen.addRow(['Ingresos Confirmados', 'Egresos Operativos', 'Devoluciones', 'Balance Neto', 'Movs. Anulados']);
      const headerKpi = wsResumen.getRow(4);
      headerKpi.font = { bold: true, size: 11, color: { argb: 'FF475569' } };
      headerKpi.alignment = { horizontal: 'center' };
      
      const kpiRow = wsResumen.addRow([
        ingresosConfirmados,
        egresosOperativos,
        devolucionesTotal,
        balanceNeto,
        movsAnulados.length
      ]);
      kpiRow.font = { size: 13, bold: true };
      kpiRow.alignment = { horizontal: 'center' };
      kpiRow.getCell(1).numFmt = '"S/"#,##0.00';
      kpiRow.getCell(2).numFmt = '"S/"#,##0.00';
      kpiRow.getCell(3).numFmt = '"S/"#,##0.00';
      kpiRow.getCell(4).numFmt = '"S/"#,##0.00';
      kpiRow.getCell(1).font = { color: { argb: 'FF10B981' }, bold: true };
      kpiRow.getCell(2).font = { color: { argb: 'FFF43F5E' }, bold: true };
      kpiRow.getCell(3).font = { color: { argb: 'FFF59E0B' }, bold: true };
      kpiRow.getCell(4).font = { color: balanceNeto >= 0 ? { argb: 'FF0F172A' } : { argb: 'FFF43F5E' }, bold: true };

      wsResumen.addRow([]);

      // Sección: Desglose por Medio de Pago
      wsResumen.addRow(['DESGLOSE POR MEDIO DE PAGO']);
      const secMedioRow = wsResumen.getRow(7);
      secMedioRow.font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };

      wsResumen.addRow(['Medio de Pago', 'Ingresos (S/)', 'Egresos Op. (S/)', 'Devoluciones (S/)', 'Saldo Neto (S/)']);
      const headerMedio = wsResumen.getRow(8);
      headerMedio.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerMedio.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

      Object.entries(porMedioPago).forEach(([medio, valores]) => {
        const net = valores.ingresos - valores.egresos - valores.devoluciones;
        const r = wsResumen.addRow([medio, valores.ingresos, valores.egresos, valores.devoluciones, net]);
        r.getCell(2).numFmt = '"S/"#,##0.00';
        r.getCell(3).numFmt = '"S/"#,##0.00';
        r.getCell(4).numFmt = '"S/"#,##0.00';
        r.getCell(5).numFmt = '"S/"#,##0.00';
        r.getCell(5).font = { bold: true };
      });

      wsResumen.addRow([]);

      // Sección: Resumen de Comprobantes
      const compsActivos = comprobantes.filter((c: any) => c.estado !== "anulado");
      const compsAnulados = comprobantes.filter((c: any) => c.estado === "anulado");
      const totalCompsActivos = compsActivos.reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
      const totalCompsAnulados = compsAnulados.reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);

      wsResumen.addRow(['RESUMEN DE COMPROBANTES DE PAGO']);
      const secCompRow = wsResumen.getRow(wsResumen.rowCount);
      secCompRow.font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };

      wsResumen.addRow(['Estado Comprobante', 'Cantidad Emitida', 'Monto Total Facturado (S/)']);
      const headerCompRes = wsResumen.getRow(wsResumen.rowCount);
      headerCompRes.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerCompRes.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

      const rowAct = wsResumen.addRow(['Comprobantes Emitidos (Válidos)', compsActivos.length, totalCompsActivos]);
      rowAct.getCell(3).numFmt = '"S/"#,##0.00';
      rowAct.getCell(3).font = { bold: true, color: { argb: 'FF10B981' } };

      const rowAnu = wsResumen.addRow(['Comprobantes Anulados', compsAnulados.length, totalCompsAnulados]);
      rowAnu.getCell(3).numFmt = '"S/"#,##0.00';
      rowAnu.getCell(3).font = { bold: true, color: { argb: 'FFF43F5E' } };

      // -----------------------------------------------------------------------
      // TAB 2: DETALLE DE MOVIMIENTOS (Raw)
      // -----------------------------------------------------------------------
      const wsMovimientos = workbook.addWorksheet("Movimientos");
      
      wsMovimientos.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Fecha', key: 'fecha', width: 20 },
        { header: 'Sede', key: 'sede', width: 20 },
        { header: 'Tipo', key: 'tipo', width: 14 },
        { header: 'Categoría', key: 'categoria', width: 26 },
        { header: 'Detalle / Paciente', key: 'detalle', width: 36 },
        { header: 'Medio Pago', key: 'medio_pago', width: 18 },
        { header: 'Moneda', key: 'moneda', width: 10 },
        { header: 'Monto', key: 'monto', width: 14 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Motivo Anulación', key: 'motivo_anulacion', width: 30 },
        { header: 'Referencia', key: 'referencia', width: 18 },
      ];

      wsMovimientos.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsMovimientos.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

      movimientos.forEach((m: any) => {
        const isAnulado = m.estado === "anulado";
        const tipoLabel = m.es_devolucion
          ? "Devolución"
          : (m.categoria?.tipo === "I" ? "Ingreso" : "Egreso");

        const detalleTexto = m.paciente_nombre
          ? `${m.paciente_nombre} - ${m.observacion || ""}`
          : (m.observacion || "");

        const row = wsMovimientos.addRow({
          id: m.id,
          fecha: format(new Date(m.fecha), "dd/MM/yyyy HH:mm:ss"),
          sede: m.sede_nombre,
          tipo: tipoLabel,
          categoria: m.categoria?.nombre || (m.es_devolucion ? "Devolución" : "General"),
          detalle: detalleTexto,
          medio_pago: m.medio_pago?.nombre || "Efectivo",
          moneda: m.moneda?.moneda || "PEN",
          monto: Number(m.monto),
          estado: isAnulado ? "ANULADO" : "CONFIRMADO",
          motivo_anulacion: m.motivo_anulacion || "",
          referencia: m.referencia || "",
        });

        row.getCell(9).numFmt = '"S/"#,##0.00';
        if (isAnulado) {
          row.font = { color: { argb: 'FF94A3B8' }, strike: true };
        } else if (m.es_devolucion) {
          row.getCell(4).font = { color: { argb: 'FFF59E0B' }, bold: true };
        }
      });

      wsMovimientos.autoFilter = {
        from: 'A1',
        to: `L${Math.max(2, movimientos.length + 1)}`
      };

      // -----------------------------------------------------------------------
      // TAB 3: DETALLE DE COMPROBANTES (Raw)
      // -----------------------------------------------------------------------
      const wsComprobantes = workbook.addWorksheet("Comprobantes");
      wsComprobantes.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Fecha Emisión', key: 'fecha_emision', width: 20 },
        { header: 'Tipo', key: 'tipo_comprobante', width: 16 },
        { header: 'Serie-Número', key: 'serie_numero', width: 18 },
        { header: 'Receptor (Pagador)', key: 'receptor', width: 32 },
        { header: 'Tipo Receptor', key: 'tipo_receptor', width: 16 },
        { header: 'Doc. Identidad', key: 'doc', width: 18 },
        { header: 'Moneda', key: 'moneda', width: 10 },
        { header: 'Monto Total', key: 'monto_total', width: 15 },
        { header: 'Estado Comprobante', key: 'estado', width: 20 },
        { header: 'Motivo Anulación', key: 'motivo_anulacion', width: 30 },
        { header: 'Estado Movimiento Caja', key: 'movimiento_estado', width: 24 },
      ];

      wsComprobantes.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsComprobantes.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

      comprobantes.forEach((c: any) => {
        const isAnulado = c.estado === "anulado";
        const row = wsComprobantes.addRow({
          id: c.id,
          fecha_emision: format(new Date(c.fecha_emision), "dd/MM/yyyy HH:mm:ss"),
          tipo_comprobante: c.tipo_comprobante.toUpperCase(),
          serie_numero: `${c.serie}-${c.numero}`,
          receptor: c.receptor_nombre,
          tipo_receptor: c.receptor_tipo,
          doc: c.receptor_doc,
          moneda: c.moneda,
          monto_total: Number(c.monto_total),
          estado: isAnulado ? "ANULADO" : "EMITIDO",
          motivo_anulacion: c.motivo_anulacion || "",
          movimiento_estado: c.movimiento_estado?.toUpperCase() || "SIN MOVIMIENTO",
        });

        row.getCell(9).numFmt = '"S/"#,##0.00';
        if (isAnulado) {
          row.font = { color: { argb: 'FF94A3B8' }, strike: true };
        }
      });

      wsComprobantes.autoFilter = {
        from: 'A1',
        to: `L${Math.max(2, comprobantes.length + 1)}`
      };

      // -----------------------------------------------------------------------
      // Descargar Archivo
      // -----------------------------------------------------------------------
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `Reporte_Financiero_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
      
      toast.success("Reporte Excel generado exitosamente");
    } catch (err) {
      toast.error("Error al generar el reporte");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <>
      <Header title="Generador de Reportes" />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
          
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Exportar Reportes Financieros</h1>
            <p className="text-[13px] md:text-sm text-slate-500">Genera reportes en Excel con hojas de datos crudos (RAW) y vistas estéticas.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h2 className="text-[15px] font-bold text-slate-800">Rango de Fechas</h2>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button onClick={() => setRango('hoy')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[12px] font-semibold transition-colors">Hoy</button>
                <button onClick={() => setRango('semana')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[12px] font-semibold transition-colors">Última Semana</button>
                <button onClick={() => setRango('mes')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[12px] font-semibold transition-colors">Mes Actual</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1">Fecha Inicio</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-slate-800 focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1">Fecha Fin</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-slate-800 focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
              <h2 className="text-[15px] font-bold text-slate-800">Formatos Disponibles</h2>
              
              <div className="p-4 border-2 border-cyan-100 bg-cyan-50/50 rounded-2xl flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 border border-cyan-100 text-cyan-600 shadow-sm">
                  <Icon name="description" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-[14px]">Reporte Financiero Consolidado</h3>
                  <p className="text-[13px] text-slate-600 mt-1">Archivo Excel (.xlsx) que incluye un tablero estético resumen y múltiples pestañas RAW (Movimientos y Comprobantes) con filtros pre-configurados.</p>
                  <button 
                    onClick={handleGenerateExcel}
                    disabled={isGenerating}
                    className="mt-4 w-full sm:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[14px] font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {isGenerating ? (
                      <>Generando... <Icon name="hourglass_empty" size={18} className="animate-spin" /></>
                    ) : (
                      <>Descargar Excel <Icon name="download" size={18} /></>
                    )}
                  </button>
                </div>
              </div>
              
            </div>
          </div>
          
        </div>
      </main>
    </>
  );
}
