"use client";

import { useEffect, useState, memo, useCallback } from "react";
import { GuardedLink } from "@/components/layout/GuardedLink";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextInput } from "@/components/ui/TextInput";
import { calcEdad, fmtFecha } from "@/lib/date-utils";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { EstadoPaciente } from "@/types/paciente";
import { getDoctorPacientesAction, getPreviewPacienteAction } from "../actions";
import { NuevoPacienteModal } from "./NuevoPacienteModal";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";

type DetallePaciente = Awaited<ReturnType<typeof getPreviewPacienteAction>>;

type PacienteListItem = {
  id: string;
  nombre: string;
  dni: string;
  fecha_nacimiento: string;
  telefono: string;
  alergias: string[];
  estado: EstadoPaciente;
  ultima_visita: string | null;
  sexo?: string;
  grupo_sanguineo?: string;
};


function isBirthdayToday(fechaNacimiento: string): boolean {
  if (!fechaNacimiento) return false;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  return hoy.getMonth() === nac.getMonth() && hoy.getDate() === nac.getDate();
}

function SkeletonCard() {
  return (
 <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
      <Skeleton className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-2.5 w-3/5" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
    </div>
  );
}

function PacientesEmptyState({ hasPatients, onNuevo }: { hasPatients: boolean; onNuevo: () => void }) {
  return (
 <div className="py-16 px-6 bg-white rounded-2xl border border-slate-200">
      <EmptyState
        icon="person_search"
        title={hasPatients ? "No se encontraron pacientes" : "Aún no tienes pacientes registrados"}
      />
      {!hasPatients && (
        <button
          onClick={onNuevo}
          className="mt-1 mx-auto flex items-center gap-1.5 px-4 py-2.5 min-h-11 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[13px] font-medium transition-colors"
        >
          <Icon name="person_add" size={16} />
          Registrar paciente
        </button>
      )}
    </div>
  );
}

