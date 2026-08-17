"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCatalogoAction, toggleTratamientoActivoAction, saveTratamientoAction } from "../admin.actions";

export default function CatalogoTratamientosPage() {
  const toast = useToast();
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ id: 0, nombre: "", descripcion: "", precio: 0, moneda: "PEN", activo: true });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Paginación en cliente: el catálogo completo ya se carga de una vez,
  // solo se pagina la vista sobre el array real (sin inventar datos).
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(catalogo.length / pageSize));
  const paginatedCatalogo = catalogo.slice((page - 1) * pageSize, page * pageSize);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getCatalogoAction();
      setCatalogo(data);
      setPage(1);
    } catch (err) {
      toast.error("Error al cargar el catálogo de tratamientos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleActivo(id: number, currentStatus: boolean) {
    const nextStatus = !currentStatus;
    try {
      const res = await toggleTratamientoActivoAction(id, nextStatus);
      if (res.success) {
        setCatalogo(c => c.map(t => t.id === id ? { ...t, activo: nextStatus } : t));
        toast.success(nextStatus ? "Tratamiento activado correctamente" : "Tratamiento desactivado correctamente");
      } else {
        toast.error(res.error || "Error al cambiar el estado del tratamiento");
      }
    } catch (err: any) {
      toast.error("Error al cambiar el estado del tratamiento");
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
    setIsSubmitting(true);
    const isEditing = Boolean(formData.id);
    try {
      const res = await saveTratamientoAction(formData.id ? formData : { ...formData, id: undefined });
      if (res.success) {
        setIsModalOpen(false);
        toast.success(isEditing ? "Tratamiento actualizado en el catálogo" : "Tratamiento creado exitosamente en el catálogo");
        loadData();
      } else {
        toast.error(res.error || "Error al guardar el tratamiento");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Catálogo" />
      {/* Mismo esqueleto que ConfiguracionTiposClient.tsx: <header> fijo
          (bg-white, solo border-b, sin rounded ni sombra, fuera del área
          que scrollea) + <main> scrollable debajo con el contenido en su
          propia card. */}
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          {/* En mobile solo el título — ícono y descripción se ocultan. */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-cyan-50 items-center justify-center text-cyan-600 shrink-0">
              <Icon name="medical_information" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Catálogo de Tratamientos (Presupuestos)</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Gestiona los tratamientos, precios y monedas disponibles para presupuestar.</p>
            </div>
          </div>
          <button onClick={openNew} className="shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 lg:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-[13px] md:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
            <Icon name="add" size={18} />
            <span className="hidden lg:inline">Nuevo Tratamiento</span>
          </button>
        </header>

        {/* Sin padding ni card propia: el <main> continúa el mismo fondo
            blanco del <header>, así se ven como un solo bloque (el header
            queda fijo porque main es quien scrollea, no por estar separado
            visualmente). */}
        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {!loading && catalogo.length > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
            <span className="text-[10px] md:text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, catalogo.length)}</span> de <span className="font-semibold text-slate-700">{catalogo.length}</span> registros
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              <span className="text-[12px] md:text-[13px] font-semibold text-slate-700">{page}/{totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        )}
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 640 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Tratamiento</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 w-1/3">Descripción</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-right">Precio Base</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-center">Estado</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-3 w-28" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-3 w-40" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : catalogo.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No hay tratamientos en el catálogo.</td></tr>
              ) : (
                paginatedCatalogo.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-700">{t.nombre}</td>
                    <td className="px-5 py-4 text-slate-500 text-[13px] md:text-sm">{t.descripcion || <span className="italic text-slate-300">Sin descripción</span>}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800">
                      {t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.precio).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleActivo(t.id, t.activo)}
                        className={`px-3 py-1 text-[10px] md:text-[11px] font-bold rounded-full transition-colors ${t.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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

        {/* Mobile/Tablet — tarjetas. pb extra para despejar el BottomNav
            (fixed, se dibuja encima del contenido aunque main quepa en la
            pantalla) — en md+ el nav está oculto así que ahí no hace falta. */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-48" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          ) : catalogo.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay tratamientos en el catálogo.</p>
          ) : (
            paginatedCatalogo.map(t => (
              <div key={t.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Tratamiento</span>
                    <p className="font-bold text-[13px] text-slate-700 truncate">{t.nombre}</p>
                  </div>
                  <button onClick={() => openEdit(t)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors inline-flex items-center justify-center">
                    <Icon name="edit" size={18} />
                  </button>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Descripción</span>
                  <p className="text-[13px] text-slate-500 mt-0.5">{t.descripcion || <span className="italic text-slate-300">Sin descripción</span>}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Precio Base</span>
                    <span className="font-bold text-[13px] text-slate-800">
                      {t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.precio).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Estado</span>
                    <button
                      onClick={() => toggleActivo(t.id, t.activo)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors ${t.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {t.activo ? 'ACTIVO' : 'INACTIVO'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsModalOpen(false)}
            title={editingId ? "Editar Tratamiento" : "Nuevo Tratamiento"}
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="tratamiento-form" disabled={isSubmitting} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold shadow-sm flex items-center gap-1.5 transition-colors">
                  <Icon name="save" size={16} /> {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="tratamiento-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Nombre del Tratamiento <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={formData.nombre} onChange={e => setFormData(p => ({...p, nombre: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion} onChange={e => setFormData(p => ({...p, descripcion: e.target.value}))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors resize-none h-20"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Precio Base <span className="text-red-500">*</span></label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={formData.precio} onChange={e => setFormData(p => ({...p, precio: Number(e.target.value)}))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Moneda</label>
                  <Select
                    value={formData.moneda}
                    onChange={(v) => setFormData(p => ({...p, moneda: v}))}
                    options={[
                      { value: "PEN", label: "PEN (S/)" },
                      { value: "USD", label: "USD ($)" },
                    ]}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, activo: !p.activo }))}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
              >
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  formData.activo ? "bg-cyan-600 border-cyan-600" : "border-slate-300"
                }`}>
                  {formData.activo && <Icon name="check" size={13} className="text-white" />}
                </span>
                <span className="text-[13px] text-slate-700 font-medium">Tratamiento Activo</span>
              </button>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      </div>
    </>
  );
}
