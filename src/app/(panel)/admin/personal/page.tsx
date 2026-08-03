"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getMetricasPersonalAction } from "../admin.actions";
import { Header } from "@/components/layout/Header";

export default function PersonalPage() {
  const [personal, setPersonal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getMetricasPersonalAction();
      setPersonal(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <Header 
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Personal" }]}
      />
      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Directorio de Personal</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Administra a los empleados y visualiza su rendimiento.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-2 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Empleado</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Puesto</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Citas Atendidas</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ingresos Gen.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {personal.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold">
                              {p.nombreCompleto.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.nombreCompleto}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{p.especialidad}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {p.puesto}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                          {p.citasAtendidas}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          S/ {p.ingresosGenerados.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {personal.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                          No se encontró personal registrado en esta sede.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