export function PacientesView({ initialData }: { initialData: any[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Inicializamos directamente con initialData, eliminando el estado de carga
  const [todos, setTodos] = useState<PacienteListItem[]>(initialData || []);
  const loading = false;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showNuevoModal, setShowNuevoModal] = useState(false);

  function handlePacienteCreado(id: string) {
    setShowNuevoModal(false);
    router.push(`/pacientes/${id}`);
  }

  const handleHoverStart = useCallback((id: string) => {
    setHoveredId(id);
  }, []);

  const handleHoverEnd = useCallback((id: string) => {
    setHoveredId((prev) => (prev === id ? null : prev));
  }, []);

  const filtrados = todos.filter((p) => {
    if (query === "") return true;
    const q = query.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.dni.toLowerCase().includes(q) ||
      p.telefono.includes(query)
    );
  });

  // El panel de la derecha es fijo — siempre muestra a alguien: el paciente sobre
  // el que está el mouse, o si no hay hover, el primero de la lista filtrada.
  const activeId = hoveredId && filtrados.some((p) => p.id === hoveredId) ? hoveredId : filtrados[0]?.id ?? null;
  const active = filtrados.find((p) => p.id === activeId) ?? null;

  // Carga el detalle completo de manera instantánea ya que ahora get_doctor_pacientes_summary
  // nos devuelve todo lo que necesitamos para el panel de la derecha (sexo, grupo sanguineo, etc).
  // Ya no usamos getPreviewPacienteAction ni setTimeout.
  const detalle = active ? {
    paciente: {
      sexo: active.sexo,
      grupo_sanguineo: active.grupo_sanguineo,
      telefono: active.telefono,
      alergias: active.alergias
    }
  } : null;
  const detalleLoading = false;

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-5 p-4 sm:p-5 lg:items-start">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-[280px]">
            <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o DNI…"
              className="pl-8 pr-3"
            />
          </div>
          <button
            onClick={() => setShowNuevoModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[13px] font-medium transition-colors shrink-0"
          >
            <Icon name="add" size={15} />
            Nuevo
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filtrados.length === 0 && (
          <PacientesEmptyState hasPatients={todos.length > 0} onNuevo={() => setShowNuevoModal(true)} />
        )}

        {/* Lista — grid responsive que llena el espacio disponible */}
        {!loading && filtrados.length > 0 && (
          <motion.div
            variants={staggerContainer(0.04)}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3"
          >
            {filtrados.map((p) => (
              <PacienteCard
                key={p.id}
                paciente={p}
                active={p.id === activeId}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Panel de detalle — fijo a la derecha, solo desktop */}
      <div className="hidden lg:block w-[320px] shrink-0 sticky top-[68px]">
        <AnimatePresence mode="wait">
          {active ? (
            <PacientePreviewPanel key={active.id} paciente={active} detalle={detalle} detalleLoading={detalleLoading} />
          ) : (
 <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center gap-2.5 text-center">
 <Icon name="person" size={22} className="text-slate-300"/>
 <p className="text-[12.5px] text-slate-400">Sin pacientes que mostrar</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showNuevoModal && (
          <NuevoPacienteModal onClose={() => setShowNuevoModal(false)} onCreated={handlePacienteCreado} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

function PacienteCardBase({
  paciente: p,
  active,
  onHoverStart,
  onHoverEnd,
}: {
  paciente: PacienteListItem;
  active: boolean;
  onHoverStart: (id: string) => void;
  onHoverEnd: (id: string) => void;
}) {
  const edad = calcEdad(p.fecha_nacimiento);
  const cumpleHoy = isBirthdayToday(p.fecha_nacimiento);
  const tieneAlergias = p.alergias && p.alergias.length > 0;

  return (
    <motion.div variants={staggerItem} onMouseEnter={() => onHoverStart(p.id)} onMouseLeave={() => onHoverEnd(p.id)}>
      <GuardedLink
        href={`/pacientes/${p.id}`}
 className={`flex items-start gap-3 bg-white rounded-2xl border p-4 hover:border-cyan-300 hover:shadow-sm active:scale-[0.99] transition-all ${
 active ? "border-cyan-400 ring-1 ring-cyan-100" : "border-slate-200"
        }`}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar name={p.nombre} size="md" />
          {cumpleHoy && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center"
              title="Cumpleaños hoy"
            >
              <Icon name="cake" size={11} className="text-amber-600" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
 <p className="text-[14px] font-bold text-slate-900 truncate">{p.nombre}</p>
 <p className="text-[12px] text-slate-500 truncate">
            DNI {p.dni} · {edad} años
          </p>
 <p className="text-[12px] text-slate-400 truncate mt-0.5">
            Última consulta: {p.ultima_visita ? fmtFecha(p.ultima_visita) : "Sin consultas"}
          </p>
        </div>

        {/* Pills */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {p.estado === "nuevo" && (
 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 whitespace-nowrap">
              1 cita
            </span>
          )}
          {tieneAlergias && (
 <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-red-200 text-red-600 whitespace-nowrap">
              <Icon name="warning_amber" size={10} />
              Alergias
            </span>
          )}
        </div>
      </GuardedLink>
    </motion.div>
  );
}

// ─── Panel de detalle (fijo, desktop) ──────────────────────────────────────

function PacientePreviewPanel({
  paciente: p,
  detalle,
  detalleLoading,
}: {
  paciente: PacienteListItem;
  detalle: DetallePaciente | null;
  detalleLoading: boolean;
}) {
  const edad = calcEdad(p.fecha_nacimiento);
  const info = detalle?.paciente;
  const alergias: string[] = info?.alergias ?? p.alergias ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
 className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3"
    >
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Avatar name={p.nombre} size="md" />
        <div className="min-w-0">
 <p className="text-[14px] font-bold text-slate-900 truncate">{p.nombre}</p>
 <p className="text-[11.5px] text-slate-500 truncate">
            DNI {p.dni} · {edad} años{info?.sexo ? ` · ${info.sexo}` : ""}
          </p>
        </div>
      </div>

      {detalleLoading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="h-4 bg-slate-100 rounded animate-pulse"/>
          ))}
        </div>
      ) : (
 <div className="flex flex-col gap-1.5 text-[12px] text-slate-600 border-t border-slate-100 pt-2.5">
          <p className="flex items-center gap-1.5">
 <Icon name="phone" size={13} className="text-slate-400 shrink-0"/>
            {info?.telefono || p.telefono || "—"}
          </p>
          {info?.grupo_sanguineo && (
            <p className="flex items-center gap-1.5">
 <Icon name="bloodtype" size={13} className="text-slate-400 shrink-0"/>
              {info.grupo_sanguineo}
            </p>
          )}
          <p className="flex items-center gap-1.5">
 <Icon name="history" size={13} className="text-slate-400 shrink-0"/>
            Última consulta: {p.ultima_visita ? fmtFecha(p.ultima_visita) : "Sin consultas"}
          </p>
          {alergias.length > 0 && (
            <div className="pt-0.5">
 <p className="flex items-center gap-1 text-[10.5px] font-semibold text-red-600 uppercase tracking-wide mb-1">
                <Icon name="warning_amber" size={11} />
                Alergias
              </p>
              <div className="flex flex-wrap gap-1">
                {alergias.map((a) => (
 <span key={a} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full text-red-600 border border-red-200">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        <GuardedLink
          href={`/pacientes/${p.id}`}
          className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[12px] font-medium transition-colors"
        >
          <Icon name="contact_page" size={14} />
          Ver Ficha
        </GuardedLink>
        <GuardedLink
          href={`/agenda?paciente=${p.id}`}
 className="flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-colors"
        >
          <Icon name="calendar_today" size={14} />
          Nueva Cita
        </GuardedLink>
        <GuardedLink
          href={`/pacientes/${p.id}?tab=presupuestos`}
 className="col-span-2 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-medium transition-colors"
        >
          <Icon name="payments" size={14} />
          Presupuestos
        </GuardedLink>
      </div>
    </motion.div>
  );
}

const PacienteCard = memo(PacienteCardBase);
