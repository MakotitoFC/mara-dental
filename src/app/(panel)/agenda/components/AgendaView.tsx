"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { getCitasRealesAction, getCitasSedeAction, getPatientByIdAction } from "../actions";
import { CalendarToolbar, type TipoFiltro, type EstadoFiltro, type DoctorFiltro } from "./CalendarToolbar";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { YearView } from "./YearView";
import { CronogramaView } from "./CronogramaView";
import { MultiDoctorDayView, type DoctorLite } from "./MultiDoctorDayView";
import { MultiDoctorWeekTimeGrid } from "./MultiDoctorWeekTimeGrid";
import { YearHeatmapView } from "./YearHeatmapView";
import { DayAppointmentsSheet } from "./DayAppointmentsSheet";
import { AppointmentDetailSheet } from "./AppointmentDetailSheet";
import { CitaFormSheet, type CitaFormState, type PatientLite } from "./CitaFormSheet";
import { scaleIn } from "@/lib/animations";
// import { getDoctorVars, type DoctorMap } from "./doctorColors";

type DoctorMap = Record<string, { nombre: string; initials: string; vars: { solid: string; bg: string; text: string } }>;
const getDoctorVars = (_id: string) => ({ solid: "#0ea5e9", bg: "#dbeafe", text: "#075985" });
import {
  type CalView,
  addDays, getMonday, toDateStr, MONTHS_L, initials,
} from "./agendaUtils";

