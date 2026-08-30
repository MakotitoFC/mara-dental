"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { TextInput, Textarea } from "@/components/ui/TextInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useToast } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCatalogoAction, toggleTratamientoActivoAction, saveTratamientoAction } from "../admin.actions";

/** Ventana de números de página con elipsis — siempre muestra los primeros
 * 3, los últimos 3, y la página actual con sus vecinas cuando cae en medio
 * (mismo patrón "1 2 3 ... 8 9 10" de la referencia de diseño). */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total - 2, total - 1, total];
  if (current >= total - 2) return [1, 2, 3, "...", total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

/** Ventana compacta de solo 2 números para la píldora flotante de mobile
 * ("< 1 2 >") — siempre la actual + la siguiente, o las dos últimas si ya
 * estamos en la última página. */
function getMobilePageWindow(current: number, total: number): number[] {
  if (total <= 1) return [1];
  if (current >= total) return [total - 1, total];
  return [current, current + 1];
}

export default function CatalogoTratamientosPage() {
  const toast = useToast();
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ id: 0, nombre: "", descripcion: "", precio: 0, moneda: "PEN", activo: true });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tabs + búsqueda — filtran sobre el mismo array ya cargado (activo/
  // inactivo son datos reales del catálogo, no inventados).
  const [tab, setTab] = useState<"todos" | "activos" | "inactivos">("todos");
  const [search, setSearch] = useState("");
  const countActivos = catalogo.filter(t => t.activo).length;
  const countInactivos = catalogo.length - countActivos;
  const filteredCatalogo = catalogo.filter(t => {
    if (tab === "activos" && !t.activo) return false;
    if (tab === "inactivos" && t.activo) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!t.nombre?.toLowerCase().includes(q) && !t.descripcion?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Paginación en cliente: el catálogo completo ya se carga de una vez,
  // solo se pagina la vista sobre el array real (sin inventar datos).
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredCatalogo.length / pageSize));
  const paginatedCatalogo = filteredCatalogo.slice((page - 1) * pageSize, page * pageSize);

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

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

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
            <div className="min-w-0">
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Catálogo de Tratamientos (Presupuestos)</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500">Gestiona los tratamientos, precios y monedas disponibles para presupuestar.</p>
            </div>
          </div>
          <button onClick={openNew} className="shrink-0 flex items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors">
            <Icon name="add" size={16} />
            <span className="hidden lg:inline">Nuevo Tratamiento</span>
          </button>
        </header>

        {/* Tabs (Todos/Activos/Inactivos) + buscador — mismo patrón de la
            referencia de diseño, adaptado a los datos reales del catálogo
            (activo/inactivo ya existían; no se inventan campos nuevos). */}
        <div className="shrink-0 flex flex-col gap-3 px-4 sm:px-6 pt-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-5">
            {[
              { key: "todos" as const, label: "Todos", count: catalogo.length },
              { key: "activos" as const, label: "Activos", count: countActivos },
              { key: "inactivos" as const, label: "Inactivos", count: countInactivos },
            ].map(item => (
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
          <div className="pb-3">
            <div className="relative w-full sm:max-w-xs lg:max-w-md">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tratamiento..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Sin padding ni card propia: el <main> continúa el mismo fondo
            blanco del <header>, así se ven como un solo bloque (el header
            queda fijo porque main es quien scrollea, no por estar separado
            visualmente). */}
        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 640 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Tratamiento</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-right">Precio Base</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-center">Estado</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-2.5 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="px-5 py-4 text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCatalogo.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">{catalogo.length === 0 ? "No hay tratamientos en el catálogo." : "Ningún tratamiento coincide con la búsqueda."}</td></tr>
              ) : (
                paginatedCatalogo.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                          <Icon name="tooth" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-700 truncate">{t.nombre}</p>
                          <p className="text-[12px] text-slate-500 truncate">{t.descripcion || <span className="italic text-slate-300">Sin descripción</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-800 whitespace-nowrap">
                      {t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.precio).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => toggleActivo(t.id, t.activo)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] md:text-[11px] font-semibold rounded-full transition-colors ${t.activo ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {t.activo ? 'Activo' : 'Inactivo'}
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
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar bg-slate-50 p-3 flex flex-col">
          <div className="flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-48" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          ) : filteredCatalogo.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-10">{catalogo.length === 0 ? "No hay tratamientos en el catálogo." : "Ningún tratamiento coincide con la búsqueda."}</p>
          ) : (
            paginatedCatalogo.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400">#{t.id}</span>
                  <button onClick={() => openEdit(t)} className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors inline-flex items-center justify-center -mr-1.5">
                    <Icon name="edit" size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                        <Icon name="tooth" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-slate-700 truncate">{t.nombre}</p>
                        <p className="text-[12px] text-slate-500 truncate">{t.descripcion || <span className="italic text-slate-300">Sin descripción</span>}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActivo(t.id, t.activo)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors ${t.activo ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${t.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Precio Base</span>
                    <span className="text-[13px] text-slate-800">
                      {t.moneda === 'PEN' ? 'S/' : '$'} {Number(t.precio).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>

          {/* Paginación mobile — píldora flotante, centrada, pegada al fondo
              del área con scroll (sticky dentro del mismo contenedor): las
              tarjetas siguen desplazándose por debajo, visibles a través del
              blur sutil del fondo translúcido. mt-3 arriba + sticky bottom-0
              (que respeta el p-3 del contenedor) = mismo espacio a ambos
              lados de la píldora. */}
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

        {/* Paginación desktop/tablet — debajo de la tabla, sin card/borde
            propio que la envuelva, patrón "Previous / 1 2 3 ... Next". En
            mobile se oculta: ahí la paginación es la píldora flotante
            dentro de la lista de tarjetas (ver más abajo). */}
        {!loading && filteredCatalogo.length > 0 && (
          <div className="hidden sm:flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap border-t border-slate-200">
            <span className="text-[12.5px] text-slate-500 whitespace-nowrap">
              Página {page} de {totalPages}
            </span>
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
                <TextInput
                  type="text" required
                  value={formData.nombre} onChange={e => setFormData(p => ({...p, nombre: e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">Descripción</label>
                <Textarea
                  value={formData.descripcion} onChange={e => setFormData(p => ({...p, descripcion: e.target.value}))}
                  className="resize-none h-20"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Precio Base <span className="text-red-500">*</span></label>
                  <TextInput
                    type="number" step="0.01" min="0" required
                    value={formData.precio} onChange={e => setFormData(p => ({...p, precio: Number(e.target.value)}))}
                    className="font-mono"
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

              <Checkbox
                checked={formData.activo}
                onChange={() => setFormData(p => ({ ...p, activo: !p.activo }))}
                label="Tratamiento Activo"
                className="mt-2"
              />
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>

      </div>
    </>
  );
}
