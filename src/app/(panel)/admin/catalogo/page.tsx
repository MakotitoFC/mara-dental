"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getCatalogoAction, toggleTratamientoActivoAction, saveTratamientoAction } from "../admin.actions";

export default function CatalogoTratamientosPage() {
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ id: 0, nombre: "", descripcion: "", precio: 0, moneda: "PEN", activo: true });
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    const data = await getCatalogoAction();
    setCatalogo(data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleActivo(id: number, currentStatus: boolean) {
    const res = await toggleTratamientoActivoAction(id, !currentStatus);
    if (res.success) {
      setCatalogo(c => c.map(t => t.id === id ? { ...t, activo: !currentStatus } : t));
    } else {
      alert("Error al actualizar: " + res.error);
    }
  }

  function openEdit(item: any) {
    setFormData({ 
      id: item.id, 
      nombre: item.nombre, 
      descripcion: item.descripcion || "", 
      precio: item.precio, 
      moneda: item.moneda || "PEN", 
      activo: item.activo 
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  }

  function openNew() {
    setFormData({ id: 0, nombre: "", descripcion: "", precio: 0, moneda: "PEN", activo: true });
    setEditingId(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await saveTratamientoAction(formData.id ? formData : { ...formData, id: undefined });
    if (res.success) {
      setIsModalOpen(false);
      loadData();
    } else {
      alert("Error al guardar: " + res.error);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto w-full flex flex-col gap-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Tratamientos (Presupuestos)</h1>
          <p className="text-sm text-slate-500">Gestiona los tratamientos, precios y monedas disponibles para presupuestar.</p>
        </div>
        <button onClick={openNew} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors">
          <Icon name="add" size={18} /> Nuevo Tratamiento
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 font-semibold text-slate-500">Tratamiento</th>
                <th className="px-5 py-3 font-semibold text-slate-500 w-1/3">Descripción</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-right">Precio Base</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-center">Estado</th>
                <th className="px-5 py-3 font-semibold text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Cargando catálogo...</td></tr>
              ) : catalogo.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No hay tratamientos en el catálogo.</td></tr>
              ) : (
                catalogo.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-700">{t.nombre}</td>
                    <td className="px-5 py-4 text-slate-500 text-[13px]">{t.descripcion || <span className="italic text-slate-300">Sin descripción</span>}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800">
                      {t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.precio).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => toggleActivo(t.id, t.activo)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${t.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {t.activo ? 'ACTIVO' : 'INACTIVO'}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors inline-flex items-center justify-center">
                        <Icon name="edit" size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? "Editar Tratamiento" : "Nuevo Tratamiento"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <Icon name="close" size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Tratamiento <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={formData.nombre} onChange={e => setFormData(p => ({...p, nombre: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                <textarea 
                  value={formData.descripcion} onChange={e => setFormData(p => ({...p, descripcion: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-500 transition-colors resize-none h-20"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Precio Base <span className="text-red-500">*</span></label>
                  <input 
                    type="number" step="0.01" min="0" required
                    value={formData.precio} onChange={e => setFormData(p => ({...p, precio: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Moneda</label>
                  <select 
                    value={formData.moneda} onChange={e => setFormData(p => ({...p, moneda: e.target.value}))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-cyan-500 transition-colors font-bold"
                  >
                    <option value="PEN">PEN (S/)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
                <Icon name="save" size={16} /> Guardar
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
