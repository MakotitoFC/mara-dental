"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { FilterTag } from "@/components/ui/FilterTag";
import { SmartPopover } from "@/components/ui/SmartPopover";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { TextInput } from "@/components/ui/TextInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { createEmpleadoAction, editEmpleadoAction, softDeleteEmpleadoAction, toggleEmpleadoEstadoAction } from "./personal.actions";
import { AnimatePresence, motion } from "framer-motion";

type TagKey = "sede" | "rol" | "especialidad" | "puesto";

const TAG_META: Record<TagKey, { label: string; icon: string }> = {
  sede: { label: "Sede", icon: "location_on" },
  rol: { label: "Rol", icon: "badge" },
  especialidad: { label: "Especialidad", icon: "medical_information" },
  puesto: { label: "Puesto", icon: "work" },
};

const PARAM_KEY: Record<TagKey, string> = {
  sede: "sedeId",
  rol: "rolId",
  especialidad: "especialidadId",
  puesto: "puestoId",
};

/** Paso 1 (mismo patrón que Calendario/Dashboard Directivo): lista simple de
    categorías, SIN sus opciones internas — elegir una solo agrega/quita la
    categoría de `activeKeys` (aparece/desaparece su tag). Las opciones reales
    viven en el dropdown propio de cada tag (ver TagOptionsDropdown), no acá.
    variant "icon": botón maestro (junto al buscador). variant "chip": "+
    Filtro" al final de la fila de tags. */
function FilterCategoryPicker({
  variant, availableKeys, activeKeys, onToggle,
}: {
  variant: "icon" | "chip";
  availableKeys: TagKey[];
  activeKeys: Set<TagKey>;
  onToggle: (k: TagKey) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SmartPopover
      open={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) =>
        variant === "icon" ? (
          <button
            ref={ref}
            onClick={() => setOpen((o) => !o)}
            title="Filtros"
            aria-label="Filtros"
            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
              open || activeKeys.size > 0 ? "bg-cyan-50 text-cyan-600" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Icon name="filter_lines" size={18} />
          </button>
        ) : (
          <button
            ref={ref}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium bg-cyan-500/5 text-cyan-600 border border-cyan-500/40 hover:bg-cyan-500/10 transition-colors shrink-0"
          >
            <Icon name="add" size={14} className="shrink-0" />
            Filtro
          </button>
        )
      }
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg py-1.5"
      >
        {availableKeys.map((k) => {
          const active = activeKeys.has(k);
          return (
            <button
              key={k}
              onMouseDown={() => { onToggle(k); setOpen(false); }}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${active ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
            >
              <Icon name={TAG_META[k].icon} size={15} className={active ? "text-cyan-600" : "text-slate-400"} />
              <span className="flex-1">{TAG_META[k].label}</span>
              {active && <Icon name="check" size={14} className="text-cyan-600" />}
            </button>
          );
        })}
      </motion.div>
    </SmartPopover>
  );
}

/** Paso 2: tag de filtro activo con dropdown propio — clic en el tag (o su
    chevron) abre la lista de opciones de esa categoría directamente (mismo
    patrón que TipoFiltroSelector/EstadoFiltroSelector del Calendario: el
    propio SmartPopover ES la lista, sin un <Select> anidado adentro), así
    elegir una opción cierra el dropdown al toque (`setOpen(false)` en el
    mismo componente, no depende de un click afuera). Su "X" (aparte del
    chevron) elimina el filtro del todo. */
