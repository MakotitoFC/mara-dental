"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { getProveedoresAction, saveProveedorAction, toggleProveedorActivoAction } from "../contador.actions";

/** Ventana de números de página con elipsis — mismo patrón que Personal
 * ("1 2 3 ... 8 9 10"). */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total - 2, total - 1, total];
  if (current >= total - 2) return [1, 2, 3, "...", total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

/** Ventana compacta de 2 números para la píldora flotante de mobile. */
function getMobilePageWindow(current: number, total: number): number[] {
  if (total <= 1) return [1];
  if (current >= total) return [total - 1, total];
  return [current, current + 1];
}

export default function ProveedoresPage() {
  const toast = useToast();
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ id: "", nombre: "", ruc: "", telefono: "", email: "", direccion: "", activo: true });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tabs Todos/Activos/Inactivos — mismo patrón que Catálogo/Personal.
  const [tab, setTab] = useState<"todos" | "activos" | "inactivos">("todos");
  const countActivos = proveedores.filter(p => p.activo).length;
  const countInactivos = proveedores.length - countActivos;
  const filteredProveedores = proveedores.filter(p => {
    if (tab === "activos" && !p.activo) return false;
    if (tab === "inactivos" && p.activo) return false;
    return true;
  });

  const [page, setPage] = useState(1);
  const pageSize = 7;
  const totalPages = Math.max(1, Math.ceil(filteredProveedores.length / pageSize));
  const paginatedData = filteredProveedores.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getProveedoresAction();
      setProveedores(data);
      setPage(1);
    } catch (err) {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleActivo(id: string, currentStatus: boolean) {
    const nextStatus = !currentStatus;
    try {
      const res = await toggleProveedorActivoAction(id, nextStatus);
      if (res.success) {
        setProveedores(c => c.map(t => t.id === id ? { ...t, activo: nextStatus } : t));
        toast.success(nextStatus ? "Proveedor activado" : "Proveedor desactivado");
      } else {
        toast.error(res.error || "Error al cambiar estado");
      }
    } catch (err: any) {
      toast.error("Error al cambiar estado");
    }
  }

  function openEdit(item: any) {
    setFormData({
      id: item.id,
      nombre: item.nombre,
      ruc: item.ruc || "",
      telefono: item.telefono || "",
      email: item.email || "",
      direccion: item.direccion || "",
      activo: item.activo
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  }

  function openNew() {
    setFormData({ id: "", nombre: "", ruc: "", telefono: "", email: "", direccion: "", activo: true });
    setEditingId(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formData.ruc && formData.ruc.length !== 11) {
      toast.error("El RUC debe tener 11 dígitos.");
      return;
    }
    setIsSubmitting(true);
    const isEditing = Boolean(formData.id);
    try {
      const res = await saveProveedorAction(formData.id ? formData : { ...formData, id: undefined });
      if (res.success) {
        setIsModalOpen(false);
        toast.success(isEditing ? "Proveedor actualizado" : "Proveedor creado");
        loadData();
      } else {
        toast.error(res.error || "Error al guardar (¿RUC duplicado?)");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header title="Proveedores" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-base font-bold text-slate-800">Proveedores</h1>
            <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Directorio de proveedores para clasificación de egresos.</p>
          </div>
          <button onClick={openNew} className="shrink-0 flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors">
            <Icon name="add" size={16} />
            <span className="hidden lg:inline">Nuevo Proveedor</span>
          </button>
        </header>

        {/* Tabs Todos/Activos/Inactivos — mismo patrón que Catálogo/Personal. */}
        <div className="shrink-0 flex items-center gap-5 px-4 sm:px-6 pt-3 bg-white border-b border-slate-100">
          {[
            { key: "todos" as const, label: "Todos", count: proveedores.length },
            { key: "activos" as const, label: "Activos", count: countActivos },
            { key: "inactivos" as const, label: "Inactivos", count: countInactivos },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 pb-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                tab === item.key ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.label}
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === item.key ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-500"}`}>{item.count}</span>
            </button>
          ))}
        </div>

        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 800 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Proveedor</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">RUC</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide">Contacto</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-center">Estado</th>
                <th className="px-6 py-4 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-3 w-40" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredProveedores.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-[13px] md:text-sm text-slate-500">No hay proveedores registrados.</td></tr>
              ) : (
                paginatedData.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                          <Icon name="store" size={18} />
                        </div>
                        <p className="font-bold text-slate-800 truncate">{t.nombre}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-mono">{t.ruc || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-[12px]">
                      {t.telefono && <div className="flex items-center gap-1"><Icon name="phone" size={13}/> {t.telefono}</div>}
                      {t.email && <div className="flex items-center gap-1 mt-0.5"><Icon name="email" size={13}/> {t.email}</div>}
                      {!t.telefono && !t.email && '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActivo(t.id, t.activo)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-semibold transition-colors ${t.activo ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {t.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors inline-flex items-center justify-center">
                        <Icon name="edit" size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación desktop/tablet — mismo patrón de Personal. */}
        {!loading && filteredProveedores.length > 0 && (
          <div className="hidden sm:flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap border-t border-slate-200">
            <span className="text-[12.5px] text-slate-500 whitespace-nowrap">Página {page} de {totalPages}</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="shrink-0 w-8 h-8 flex items-center justify-center text-[12.5px] text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`shrink-0 w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-colors ${
                      p === page ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar bg-slate-50 p-3 flex flex-col">
          <div className="flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          ) : filteredProveedores.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">No hay proveedores registrados.</p>
          ) : (
            paginatedData.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-mono text-slate-400">{t.ruc || 'Sin RUC'}</span>
                  <div className="flex items-center gap-1 -mr-1.5">
                    <button onClick={() => openEdit(t)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 flex items-center justify-center transition-colors">
                      <Icon name="edit" size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                        <Icon name="store" size={18} />
                      </div>
                      <p className="font-bold text-[13px] text-slate-800 truncate">{t.nombre}</p>
                    </div>
                    <button
                      onClick={() => toggleActivo(t.id, t.activo)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors ${t.activo ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${t.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                  {(t.telefono || t.email) && (
                    <div className="text-[12px] text-slate-500 pt-2 border-t border-slate-100 space-y-1">
                      {t.telefono && <div className="flex items-center gap-1.5"><Icon name="phone" size={14}/> {t.telefono}</div>}
                      {t.email && <div className="flex items-center gap-1.5"><Icon name="email" size={14}/> {t.email}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          </div>

          {!loading && totalPages > 1 && (
            <div className="mt-3 sticky bottom-0 self-center z-10 flex items-center gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full shadow-lg px-1.5 py-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              {getMobilePageWindow(page, totalPages).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-full text-[12px] font-semibold transition-colors ${
                    p === page ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <ResponsiveSheet
            onClose={() => setIsModalOpen(false)}
            title={editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
            footer={
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="proveedor-form" disabled={isSubmitting} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold shadow-sm flex items-center gap-1.5 transition-colors">
                  <Icon name="save" size={16} /> {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="proveedor-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Nombre / Razón Social <span className="text-red-500">*</span></label>
                <TextInput
                  type="text" required
                  value={formData.nombre} onChange={e => setFormData(p => ({...p, nombre: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">RUC</label>
                <TextInput
                  type="text" maxLength={11} pattern="\d*"
                  value={formData.ruc} onChange={e => setFormData(p => ({...p, ruc: e.target.value.replace(/\D/g, '')}))}
                  placeholder="11 dígitos"
                  className="font-mono"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Teléfono</label>
                  <TextInput
                    type="text"
                    value={formData.telefono} onChange={e => setFormData(p => ({...p, telefono: e.target.value}))}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Email</label>
                  <TextInput
                    type="email"
                    value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Dirección</label>
                <TextInput
                  type="text"
                  value={formData.direccion} onChange={e => setFormData(p => ({...p, direccion: e.target.value}))}
                />
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, activo: !p.activo }))}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    formData.activo ? "bg-cyan-600 border-cyan-600" : "border-slate-300"
                  }`}>
                    {formData.activo && <Icon name="check" size={13} className="text-white" />}
                  </span>
                  <span className="text-[13px] text-slate-700 font-medium">Proveedor Activo</span>
                </button>
              </div>
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
