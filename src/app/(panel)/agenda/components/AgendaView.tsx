"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import type { Cita } from "@/types/agenda";
import { getCitasRealesAction, getPatientByIdAction } from "../actions";
import { CalendarToolbar, type TipoFiltro } from "./CalendarToolbar";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { YearView } from "./YearView";
import { CronogramaView } from "./CronogramaView";
import { DayAppointmentsSheet } from "./DayAppointmentsSheet";
import { AppointmentDetailSheet } from "./AppointmentDetailSheet";
import { CitaFormSheet, type CitaFormState, type PatientLite } from "./CitaFormSheet";
import { scaleIn } from "@/lib/animations";
import {
  type CalView,
  addDays, getMonday, toDateStr, MONTHS_L,
} from "./agendaUtils";

function AgendaViewInner({ initialCitas }: { initialCitas: Cita[] }) {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const today = todayDate;

  const searchParams = useSearchParams();
  const preselectedPacienteId = searchParams?.get("paciente") ?? null;

  const [view, setView] = useState<CalView>((searchParams?.get("view") as CalView) || "month");
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [weekStart, setWeekStart] = useState(getMonday(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");

  const [citas, setCitas] = useState<Cita[]>(initialCitas || []);
  const [loadingCitas, setLoadingCitas] = useState(false);

  const citasFiltradas = tipoFiltro === "todos" ? citas : citas.filter(c => c.tipo_consulta_id === tipoFiltro);

  const [daySheetDate, setDaySheetDate] = useState<Date | null>(null);
  const [detailCita, setDetailCita] = useState<Cita | null>(null);
  const [formState, setFormState] = useState<CitaFormState | null>(null);

  const loadCitas = async () => {
    setLoadingCitas(true);
    const data = await getCitasRealesAction();
    setCitas(data);
    setLoadingCitas(false);
  };
  // Se elimina el useEffect que cargaba citas inicialmente porque ya vienen en initialCitas

  // ?paciente=id — viene desde la ficha del paciente, abre el formulario de creación precargado
  useEffect(() => {
    if (!preselectedPacienteId) return;
    getPatientByIdAction(preselectedPacienteId).then(p => {
      if (p) {
        setFormState({ mode: "create", date: toDateStr(today), preloadedPatient: p as PatientLite });
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

  const label = (() => {
    if (view === "day") {
      const raw = selectedDate.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    if (view === "week") {
      const a = weekDays[0], b = weekDays[6];
      const sameMonth = a.getMonth() === b.getMonth();
      const mA = MONTHS_L[a.getMonth()].slice(0, 3).toLowerCase();
      const mB = MONTHS_L[b.getMonth()].slice(0, 3).toLowerCase();
      return sameMonth
        ? `${a.getDate()} – ${b.getDate()} de ${MONTHS_L[a.getMonth()]} ${b.getFullYear()}`
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
  function openCreate(date: Date, hour?: string) {
    setDaySheetDate(null);
    setDetailCita(null);
    setFormState({ mode: "create", date: toDateStr(date), hour });
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
              />
            )}
            {view === "week" && (
              <WeekView
                weekDays={weekDays}
                citas={citasFiltradas}
                today={today}
                onDayClick={goToDay}
                onEventClick={openDetail}
                onCellClick={(d, hr) => openCreate(d, hr)}
              />
            )}
            {view === "day" && (
              <DayView
                date={selectedDate}
                citas={citasFiltradas}
                today={today}
                onEventClick={openDetail}
                onCellClick={(d, hr) => openCreate(d, hr)}
              />
            )}
            {view === "year" && (
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function AgendaView({ initialCitas }: { initialCitas: Cita[] }) {
  return (
    <Suspense fallback={null}>
      <AgendaViewInner initialCitas={initialCitas} />
    </Suspense>
  );
}