function TagOptionsDropdown({
  icon, label, value, onChange, options, onRemove,
}: {
  icon: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SmartPopover
      open={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) => (
        <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon={icon} label={label} />
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="min-w-[200px] max-h-72 overflow-y-auto no-scrollbar bg-white border border-slate-200 rounded-lg shadow-lg py-1"
      >
        {options.map((o) => (
          <button
            key={o.value}
            onMouseDown={() => { onChange(o.value); setOpen(false); }}
            className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] hover:bg-slate-50 ${o.value === value ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
          >
            {o.label}
          </button>
        ))}
      </motion.div>
    </SmartPopover>
  );
}

/** Ventana de números de página con elipsis — mismo patrón que Catálogo de
 * Tratamientos ("1 2 3 ... 8 9 10"). */
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

export default function PersonalClient({
  initialData,
  initialCount,
  totalPages,
  currentPage,
  countActivos,
  countInactivos,
  especialidades,
  puestos,
  sedes,
  roles,
  userRole,
  userSedeId,
}: {
  initialData: any[];
  initialCount: number;
  totalPages: number;
  currentPage: number;
  countActivos: number;
  countInactivos: number;
  especialidades: any[];
  puestos: any[];
  sedes: any[];
  roles: any[];
  userRole: string;
  userSedeId: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRol, setSelectedRol] = useState("1");
  const [isActivo, setIsActivo] = useState(true);
  const [selectedSede, setSelectedSede] = useState("");
  const [selectedPuesto, setSelectedPuesto] = useState("");
  const [selectedEspecialidad, setSelectedEspecialidad] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  // Filtros
  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  // Tabs Todos/Activos/Inactivos — mismo patrón que Catálogo de
  // Tratamientos, pero filtrando server-side (el estado también decide la
  // paginación real, no solo lo que se ve en la página actual).
  const estadoTab = (searchParams.get("estado") as "activos" | "inactivos" | null) || "todos";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilter("search", searchQuery);
  };

  // Tags de "filtros activos": solo aparecen cuando el usuario los agrega a
  // mano desde el picker de 2 pasos (botón maestro o "+ Filtro" → elige
  // categoría → aparece el tag) — mismo patrón que Calendario/Dashboard
  // Directivo, no un select suelto siempre visible.
  const [activeTags, setActiveTags] = useState<Set<TagKey>>(new Set());
  const availableTagKeys: TagKey[] = [
    ...(userRole === "superadmin" ? (["sede"] as TagKey[]) : []),
    "rol", "especialidad", "puesto",
  ];
  const toggleTag = (key: TagKey) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const removeTag = (key: TagKey) => {
    setActiveTags((prev) => { const next = new Set(prev); next.delete(key); return next; });
    handleFilter(PARAM_KEY[key], "");
  };

  const tagOptions = (key: TagKey): { value: string; label: string }[] => {
    if (key === "sede") return [{ value: "", label: "Todas" }, ...sedes.map((s) => ({ value: String(s.id), label: s.nombre_clinica }))];
    if (key === "rol") return [{ value: "", label: "Todos" }, ...roles.map((r) => ({ value: String(r.id), label: r.rol }))];
    if (key === "especialidad") return [{ value: "", label: "Todas" }, ...especialidades.map((e) => ({ value: String(e.id), label: e.especialidad }))];
    return [{ value: "", label: "Todos" }, ...puestos.map((p) => ({ value: String(p.id), label: p.puesto }))];
  };

  const tagLabel = (key: TagKey): string => {
    const v = searchParams.get(PARAM_KEY[key]) || "";
    const opt = tagOptions(key).find((o) => o.value === v);
    return `${TAG_META[key].label}: ${opt?.label ?? "Todos"}`;
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const openModal = (personal: any = null) => {
    setEditingPersonal(personal);
    setSelectedRol(personal ? personal.usuarios?.rol_id?.toString() : "1");
    setIsActivo(personal ? Boolean(personal.usuarios?.activo) : true);
    setSelectedSede("");
    setSelectedPuesto(personal?.puesto?.id ? String(personal.puesto.id) : "");
    setSelectedEspecialidad(personal?.especialidad?.id ? String(personal.especialidad.id) : "");
    setFechaNacimiento(personal?.fecha_nacimiento || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingPersonal(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // sede_id/puesto_id eran <select required> nativos — al pasar a nuestro
    // componente Select (no participa en FormData/validación HTML5 por sí
    // solo) esa validación había que reponerla a mano.
    if (!editingPersonal && userRole === "superadmin" && !selectedSede) {
      toast.error("Selecciona una sede de asignación");
      return;
    }
    if (!selectedPuesto) {
      toast.error("Selecciona un puesto");
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (editingPersonal) {
        await editEmpleadoAction(editingPersonal.usuario_id, formData);
        toast.success("Personal actualizado correctamente");
      } else {
        await createEmpleadoAction(formData);
        toast.success("Personal creado con éxito");
      }
      closeModal();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEstado = async (usuarioId: string, currentActivo: boolean) => {
    const nuevoEstado = !currentActivo;
    const accionText = nuevoEstado ? "activar" : "desactivar";
    const ok = await confirm({
      title: `${nuevoEstado ? "Activar" : "Desactivar"} empleado`,
      message: `¿Estás seguro de ${accionText} a este empleado?${nuevoEstado ? " Podrá volver a ingresar al sistema." : " Su sesión se cerrará de inmediato si está activa."}`,
      confirmLabel: nuevoEstado ? "Activar" : "Desactivar",
    });
    if (!ok) return;

    try {
      await toggleEmpleadoEstadoAction(usuarioId, nuevoEstado);
      toast.success(`Empleado ${nuevoEstado ? "activado" : "desactivado"} correctamente`);
      router.refresh();
    } catch (err: any) {
      toast.error(`Error al ${accionText} el empleado`);
    }
  };

  const handleDelete = async (usuarioId: string) => {
    const ok = await confirm({
      title: "Eliminar personal",
      message: "¿Estás seguro que deseas eliminar a este empleado? Esta acción no eliminará su historial, solo lo desactivará.",
      requireText: "ELIMINAR",
      confirmLabel: "Desactivar empleado",
    });
    if (!ok) return;

    try {
      await softDeleteEmpleadoAction(usuarioId);
      toast.success("Empleado desactivado correctamente");
      router.refresh();
    } catch (err: any) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
      {/* Mismo esqueleto que ConfiguracionTiposClient.tsx: <header> fijo
          (bg-white, solo border-b, sin rounded ni sombra) con título,
          botón y filtros — nada de esto scrollea. La tabla vive en su
          propia card dentro de <main>, que sí scrollea. */}
      <header className="shrink-0 flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* En mobile solo el título — ícono y descripción se ocultan. */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[15px] md:text-base font-bold text-slate-800">Personal</h1>
              <p className="hidden sm:block text-[13px] md:text-sm text-slate-500 mt-1">Administra el personal de la sede</p>
            </div>
          </div>
          {/* Solo tablet/desktop (sm+): en mobile este botón baja a la fila
              del buscador, junto al filtro (ver más abajo), para no competir
              por ancho con el título. */}
          <button
            onClick={() => openModal()}
            className="hidden sm:flex shrink-0 items-center justify-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[12.5px] font-semibold transition-colors"
          >
            <Icon name="add" size={16} />
            <span className="hidden lg:inline">Nuevo Personal</span>
          </button>
        </div>

        {/* Búsqueda + botón maestro de filtro (mismo patrón que
            Calendario/Dashboard Directivo): un solo ícono reemplaza los 4
            selects sueltos que había antes.
            Ancho del buscador por breakpoint: mobile flex-1 sin tope (dos
            botones fijos al lado ya lo acotan); tablet con un max-width
            legible sin acaparar todo el ancho; desktop más ancho para que
            el placeholder completo entre, ocupando el espacio libre antes
            de los botones. */}
        <div className="flex flex-col gap-3">
          {/* Tabs Todos/Activos/Inactivos — mismo patrón que Catálogo de
              Tratamientos, filtrando server-side vía el param `estado`
              (afecta también la paginación real, no solo la vista actual). */}
          <div className="flex items-center gap-5">
            {[
              { key: "todos" as const, label: "Todos", count: countActivos + countInactivos },
              { key: "activos" as const, label: "Activos", count: countActivos },
              { key: "inactivos" as const, label: "Inactivos", count: countInactivos },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleFilter("estado", item.key === "todos" ? "" : item.key)}
                className={`flex items-center gap-1.5 pb-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                  estadoTab === item.key ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {item.label}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${estadoTab === item.key ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-500"}`}>{item.count}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex-1 min-w-0 sm:max-w-xs lg:max-w-md relative">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <TextInput
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o apellido..."
                className="pl-9 pr-3"
              />
              <button type="submit" className="hidden" />
            </form>

            {/* Solo mobile: "+ Nuevo Personal" baja acá, a la derecha, junto
                al filtro — en sm+ ya está arriba, en la fila del título. */}
            <button
              onClick={() => openModal()}
              aria-label="Nuevo Personal"
              title="Nuevo Personal"
              className="sm:hidden shrink-0 w-9 h-9 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg shadow-sm transition-colors"
            >
              <Icon name="add" size={18} />
            </button>

            {/* Paso 1 — lista simple de categorías, sin sus opciones internas. */}
            <FilterCategoryPicker variant="icon" availableKeys={availableTagKeys} activeKeys={activeTags} onToggle={toggleTag} />
          </div>

          {/* Paso 2 — tags interactivos (aparecen solo si el usuario los
              agregó desde el picker de arriba); "+ Filtro" al final reabre
              el mismo picker. Sin "Limpiar todo": cada X quita su propio
              filtro. Si no hay ninguno, la fila entera no se renderiza. */}
          {activeTags.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {availableTagKeys.filter((k) => activeTags.has(k)).map((k) => (
                <TagOptionsDropdown
                  key={k}
                  icon={TAG_META[k].icon}
                  label={tagLabel(k)}
                  value={searchParams.get(PARAM_KEY[k]) || ""}
                  onChange={(v) => handleFilter(PARAM_KEY[k], v)}
                  options={tagOptions(k)}
                  onRemove={() => removeTag(k)}
                />
              ))}
              <FilterCategoryPicker variant="chip" availableKeys={availableTagKeys} activeKeys={activeTags} onToggle={toggleTag} />
            </div>
          )}
        </div>
      </header>

      {/* Sin padding ni card propia: el <main> continúa el mismo fondo
          blanco del <header>, así se ven como un solo bloque. */}
      <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-auto no-scrollbar">
          <table className="w-full text-left text-[13px] md:text-sm" style={{ minWidth: 720 }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Empleado</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Rol / Puesto</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Colegiatura</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500">Ingreso</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-center">Estado</th>
                <th className="px-5 py-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialData.map((p) => (
                <tr key={p.usuario_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                        <Icon name="person" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 truncate">{p.nombre} {p.apellido}</p>
                        <p className="text-[12px] text-slate-500 truncate">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-[11px] font-medium bg-blue-50 text-blue-600 uppercase">
                        {p.usuarios?.rol?.rol || "Usuario"}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-medium bg-cyan-50 text-cyan-600">
                        {p.puesto?.puesto || "Sin puesto"}
                      </span>
                    </div>
                    {p.especialidad && (
                      <div className="text-[10px] md:text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <Icon name="medical_services" size={12} /> {p.especialidad.especialidad}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {p.num_colegiatura || "-"}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-[10px] md:text-[11px]">
                    {new Date(p.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] md:text-[11px] font-semibold rounded-full ${
                      p.usuarios?.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.usuarios?.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {p.usuarios?.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleEstado(p.usuario_id, Boolean(p.usuarios?.activo))}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                          p.usuarios?.activo
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                        title={p.usuarios?.activo ? "Desactivar empleado" : "Activar empleado"}
                      >
                        <Icon name={p.usuarios?.activo ? "block" : "check_circle"} size={16} />
                      </button>
                      <button
                        onClick={() => openModal(p)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                        title="Editar"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.usuario_id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {initialData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[13px] md:text-sm text-slate-500">
                    No se encontró personal con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet — tarjetas. pb extra para despejar el BottomNav
            (fixed, se dibuja encima del contenido aunque main quepa en la
            pantalla) — en md+ el nav está oculto así que ahí no hace falta. */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto no-scrollbar bg-slate-50 p-3 flex flex-col">
          <div className="flex flex-col gap-3">
            {initialData.length === 0 ? (
              <p className="text-center text-[13px] text-slate-400 py-10">No se encontró personal con los filtros seleccionados</p>
            ) : (
              initialData.map((p) => (
                <div key={p.usuario_id} className="bg-white rounded-xl border border-slate-200 flex flex-col">
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400">#{p.usuario_id.slice(0, 8)}</span>
                    <div className="flex items-center gap-1 shrink-0 -mr-1.5">
                      <button
                        onClick={() => handleToggleEstado(p.usuario_id, Boolean(p.usuarios?.activo))}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                          p.usuarios?.activo
                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                            : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                        title={p.usuarios?.activo ? "Desactivar empleado" : "Activar empleado"}
                      >
                        <Icon name={p.usuarios?.activo ? "block" : "check_circle"} size={16} />
                      </button>
                      <button
                        onClick={() => openModal(p)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                        title="Editar"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.usuario_id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                          <Icon name="person" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] text-slate-700 truncate">{p.nombre} {p.apellido}</p>
                          <p className="text-[12px] text-slate-500 truncate">{p.email}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full ${
                        p.usuarios?.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.usuarios?.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {p.usuarios?.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 uppercase">
                        {p.usuarios?.rol?.rol || "Usuario"}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-cyan-50 text-cyan-600">
                        {p.puesto?.puesto || "Sin puesto"}
                      </span>
                      {p.especialidad && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                          <Icon name="medical_services" size={12} /> {p.especialidad.especialidad}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                      <span>{p.telefono || "Sin teléfono"}{p.num_colegiatura ? ` · Col. ${p.num_colegiatura}` : ""}</span>
                      <span>
                        {new Date(p.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
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
          {totalPages > 1 && (
            <div className="mt-3 sticky bottom-0 self-center z-10 flex items-center gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-full shadow-lg px-1.5 py-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
              </button>
              {getMobilePageWindow(currentPage, totalPages).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-7 h-7 rounded-full text-[12px] font-semibold transition-colors ${
                    p === currentPage ? "bg-cyan-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Paginación desktop/tablet — debajo de la tabla, sin card/borde
            propio que la envuelva, patrón "Anterior / 1 2 3 ... / Siguiente".
            En mobile se oculta: ahí la paginación es la píldora flotante
            dentro de la lista de tarjetas (ver más arriba). */}
        {initialCount > 0 && (
          <div className="hidden sm:flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap border-t border-slate-200">
            <span className="text-[12.5px] text-slate-500 whitespace-nowrap">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={16} />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              {getPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="shrink-0 w-8 h-8 flex items-center justify-center text-[12.5px] text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`shrink-0 w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-colors ${
                      p === currentPage ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="shrink-0 flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal Añadir/Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <ResponsiveSheet
            onClose={closeModal}
            title={editingPersonal ? "Editar Empleado" : "Nuevo Empleado"}
            size="md"
            footer={
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-[13px] font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" form="personal-form" disabled={isSubmitting} className="px-6 py-2 bg-cyan-600 text-white text-[13px] font-semibold rounded-xl hover:bg-cyan-700 disabled:opacity-50 transition-colors">
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            }
          >
            <form id="personal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Los 4 pares grid-cols-2 de este form estaban sin guard —
                      en mobile cada input quedaba a ~150-160px. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Nombre</label>
                      <TextInput name="nombre" defaultValue={editingPersonal?.nombre} required className="h-9 sm:h-10" />
                    </div>
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Apellido</label>
                      <TextInput name="apellido" defaultValue={editingPersonal?.apellido} required className="h-9 sm:h-10" />
                    </div>
                  </div>

                  {!editingPersonal && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Email</label>
                        <TextInput name="email" type="email" required className="h-9 sm:h-10" />
                      </div>
                      <div>
                        <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                        <TextInput name="password" type="password" required className="h-9 sm:h-10" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                      <TextInput name="telefono" defaultValue={editingPersonal?.telefono} className="h-9 sm:h-10" />
                    </div>
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Fecha Nacimiento</label>
                      <input type="hidden" name="fecha_nacimiento" value={fechaNacimiento} />
                      <DatePicker value={fechaNacimiento} onChange={setFechaNacimiento} />
                    </div>
                  </div>

                  {!editingPersonal && userRole === "superadmin" && (
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Sede de Asignación</label>
                      <input type="hidden" name="sede_id" value={selectedSede} />
                      <Select
                        value={selectedSede}
                        onChange={setSelectedSede}
                        placeholder="Seleccione una sede..."
                        options={sedes.map((s) => ({ value: String(s.id), label: s.nombre_clinica }))}
                      />
                    </div>
                  )}

                  {!editingPersonal && (
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Rol de Acceso en Sistema</label>
                      <input type="hidden" name="rol_id" value={selectedRol} />
                      <Select
                        value={selectedRol}
                        onChange={setSelectedRol}
                        options={[
                          { value: "1", label: "Doctor" },
                          { value: "4", label: "Asistente" },
                          ...(userRole === "superadmin" ? [{ value: "2", label: "Administrador" }] : []),
                        ]}
                      />
                    </div>
                  )}

                  {editingPersonal && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold text-slate-700">Estado del Empleado</label>
                      <input type="hidden" name="activo" value={isActivo ? "true" : "false"} />
                      <Checkbox
                        checked={isActivo}
                        onChange={() => setIsActivo(v => !v)}
                        label={
                          <span className={`font-medium ${isActivo ? "text-cyan-600" : "text-amber-600"}`}>
                            {isActivo ? "Activo en el sistema" : "Inactivo / Desactivado"}
                          </span>
                        }
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Puesto</label>
                      <input type="hidden" name="puesto_id" value={selectedPuesto} />
                      <Select
                        value={selectedPuesto}
                        onChange={setSelectedPuesto}
                        placeholder="Seleccione..."
                        options={puestos.map((p) => ({ value: String(p.id), label: p.puesto }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">Especialidad (Opcional)</label>
                      <input type="hidden" name="especialidad_id" value={selectedEspecialidad} />
                      <Select
                        value={selectedEspecialidad}
                        onChange={setSelectedEspecialidad}
                        placeholder="Ninguna"
                        options={especialidades.map((e) => ({ value: String(e.id), label: e.especialidad }))}
                      />
                    </div>
                  </div>

                  {selectedRol === "1" && (
                    <div>
                      <label className="block text-[13px] md:text-sm font-medium text-slate-700 mb-1">N° Colegiatura (Opcional)</label>
                      <TextInput name="num_colegiatura" defaultValue={editingPersonal?.num_colegiatura} className="h-9 sm:h-10" />
                    </div>
                  )}
            </form>
          </ResponsiveSheet>
        )}
      </AnimatePresence>
    </div>
  );
}
