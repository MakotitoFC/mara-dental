"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getAuditoriaLogsAction, getMetricasPersonalAction, getComunicacionesAction } from "../admin.actions";

export default function AdminAuditoriaPage() {
  const [activeTab, setActiveTab] = useState<"logs" | "personal" | "comms">("logs");
  
  const [logs, setLogs] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any[]>([]);
  const [comms, setComms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [dataLogs, dataPersonal, dataComms] = await Promise.all([
        getAuditoriaLogsAction(),
        getMetricasPersonalAction(),
        getComunicacionesAction()
      ]);
      setLogs(dataLogs);
      setPersonal(dataPersonal);
      setComms(dataComms);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto w-full flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Auditoría y Control Operacional</h1>
        <p className="text-sm text-slate-500">Monitorea la actividad del sistema, el rendimiento del personal y las comunicaciones automatizadas.</p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200">
        <TabButton 
          active={activeTab === "logs"} 
          onClick={() => setActiveTab("logs")} 
          icon="admin_panel_settings" 
          label="Logs de Seguridad" 
        />
        <TabButton 
          active={activeTab === "personal"} 
          onClick={() => setActiveTab("personal")} 
          icon="medical_services" 
          label="Rendimiento Médico" 
        />
        <TabButton 
          active={activeTab === "comms"} 
          onClick={() => setActiveTab("comms")} 
          icon="chat" 
          label="Comunicaciones" 
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-[400px]">
        {loading ? (
           <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-20">
             <div className="w-8 h-8 border-2 border-t-cyan-500 rounded-full animate-spin" />
             <p className="text-sm">Cargando datos de auditoría...</p>
           </div>
        ) : (
          <>
            {/* TABS CONTENT */}
            {activeTab === "logs" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-slate-500">Fecha y Hora</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">Acción</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">Tabla Afectada</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">Usuario (UUID)</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">No hay registros de auditoría aún.</td></tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-slate-600 font-medium">
                            {new Date(log.fecha).toLocaleString("es-PE")}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                              log.accion === 'delete' ? 'bg-red-100 text-red-700' :
                              log.accion === 'update' ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {log.accion}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600 font-mono text-xs">{log.tabla_afectada}</td>
                          <td className="px-5 py-3 text-slate-500 font-mono text-[11px] truncate max-w-[120px]" title={log.usuario_id}>
                            {log.usuario_id}
                          </td>
                          <td className="px-5 py-3 text-slate-500 font-mono text-xs">{log.ip_address || "Local"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "personal" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-slate-500">Profesional</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">Rol / Especialidad</th>
                      <th className="px-5 py-3 font-semibold text-slate-500 text-center">Citas Atendidas</th>
                      <th className="px-5 py-3 font-semibold text-slate-500 text-center">Pptos Cerrados</th>
                      <th className="px-5 py-3 font-semibold text-slate-500 text-right">Ingresos Generados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {personal.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">No hay personal registrado.</td></tr>
                    ) : (
                      personal.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-700 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">
                              {p.nombreCompleto.charAt(0)}
                            </div>
                            {p.nombreCompleto}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <span className="block font-medium">{p.puesto}</span>
                            <span className="block text-xs text-slate-400">{p.especialidad}</span>
                          </td>
                          <td className="px-5 py-4 text-center font-semibold text-slate-700">{p.citasAtendidas}</td>
                          <td className="px-5 py-4 text-center font-semibold text-slate-700">{p.presupuestosCerrados}</td>
                          <td className="px-5 py-4 text-right font-bold text-emerald-600">
                            S/ {p.ingresosGenerados.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "comms" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-slate-500">Fecha Envío</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">Paciente</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">Tipo</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">Chat ID / Canal</th>
                      <th className="px-5 py-3 font-semibold text-slate-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comms.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-400">No hay mensajes enviados.</td></tr>
                    ) : (
                      comms.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-slate-600 font-medium">
                            {new Date(c.fecha_envio).toLocaleString("es-PE")}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-700">
                            {c.pacientes ? `${c.pacientes.nombre} ${c.pacientes.apellido}` : "Desconocido"}
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md capitalize">
                              {c.tipo_mensaje}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 font-mono text-xs">{c.chat_id}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${
                              c.estado_envio === 'fallido' ? 'bg-red-100 text-red-700' :
                              c.estado_envio === 'pendiente' ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {c.estado_envio || "ENVIADO"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
        active 
          ? "border-cyan-600 text-cyan-700" 
          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
      }`}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  );
}
