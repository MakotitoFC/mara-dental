"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getAllPacientesAdminAction, getPacienteAdminDetailsAction } from "../admin.actions";

export default function AdminPacientesPage() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ sedeId: 0, activo: "true", search: "" });

  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null);
  const [pacienteDetails, setPacienteDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    async function loadPacientes() {
      setLoading(true);
      const res = await getAllPacientesAdminAction({
        sedeId: filtros.sedeId ? filtros.sedeId : undefined,
        activo: filtros.activo !== "all" ? filtros.activo : undefined,
        search: filtros.search || undefined
      });
      setPacientes(res);
      setLoading(false);
    }
    loadPacientes();
  }, [filtros]);

  useEffect(() => {
    if (!selectedPacienteId) {
      setPacienteDetails(null);
      return;
    }
    async function loadDetails() {
      setLoadingDetails(true);
      const res = await getPacienteAdminDetailsAction(selectedPacienteId!);
      setPacienteDetails(res);
      setLoadingDetails(false);
    }
    loadDetails();
  }, [selectedPacienteId]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative">
      {/* Listado principal */}
      <div className={`flex-1 flex flex-col p-6 transition-all duration-300 ${selectedPacienteId ? "pr-105" : ""}`}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Pacientes (360°)</h1>
          <p className="text-sm text-slate-500">Busca y audita todo el historial médico y financiero de los pacientes.</p>
        </div>

        <div className="flex items-center gap-3 mb-6 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-fit">
          <div className="flex items-center gap-2 px-3">
            <Icon name="search" size={16} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, DNI..." 
              className="outline-none text-sm w-64 bg-transparent"
              value={filtros.search}
              onChange={e => setFiltros(p => ({ ...p, search: e.target.value }))}
            />
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <select 
            className="outline-none text-sm font-semibold text-slate-600 bg-transparent px-2"
            value={filtros.activo}
            onChange={e => setFiltros(p => ({ ...p, activo: e.target.value }))}
          >
            <option value="all">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-600">Paciente</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">DNI</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Contacto</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Sede</th>
                  <th className="px-5 py-3 font-semibold text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Cargando...</td></tr>
                ) : pacientes.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">No se encontraron pacientes.</td></tr>
                ) : (
                  pacientes.map(p => (
                    <tr 
                      key={p.id} 
                      onClick={() => setSelectedPacienteId(p.id)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedPacienteId === p.id ? "bg-cyan-50/50" : ""}`}
                    >
                      <td className="px-5 py-3 font-medium text-slate-800">{p.nombre} {p.apellido}</td>
                      <td className="px-5 py-3 text-slate-600">{p.dni}</td>
                      <td className="px-5 py-3 text-slate-600">{p.telefono}</td>
                      <td className="px-5 py-3 text-slate-600">{p.sede?.nombre_clinica}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${p.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {p.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over Detalles 360 */}
      <div 
        className={`absolute top-0 right-0 h-full w-100 bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-transform duration-300 ${selectedPacienteId ? "translate-x-0" : "translate-x-full"}`}
      >
        {selectedPacienteId && (
          <>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Icon name="person" className="text-cyan-600" /> Perfil 360°
              </h2>
              <button onClick={() => setSelectedPacienteId(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500">
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              {loadingDetails ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-t-cyan-500 rounded-full animate-spin"/></div>
              ) : pacienteDetails ? (
                <>
                  {/* Info General */}
                  <div className="bg-white border rounded-xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Información General</h3>
                    <p className="text-lg font-bold text-slate-800 mb-1">{pacienteDetails.paciente.nombre} {pacienteDetails.paciente.apellido}</p>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">DNI</p>
                        <p className="text-sm font-medium text-slate-700">{pacienteDetails.paciente.dni}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">Sede</p>
                        <p className="text-sm font-medium text-slate-700">{pacienteDetails.paciente.sede?.nombre_clinica}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-500 font-semibold">Email</p>
                        <p className="text-sm font-medium text-slate-700">{pacienteDetails.paciente.email || "No registrado"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Finanzas */}
                  <div className="bg-white border rounded-xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Icon name="payments" size={14}/> Finanzas</h3>
                    
                    {pacienteDetails.presupuestos.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No hay presupuestos registrados.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {pacienteDetails.presupuestos.map((pres:any) => {
                          const total = Number(pres.total_bruto) - Number(pres.descuento_monto);
                          const pagado = pres.pagos?.reduce((acc:number, p:any) => p.estado === "pagado" ? acc + Number(p.monto) : acc, 0) || 0;
                          return (
                            <div key={pres.id} className="p-3 border rounded-lg bg-slate-50">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-xs font-bold text-slate-700">Presupuesto #{pres.id}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${pres.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{pres.estado.toUpperCase()}</span>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                <div>
                                  <p className="text-[10px] text-slate-500">Total / Pagado</p>
                                  <p className="text-sm font-bold text-slate-800">S/ {total.toFixed(2)} <span className="text-slate-400 text-xs font-medium">/ S/ {pagado.toFixed(2)}</span></p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Historial Clínico Resumido */}
                  <div className="bg-white border rounded-xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Icon name="history" size={14}/> Línea de Tiempo Clínica</h3>
                    <div className="flex flex-col gap-4 relative">
                      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-slate-200" />
                      {pacienteDetails.consultas.length === 0 ? (
                        <p className="text-sm text-slate-500 italic pl-6">No hay historial clínico.</p>
                      ) : pacienteDetails.consultas.map((c:any) => (
                        <div key={c.id} className="pl-8 relative">
                          <div className="absolute left-1.5 top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-[3px] border-white shadow-sm" />
                          <p className="text-xs font-bold text-slate-800">{new Date(c.fecha_consulta).toLocaleDateString("es-PE")}</p>
                          <p className="text-sm font-medium text-slate-600 mt-0.5">{c.motivo}</p>
                          {c.diagnostico?.length > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold border border-red-100">Dx: {c.diagnostico[0].diagnostico}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
