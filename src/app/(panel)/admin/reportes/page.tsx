"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getReportePagosAction, getReporteCitasAction } from "../admin.actions";
import * as XLSX from "xlsx";

export default function AdminReportesPage() {
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [loadingCitas, setLoadingCitas] = useState(false);

  async function downloadFlujoCaja() {
    setLoadingPagos(true);
    const pagos = await getReportePagosAction();
    setLoadingPagos(false);

    if (pagos.length === 0) return alert("No hay datos para exportar");

    const data = pagos.map((p: any) => ({
      "ID Pago": p.id,
      "Fecha": new Date(p.fecha_pago).toLocaleString("es-PE"),
      "Paciente": `${p.presupuesto?.pacientes?.nombre} ${p.presupuesto?.pacientes?.apellido}`,
      "Sede": p.presupuesto?.pacientes?.sede?.nombre_clinica,
      "Monto": Number(p.monto),
      "Medio de Pago": p.medio_pago?.nombre || "N/A",
      "Estado": p.estado
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flujo de Caja");
    XLSX.writeFile(wb, `Reporte_Flujo_Caja_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  async function downloadReporteCitas() {
    setLoadingCitas(true);
    const citas = await getReporteCitasAction();
    setLoadingCitas(false);

    if (citas.length === 0) return alert("No hay datos para exportar");

    const data = citas.map((c: any) => ({
      "ID Cita": c.id,
      "Fecha": c.fecha,
      "Hora Inicio": c.hora_inicio,
      "Paciente": `${c.pacientes?.nombre} ${c.pacientes?.apellido}`,
      "DNI": c.pacientes?.dni,
      "Doctor": `${c.personal?.nombre} ${c.personal?.apellido}`,
      "Servicio": c.tipo_consulta,
      "Estado": c.estado
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Citas");
    XLSX.writeFile(wb, `Reporte_Citas_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Centro de Reportes y Descargas</h1>
        <p className="text-sm text-slate-500">Genera y exporta reportes financieros, operativos y clínicos en formatos Excel y PDF.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Reportes Excel (Finanzas y Operaciones) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Icon name="analytics" size={18} className="text-emerald-600" />
            Reportes Analíticos (Excel)
          </h2>
          <div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-700">Flujo de Caja e Ingresos</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-[200px]">Historial de todos los pagos registrados con sus medios de pago y montos por sede.</p>
              </div>
              <button onClick={downloadFlujoCaja} disabled={loadingPagos} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-bold transition-colors shadow-sm disabled:opacity-50">
                <Icon name={loadingPagos ? "schedule" : "download"} size={14} /> {loadingPagos ? "Procesando..." : "XLSX"}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-700">Reporte Operativo de Citas</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-[200px]">Lista detallada de citas para medir productividad médica y tasas de inasistencia.</p>
              </div>
              <button onClick={downloadReporteCitas} disabled={loadingCitas} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 text-xs font-bold transition-colors shadow-sm disabled:opacity-50">
                <Icon name={loadingCitas ? "schedule" : "download"} size={14} /> {loadingCitas ? "Procesando..." : "XLSX"}
              </button>
            </div>

          </div>
        </div>

        {/* Reportes PDF (Documentos Clínicos) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Icon name="description" size={18} className="text-red-600" />
            Documentos Clínicos (PDF)
          </h2>
          
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl border border-red-50 bg-red-50/30 flex items-start gap-3">
              <Icon name="info" size={18} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] text-slate-600 leading-relaxed">
                  Los documentos clínicos como **Presupuestos**, **Consentimientos Informados** y la **Ficha de Historia Clínica** se generan directamente desde el perfil 360° de cada paciente.
                </p>
                <p className="text-[12px] text-slate-600 leading-relaxed mt-2">
                  Puedes buscar al paciente en el módulo correspondiente, ir a la sección de archivos/presupuestos y utilizar el botón de descarga rápida para generar el PDF con los membretes de la clínica.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
