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
      workbook.creator = "Clínica Dental";
      workbook.created = new Date();

      // -----------------------------------------------------------------------
      // TAB 1: RESUMEN FINANCIERO (Estético)
      // -----------------------------------------------------------------------
      const wsResumen = workbook.addWorksheet("Resumen", { properties: { tabColor: { argb: 'FF10B981' } } });
      
      wsResumen.columns = [
        { width: 25 }, { width: 25 }, { width: 20 }, { width: 20 }
      ];

      // Título
      wsResumen.mergeCells('A1:D2');
      const titleCell = wsResumen.getCell('A1');
      titleCell.value = `Reporte Financiero: ${format(new Date(startDate), "dd/MM/yyyy")} al ${format(new Date(endDate), "dd/MM/yyyy")}`;
      titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // KPIs
      const ingresosTotal = movimientos.filter((m: any) => m.categoria?.tipo === 'I' && m.estado !== 'anulado').reduce((acc: number, curr: any) => acc + Number(curr.monto), 0);
      const egresosTotal = movimientos.filter((m: any) => m.categoria?.tipo === 'E' && m.estado !== 'anulado').reduce((acc: number, curr: any) => acc + Number(curr.monto), 0);
      const balance = ingresosTotal - egresosTotal;

      wsResumen.addRow([]);
      
      wsResumen.addRow(['Total Ingresos', 'Total Egresos', 'Balance Neto']);
      wsResumen.getRow(4).font = { bold: true, size: 12 };
      wsResumen.getRow(4).alignment = { horizontal: 'center' };
      
      const kpiRow = wsResumen.addRow([ingresosTotal, egresosTotal, balance]);
      kpiRow.font = { size: 14, bold: true };
      kpiRow.alignment = { horizontal: 'center' };
      kpiRow.getCell(1).numFmt = '"S/"#,##0.00';
      kpiRow.getCell(2).numFmt = '"S/"#,##0.00';
      kpiRow.getCell(3).numFmt = '"S/"#,##0.00';
      kpiRow.getCell(1).font = { color: { argb: 'FF10B981' } };
      kpiRow.getCell(2).font = { color: { argb: 'FFF43F5E' } };

      wsResumen.addRow([]);

      // -----------------------------------------------------------------------
      // TAB 2: RAW MOVIMIENTOS (Tabla de datos)
      // -----------------------------------------------------------------------
      const wsMovimientos = workbook.addWorksheet("Movimientos (Raw)");
      
      wsMovimientos.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Fecha', key: 'fecha', width: 20 },
        { header: 'Tipo', key: 'tipo', width: 10 },
        { header: 'Categoría', key: 'categoria', width: 30 },
        { header: 'Moneda', key: 'moneda', width: 10 },
        { header: 'Monto', key: 'monto', width: 15 },
        { header: 'Medio Pago', key: 'medio_pago', width: 20 },
        { header: 'Afecto IGV', key: 'afecto_igv', width: 15 },
        { header: 'Cuenta Contable', key: 'cuenta_contable', width: 20 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Observación', key: 'observacion', width: 40 },
        { header: 'Referencia', key: 'referencia', width: 20 },
      ];

      // Formato cabecera tabla
      wsMovimientos.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsMovimientos.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };

      movimientos.forEach((m: any) => {
        wsMovimientos.addRow({
          id: m.id,
          fecha: format(new Date(m.fecha), "yyyy-MM-dd HH:mm:ss"),
          tipo: m.categoria?.tipo === 'I' ? 'Ingreso' : 'Egreso',
          categoria: m.categoria?.nombre || '',
          moneda: m.moneda?.moneda || 'PEN',
          monto: Number(m.monto),
          medio_pago: m.medio_pago?.nombre || 'Efectivo',
          afecto_igv: m.categoria?.afecto_igv ? 'SÍ' : 'NO',
          cuenta_contable: m.categoria?.cuenta_contable || '',
          estado: m.estado,
          observacion: m.observacion || '',
          referencia: m.referencia || '',
        });
      });

      // Habilitar filtros automáticos en RAW
      wsMovimientos.autoFilter = {
        from: 'A1',
        to: `L${Math.max(2, movimientos.length + 1)}`
      };

      // -----------------------------------------------------------------------
      // TAB 3: RAW COMPROBANTES
      // -----------------------------------------------------------------------
      const wsComprobantes = workbook.addWorksheet("Comprobantes (Raw)");
      wsComprobantes.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Fecha Emisión', key: 'fecha_emision', width: 20 },
        { header: 'Tipo', key: 'tipo_comprobante', width: 20 },
        { header: 'Serie-Número', key: 'serie_numero', width: 20 },
        { header: 'Cliente / Paciente', key: 'cliente', width: 40 },
        { header: 'Moneda', key: 'moneda', width: 10 },
        { header: 'Total', key: 'monto_total', width: 15 },
        { header: 'Estado', key: 'estado', width: 15 },
      ];

      wsComprobantes.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsComprobantes.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };

      comprobantes.forEach((c: any) => {
        const clienteNom = c.cliente ? `${c.cliente.nombre} ${c.cliente.apellidos || ''}` : 
                           c.paciente ? `${c.paciente.nombre} ${c.paciente.apellido || ''}` : 'Consumidor Final';
        
        wsComprobantes.addRow({
          id: c.id,
          fecha_emision: format(new Date(c.fecha_emision), "yyyy-MM-dd HH:mm:ss"),
          tipo_comprobante: c.tipo_comprobante,
          serie_numero: `${c.serie}-${c.numero}`,
          cliente: clienteNom,
          moneda: c.moneda,
          monto_total: Number(c.monto_total),
          estado: c.estado
        });
      });

      wsComprobantes.autoFilter = {
        from: 'A1',
        to: `H${Math.max(2, comprobantes.length + 1)}`
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