function AgendaViewInner({ initialCitas, preTratamientoId, prePacienteId, role, doctores }: { initialCitas: Cita[], preTratamientoId?: string, prePacienteId?: string; role: string; doctores: DoctorLite[] }) {
  const isAsistente = role === "asistente";

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const today = todayDate;

  const searchParams = useSearchParams();
  const preselectedPacienteId = prePacienteId || searchParams?.get("paciente") || null;

  // El asistente aterriza en Día por defecto: es la única vista con una
  // columna por médico, así ve la distinción entre médicos de inmediato en
  // vez de la cuadrícula de Mes (donde las citas solo llevan un punto de color).
  const [view, setView] = useState<CalView>((searchParams?.get("view") as CalView) || (isAsistente ? "day" : "month"));
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [weekStart, setWeekStart] = useState(getMonday(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");
  const [doctorFiltro, setDoctorFiltro] = useState<DoctorFiltro>("todos");
  const [especialidadFiltro, setEspecialidadFiltro] = useState("todas");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");
  const [soloConCitasHoy, setSoloConCitasHoy] = useState(false);

  const [citas, setCitas] = useState<Cita[]>(initialCitas || []);
  const [loadingCitas, setLoadingCitas] = useState(false);

  const doctorMap: DoctorMap = useMemo(() => {
    const map: DoctorMap = {};
    for (const doc of doctores) {
      const nombreCompleto = `${doc.nombre} ${doc.apellido}`.trim();
      map[doc.id] = { nombre: `Dr. ${doc.apellido}`, initials: initials(nombreCompleto), vars: getDoctorVars(doc.id) };
    }
    return map;
  }, [doctores]);

  const citasFiltradas = useMemo(() => {
    let result = tipoFiltro === "todos" ? citas : citas.filter(c => c.tipo_consulta_id === tipoFiltro);
    if (isAsistente) {
      if (estadoFiltro !== "todos") result = result.filter(c => c.estado === estadoFiltro);
      if (doctorFiltro !== "todos") result = result.filter(c => doctorFiltro.includes(c.doctor_id));
    }
    return result;
  }, [citas, tipoFiltro, estadoFiltro, doctorFiltro, isAsistente]);

  // Doctores visibles en la columna del día — se acotan por especialidad,
  // selección del filtro de médicos, y opcionalmente solo los que tienen
  // alguna cita ese día (evita columnas vacías cuando hay muchos médicos).
  const doctoresFiltrados = useMemo(() => {
    let result = doctores;
    if (especialidadFiltro !== "todas") result = result.filter(d => d.especialidad === especialidadFiltro);
    if (doctorFiltro !== "todos") result = result.filter(d => doctorFiltro.includes(d.id));
    // "Solo con citas hoy" solo tiene sentido (y solo es visible en el toolbar) en la vista Día.
    if (soloConCitasHoy && view === "day") {
      const ds = toDateStr(selectedDate);
      const idsConCitas = new Set(citasFiltradas.filter(c => c.fecha === ds).map(c => c.doctor_id));
      result = result.filter(d => idsConCitas.has(d.id));
    }
    return result;
  }, [doctores, especialidadFiltro, doctorFiltro, soloConCitasHoy, view, selectedDate, citasFiltradas]);

  const [daySheetDate, setDaySheetDate] = useState<Date | null>(null);
  const [detailCita, setDetailCita] = useState<Cita | null>(null);
  const [formState, setFormState] = useState<CitaFormState | null>(null);

  const loadCitas = async () => {
    setLoadingCitas(true);
    const data = isAsistente ? await getCitasSedeAction() : await getCitasRealesAction();
    setCitas(data);
    setLoadingCitas(false);
  };
  // Se elimina el useEffect que cargaba citas inicialmente porque ya vienen en initialCitas

  // ?paciente=id — viene desde la ficha del paciente, abre el formulario de creación precargado
  useEffect(() => {
    if (!preselectedPacienteId) return;
    getPatientByIdAction(preselectedPacienteId).then(p => {
      if (p) {
        setFormState({ mode: "create", date: toDateStr(today), preloadedPatient: p as PatientLite, preTratamientoId });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedPacienteId]);

  const citasForDate = (d: Date) =>
    citasFiltradas.filter(c => c.fecha === toDateStr(d)).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ── Navegación ──────────────────────────────────────────────────────────
  function prevPeriod() {
    if (view === "day") setSelectedDate(p => addDays(p, -1));
    else if (view === "week") setWeekStart(p => addDays(p, -7));
    else if (view === "year") setCalMonth(p => ({ ...p, year: p.year - 1 }));
    else setCalMonth(p => (p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 }));
  }
  function nextPeriod() {
    if (view === "day") setSelectedDate(p => addDays(p, 1));
    else if (view === "week") setWeekStart(p => addDays(p, 7));
    else if (view === "year") setCalMonth(p => ({ ...p, year: p.year + 1 }));
    else setCalMonth(p => (p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 }));
  }
  function goToMonthFromYear(month: number) {
    setCalMonth(p => ({ ...p, month }));
    setView("month");
  }
  function goToday() {
    setSelectedDate(today);
    setCalMonth({ year: today.getFullYear(), month: today.getMonth() });
    setWeekStart(getMonday(today));
  }
  function goToDay(d: Date) {
    setSelectedDate(d);
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setWeekStart(getMonday(d));
    setView("day");
  }
  // Mueve la semana visible sin cambiar de vista — usado por el mini-calendario
  // del panel lateral de la grilla de tiempo semanal.
  function jumpToWeek(d: Date) {
    setWeekStart(getMonday(d));
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  const label = (() => {
    if (view === "day") {
      const raw = selectedDate.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    if (view === "week") {
      const a = weekDays[0], b = weekDays[6];
      const sameMonth = a.getMonth() === b.getMonth();
      const mA = MONTHS_L[a.getMonth()].slice(0, 3).toLowerCase();
      const mB = MONTHS_L[b.getMonth()].slice(0, 3).toLowerCase();
      return sameMonth
        ? `${a.getDate()} – ${b.getDate()} ${mA} ${b.getFullYear()}`
        : `${a.getDate()} ${mA} – ${b.getDate()} ${mB} ${b.getFullYear()}`;
    }
    if (view === "year") return String(calMonth.year);
    if (view === "cronograma") return "Cronograma de citas";
    return `${MONTHS_L[calMonth.month]} de ${calMonth.year}`;
  })();

  const viewKey = view === "month" ? `month-${calMonth.year}-${calMonth.month}`
    : view === "week" ? `week-${toDateStr(weekStart)}`
    : view === "year" ? `year-${calMonth.year}`
    : view === "cronograma" ? "cronograma"
    : `day-${toDateStr(selectedDate)}`;

  // ── Handlers de paneles ─────────────────────────────────────────────────
  function openDaySheet(d: Date) { setDaySheetDate(d); }
  function openDetail(c: Cita) { setDaySheetDate(null); setDetailCita(c); }
  function openCreate(date: Date, hour?: string, doctorId?: string) {
    setDaySheetDate(null);
    setDetailCita(null);
    const doctorNombre = doctorId ? doctorMap[doctorId]?.nombre.replace(/^Dr\.\s*/, "") : undefined;
    // Sin un médico ya determinado por el contexto (ej. columna del día), el
    // asistente debe elegirlo dentro del formulario — se le pasa la lista.
    const doctoresParaElegir = isAsistente && !doctorId ? doctores : undefined;
    setFormState({ mode: "create", date: toDateStr(date), hour, doctorId, doctorNombre, doctores: doctoresParaElegir });
  }
  function openEdit(c: Cita) {
    setDetailCita(null);
    setFormState({ mode: "edit", cita: c });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900/50">
      <CalendarToolbar
        view={view}
        onViewChange={setView}
        label={label}
        onPrev={prevPeriod}
        onNext={nextPeriod}
        onToday={goToday}
        onNewCita={() => openCreate(view === "day" ? selectedDate : today)}
        tipoFiltro={tipoFiltro}
        onTipoFiltroChange={setTipoFiltro}
        role={role}
        doctores={doctores}
        doctorFiltro={doctorFiltro}
        onDoctorFiltroChange={setDoctorFiltro}
        especialidadFiltro={especialidadFiltro}
        onEspecialidadFiltroChange={setEspecialidadFiltro}
        estadoFiltro={estadoFiltro}
        onEstadoFiltroChange={setEstadoFiltro}
        soloConCitasHoy={soloConCitasHoy}
        onSoloConCitasHoyChange={setSoloConCitasHoy}
      />

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {loadingCitas && (
          <div className="absolute inset-0 z-20 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700" />
              <div className="absolute inset-0 rounded-full border-[3px] border-t-cyan-500 animate-spin" />
            </div>
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cargando citas…</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="h-full"
          >
            {view === "month" && (
              <MonthView
                year={calMonth.year}
                month={calMonth.month}
                citas={citasFiltradas}
                today={today}
                onDayClick={openDaySheet}
                onEventClick={openDetail}
                doctorMap={doctorMap}
              />
            )}
            {view === "week" && isAsistente && (
              <MultiDoctorWeekTimeGrid
                weekDays={weekDays}
                citas={citasFiltradas}
                doctoresTodos={doctores}
                doctoresVisibles={doctoresFiltrados}
                today={today}
                doctorFiltro={doctorFiltro}
                onDoctorFiltroChange={setDoctorFiltro}
                onEventClick={openDetail}
                onCellClick={(d, hr) => openCreate(d, hr)}
                onDayClick={goToDay}
                onDateJump={jumpToWeek}
              />
            )}
            {view === "week" && !isAsistente && (
              <WeekView
                weekDays={weekDays}
                citas={citasFiltradas}
                today={today}
                onDayClick={goToDay}
                onEventClick={openDetail}
                onCellClick={(d, hr) => openCreate(d, hr)}
                doctorMap={doctorMap}
              />
            )}
            {view === "day" && isAsistente && (
              <MultiDoctorDayView
                date={selectedDate}
                citas={citasFiltradas}
                doctores={doctoresFiltrados}
                today={today}
                onEventClick={openDetail}
                onCellClick={(doctorId, d, hr) => openCreate(d, hr, doctorId)}
              />
            )}
            {view === "day" && !isAsistente && (
              <DayView
                date={selectedDate}
                citas={citasFiltradas}
                today={today}
                onEventClick={openDetail}
                onCellClick={(d, hr) => openCreate(d, hr)}
              />
            )}
            {view === "year" && isAsistente && (
              <YearHeatmapView
                year={calMonth.year}
                citas={citasFiltradas}
                today={today}
                onMonthClick={goToMonthFromYear}
                onDayClick={goToDay}
              />
            )}
            {view === "year" && !isAsistente && (
              <YearView
                year={calMonth.year}
                citas={citasFiltradas}
                today={today}
                onMonthClick={goToMonthFromYear}
                onDayClick={goToDay}
              />
            )}
            {view === "cronograma" && (
              <CronogramaView
                citas={citasFiltradas}
                today={today}
                onEventClick={openDetail}
                doctorMap={doctorMap}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Paneles */}
      <AnimatePresence>
        {daySheetDate && (
          <DayAppointmentsSheet
            key="day-sheet"
            date={daySheetDate}
            citas={citasForDate(daySheetDate)}
            onClose={() => setDaySheetDate(null)}
            onSelectCita={openDetail}
            onNewCita={() => openCreate(daySheetDate)}
            doctorMap={doctorMap}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailCita && (
          <AppointmentDetailSheet
            key="detail-sheet"
            cita={detailCita}
            onClose={() => setDetailCita(null)}
            onEdit={openEdit}
            onChanged={() => { loadCitas(); setDetailCita(null); }}
            role={role}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formState && (
          <CitaFormSheet
            key="form-sheet"
            state={formState}
            onClose={() => setFormState(null)}
            onSuccess={() => { loadCitas(); setFormState(null); }}
            role={role}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function AgendaView({ initialCitas, preTratamientoId, prePacienteId, role, doctores }: { initialCitas: Cita[], preTratamientoId?: string, prePacienteId?: string; role: string; doctores: DoctorLite[] }) {
  return (
    <Suspense fallback={null}>
      <AgendaViewInner initialCitas={initialCitas} preTratamientoId={preTratamientoId} prePacienteId={prePacienteId} role={role} doctores={doctores} />
    </Suspense>
  );
}
